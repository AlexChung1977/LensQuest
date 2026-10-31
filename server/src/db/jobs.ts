import type { AppDatabase } from './database.js';
import type { SearchHit, SearchJobRecord } from '../types.js';

interface JobRow {
  id: string;
  status: SearchJobRecord['status'];
  provider: string;
  query_hash: string;
  file_name: string;
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
  hit_count: number;
  hits_json: string;
}

function rowToJob(row: JobRow): SearchJobRecord {
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    queryHash: row.query_hash,
    fileName: row.file_name,
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    hitCount: row.hit_count,
    hitsJson: row.hits_json,
  };
}

export function insertJob(
  db: AppDatabase,
  job: {
    id: string;
    status: SearchJobRecord['status'];
    provider: string;
    queryHash: string;
    fileName: string;
    createdAt: string;
  },
): void {
  db.prepare(
    `INSERT INTO jobs (id, status, provider, query_hash, file_name, created_at, hit_count, hits_json)
     VALUES (@id, @status, @provider, @queryHash, @fileName, @createdAt, 0, '[]')`,
  ).run(job);
}

export function markJobRunning(db: AppDatabase, id: string): void {
  db.prepare(`UPDATE jobs SET status = 'running' WHERE id = ?`).run(id);
}

export function markJobReady(
  db: AppDatabase,
  id: string,
  hits: SearchHit[],
  videos: SearchHit[] = [],
): void {
  const payload = { images: hits, videos };
  db.prepare(
    `UPDATE jobs
     SET status = 'ready', finished_at = ?, hit_count = ?, hits_json = ?
     WHERE id = ?`,
  ).run(new Date().toISOString(), hits.length + videos.length, JSON.stringify(payload), id);
}

/** Older jobs stored a flat hit array. New jobs store `{ images, videos }`. */
export function readStoredResults(hitsJson: string): { images: SearchHit[]; videos: SearchHit[] } {
  const parsed = JSON.parse(hitsJson) as unknown;
  if (Array.isArray(parsed)) {
    return { images: parsed as SearchHit[], videos: [] };
  }
  const record = parsed as { images?: SearchHit[]; videos?: SearchHit[] };
  return {
    images: record.images ?? [],
    videos: record.videos ?? [],
  };
}

export function markJobFailed(db: AppDatabase, id: string, errorMessage: string): void {
  db.prepare(
    `UPDATE jobs
     SET status = 'failed', finished_at = ?, error_message = ?
     WHERE id = ?`,
  ).run(new Date().toISOString(), errorMessage, id);
}

export function getJob(db: AppDatabase, id: string): SearchJobRecord | null {
  const row = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function listJobs(db: AppDatabase, limit = 30): SearchJobRecord[] {
  const rows = db
    .prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as JobRow[];
  return rows.map(rowToJob);
}
