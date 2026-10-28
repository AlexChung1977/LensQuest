import { proxyImageUrl } from '../visualSearch/httpVisualSearchClient';

export interface DownloadResult {
  hitId: string;
  bytes: ArrayBuffer;
  contentType: string;
  extension: string;
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

/**
 * Fetches image bytes with retry. Remote http(s) URLs go through the API proxy
 * to avoid browser CORS blocks.
 */
export async function downloadImage(
  hitId: string,
  url: string,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  let lastError: unknown;
  const fetchUrl = proxyImageUrl(url);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(fetchUrl, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const bytes = await response.arrayBuffer();
      return {
        hitId,
        bytes,
        contentType,
        extension: extensionFromContentType(contentType),
      };
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Download failed');
}

export async function downloadMany(
  items: Array<{ hitId: string; url: string }>,
  concurrency: number,
  onItemDone?: (hitId: string, ok: boolean, error?: string) => void,
  signal?: AbortSignal,
): Promise<DownloadResult[]> {
  const queue = [...items];
  const results: DownloadResult[] = [];

  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const next = queue.shift();
      if (!next) return;
      try {
        const result = await downloadImage(next.hitId, next.url, signal);
        results.push(result);
        onItemDone?.(next.hitId, true);
      } catch (error) {
        onItemDone?.(
          next.hitId,
          false,
          error instanceof Error ? error.message : 'Download failed',
        );
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}
