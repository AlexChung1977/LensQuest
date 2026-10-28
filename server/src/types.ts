export type LicenseKind = 'unknown' | 'all_rights' | 'creative_commons' | 'public_domain';

export interface SearchHit {
  id: string;
  url: string;
  thumbUrl: string;
  score: number;
  source: string;
  license: LicenseKind;
  width?: number;
  height?: number;
  title?: string;
}

export interface SearchJobRecord {
  id: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  provider: string;
  queryHash: string;
  fileName: string;
  createdAt: string;
  finishedAt?: string;
  errorMessage?: string;
  hitCount: number;
  hitsJson: string;
}

export interface VisualSearchProvider {
  readonly name: string;
  search(input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    maxResults: number;
    minScore: number;
  }): Promise<SearchHit[]>;
}
