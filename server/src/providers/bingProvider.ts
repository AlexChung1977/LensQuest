import type { SearchHit, VisualSearchProvider } from '../types.js';
import { shortId } from '../util/hash.js';
import { inferMedia } from '../util/media.js';

/**
 * Azure Bing Visual Search adapter.
 * Requires BING_VISUAL_SEARCH_KEY (Azure AI / Bing Search resource key).
 * Accepts raw image bytes via multipart — no public URL needed.
 */
export class BingVisualSearchProvider implements VisualSearchProvider {
  readonly name = 'bing';

  constructor(
    private readonly apiKey: string,
    private readonly endpoint = process.env.BING_VISUAL_SEARCH_ENDPOINT ??
      'https://api.bing.microsoft.com/v7.0/images/visualsearch',
  ) {}

  async search(input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    maxResults: number;
    minScore: number;
  }): Promise<SearchHit[]> {
    const form = new FormData();
    form.set(
      'image',
      new Blob([new Uint8Array(input.bytes)], {
        type: input.mimeType || 'application/octet-stream',
      }),
      input.fileName || 'query.jpg',
    );

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      body: form,
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bing Visual Search HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      tags?: Array<{
        displayName?: string;
        actions?: Array<{
          actionType?: string;
          data?: {
            value?: Array<{
              contentUrl?: string;
              thumbnailUrl?: string;
              hostPageUrl?: string;
              name?: string;
              hostPageDomainFriendlyName?: string;
              width?: number;
              height?: number;
            }>;
          };
        }>;
      }>;
    };

    const values =
      payload.tags
        ?.flatMap((tag) => tag.actions ?? [])
        .filter((action) => action.actionType === 'VisualSearch' || action.actionType === 'ImageResults')
        .flatMap((action) => action.data?.value ?? []) ?? [];

    const hits: SearchHit[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < values.length && hits.length < input.maxResults; i += 1) {
      const item = values[i]!;
      const url = item.contentUrl ?? item.thumbnailUrl;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const score = Math.max(0.2, 0.94 - i * 0.035);
      if (score < input.minScore) continue;
      hits.push({
        id: shortId('hit'),
        url,
        thumbUrl: item.thumbnailUrl ?? url,
        score: Math.round(score * 1000) / 1000,
        source: item.hostPageDomainFriendlyName ?? 'Bing',
        license: 'unknown',
        media: inferMedia(url),
        title: item.name,
        width: item.width,
        height: item.height,
      });
    }
    return hits;
  }
}
