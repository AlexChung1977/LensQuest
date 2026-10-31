/** Domain models for LensQuest reverse-image search. */

export type JobPhase =
  | 'idle'
  | 'picking'
  | 'uploading'
  | 'searching'
  | 'preview'
  | 'downloading'
  | 'done'
  | 'error';

export interface QueryImage {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  /** SHA-256 hex when available; otherwise a content fingerprint. */
  contentHash: string;
  width?: number;
  height?: number;
  /** Object URL for local preview; revoke when session ends. */
  previewUrl: string;
  /** Raw bytes kept for search upload / local re-use. */
  bytes: ArrayBuffer;
}

export type LicenseKind = 'unknown' | 'all_rights' | 'creative_commons' | 'public_domain';

export type MediaKind = 'image' | 'video';

export interface SearchHit {
  id: string;
  url: string;
  thumbUrl: string;
  score: number;
  source: string;
  license: LicenseKind;
  media?: MediaKind;
  width?: number;
  height?: number;
  title?: string;
}

export type SaveJobStatus = 'pending' | 'running' | 'saved' | 'failed' | 'skipped';

export interface SaveJobItem {
  hitId: string;
  fileName: string;
  status: SaveJobStatus;
  errorMessage?: string;
  savedPath?: string;
}

export interface SaveJob {
  id: string;
  queryHash: string;
  targetPathLabel: string;
  createdAt: string;
  items: SaveJobItem[];
}

export interface AppSettings {
  /** Display label for the configured save root (platform-specific). */
  savePathLabel: string;
  maxResults: number;
  minScore: number;
  downloadConcurrency: number;
  namingPattern: 'index' | 'source_hash';
}

export const DEFAULT_SETTINGS: AppSettings = {
  savePathLabel: '~/Pictures/LensQuest',
  maxResults: 12,
  minScore: 0.2,
  downloadConcurrency: 4,
  namingPattern: 'index',
};
