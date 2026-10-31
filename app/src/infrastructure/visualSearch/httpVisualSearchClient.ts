import type { QueryImage, SearchHit } from '../../domain/types';
import type { VisualSearchClient, VisualSearchRequest, VisualSearchResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/v1';

export interface HttpSearchResponse extends VisualSearchResponse {
  provider: string;
}

export class HttpVisualSearchClient implements VisualSearchClient {
  async search(request: VisualSearchRequest): Promise<HttpSearchResponse> {
    const form = new FormData();
    const blob = new Blob([request.image.bytes], {
      type: request.image.mimeType || 'application/octet-stream',
    });
    form.set('image', blob, request.image.fileName || 'query.jpg');
    form.set('maxResults', String(request.maxResults));
    form.set('minScore', String(request.minScore));

    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      body: form,
    });

    const payload = (await response.json()) as {
      job_id?: string;
      provider?: string;
      hits?: SearchHit[];
      videos?: SearchHit[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? `搜尋 API HTTP ${response.status}`);
    }

    return {
      jobId: payload.job_id ?? 'unknown',
      provider: payload.provider ?? 'unknown',
      hits: payload.hits ?? [],
      videos: payload.videos ?? [],
    };
  }
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  providers: string[];
}> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) return { ok: false, providers: [] };
    const json = (await response.json()) as { ok?: boolean; providers?: string[] };
    return { ok: Boolean(json.ok), providers: json.providers ?? [] };
  } catch {
    return { ok: false, providers: [] };
  }
}

export async function fetchHistory(limit = 20): Promise<
  Array<{
    job_id: string;
    status: string;
    provider: string;
    file_name: string;
    created_at: string;
    hit_count: number;
    error_message?: string;
  }>
> {
  const response = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!response.ok) throw new Error('無法讀取歷史紀錄');
  const json = (await response.json()) as {
    jobs: Array<{
      job_id: string;
      status: string;
      provider: string;
      file_name: string;
      created_at: string;
      hit_count: number;
      error_message?: string;
    }>;
  };
  return json.jobs;
}

export function proxyImageUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/v1/')) return url;
  if (url.startsWith(API_BASE)) return url;
  return `${API_BASE}/proxy?url=${encodeURIComponent(url)}`;
}

export type { QueryImage };
