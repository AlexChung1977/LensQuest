import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.resolve(__dirname, '../../data');

export function openDatabase(dbPath = process.env.LENSQUEST_DB_PATH) {
  const resolved = dbPath ?? path.join(defaultDataDir, 'lensquest.sqlite');
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      query_hash TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      finished_at TEXT,
      error_message TEXT,
      hit_count INTEGER NOT NULL DEFAULT 0,
      hits_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS corpus (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      thumb_url TEXT NOT NULL,
      source TEXT NOT NULL,
      license TEXT NOT NULL,
      ahash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
  `);
  addCorpusColumn(db, 'media', `TEXT NOT NULL DEFAULT 'image'`);
  addCorpusColumn(db, 'watch_url', 'TEXT');
  return db;
}

function addCorpusColumn(db: InstanceType<typeof Database>, name: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(corpus)`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) return;
  db.exec(`ALTER TABLE corpus ADD COLUMN ${name} ${definition}`);
}

export type AppDatabase = ReturnType<typeof openDatabase>;
