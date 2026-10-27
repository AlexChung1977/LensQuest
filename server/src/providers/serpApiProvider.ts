import type { SearchHit, VisualSearchProvider } from '../types.js';
import { shortId } from '../util/hash.js';

/**
 * SerpAPI Google Lens adapter.
 * Requires SERPAPI_API_KEY. Image must be reachable via a public URL, so we
 * first upload bytes to a temporary host when IMG_UPLOAD_URL is configured,
 * otherwise expect the caller to pass through a hosted URL path (not used in MVP).
 *
 * For LensQuest MVP we upload via imgbb if IMGBB_API_KEY is set; otherwise throw
 * a clear configuration error so the orchestrator can fall back to local.
 */
export class SerpApiGoogleLensProvider implements VisualSearchProvider {
  readonly name = 'serpapi';

  constructor(
    private readonly apiKey: string,
    private readonly imgbbKey?: string,
  ) {}

  async search(input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    maxResults: number;
    minScore: number;
  }): Promise<SearchHit[]> {
    const imageUrl = await this.hostImage(input.bytes, input.fileName);
    const endpoint = new URL('https://serpapi.com/search.json');
    endpoint.searchParams.set('engine', 'google_lens');
    endpoint.searchParams.set('url', imageUrl);
    endpoint.searchParams.set('api_key', this.apiKey);

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) {
      throw new Error(`SerpAPI HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      error?: string;
      visual_matches?: Array<{
        position?: number;
        title?: string;
        link?: string;
        source?: string;
        thumbnail?: string;
      }>;
    };
    if (payload.error) throw new Error(payload.error);

    const matches = payload.visual_matches ?? [];
    const hits: SearchHit[] = [];
    for (let i = 0; i < matches.length && hits.length < input.maxResults; i += 1) {
      const match = matches[i]!;
      const score = Math.max(0.2, 0.95 - i * 0.04);
      if (score < input.minScore) continue;
      const url = match.link ?? match.thumbnail;
      if (!url) continue;
      hits.push({
        id: shortId('hit'),
        url,
        thumbUrl: match.thumbnail ?? url,
        score: Math.round(score * 1000) / 1000,
        source: match.source ?? 'Google Lens',
        license: 'unknown',
        title: match.title,
      });
    }
    return hits;
  }

  private async hostImage(bytes: Buffer, fileName: string): Promise<string> {
    if (!this.imgbbKey) {
      throw new Error('SerpAPI 需要可公開存取的圖片 URL，請設定 IMGBB_API_KEY 作為暫存上傳');
    }
    const form = new FormData();
    form.set('key', this.imgbbKey);
    form.set(
      'image',
      new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }),
      fileName || 'query.jpg',
    );
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`imgbb upload HTTP ${response.status}`);
    const json = (await response.json()) as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
      error?: { message?: string };
    };
    const url = json.data?.display_url ?? json.data?.url;
    if (!json.success || !url) {
      throw new Error(json.error?.message ?? 'imgbb upload failed');
    }
    return url;
  }
}
