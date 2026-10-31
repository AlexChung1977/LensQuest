import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { AppDatabase } from '../db/database.js';
import { CORPUS_SEEDS } from '../data/corpusUrls.js';
import { VIDEO_SEEDS } from '../data/videoCorpus.js';
import { averageHash } from '../util/ahash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.resolve(__dirname, '../../data/corpus');
const USER_AGENT = 'LensQuest/0.1 (+https://github.com/AlexChung1977/LensQuest; corpus-indexer)';

export interface CorpusItem {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  source: string;
  license: string;
  ahash: string;
  media: 'image' | 'video';
  /** Playable file when media is video. */
  watchUrl?: string;
}

const LOCAL_PALETTES: Array<[number, number, number]> = [
  [13, 115, 119],
  [196, 92, 38],
  [31, 122, 76],
  [58, 74, 87],
  [91, 75, 138],
  [138, 90, 43],
  [30, 90, 160],
  [160, 50, 70],
  [70, 120, 40],
  [40, 40, 40],
  [220, 180, 60],
  [90, 140, 180],
];

async function synthesizeLocalImage(id: string, title: string, index: number): Promise<Buffer> {
  const [r, g, b] = LOCAL_PALETTES[index % LOCAL_PALETTES.length]!;
  const svg = `<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgb(${r},${g},${b})"/>
        <stop offset="100%" stop-color="rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})"/>
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <circle cx="${200 + (index % 5) * 40}" cy="${180 + (index % 3) * 30}" r="${70 + (index % 4) * 10}" fill="rgba(255,255,255,0.85)"/>
    <rect x="48" y="360" width="544" height="72" rx="10" fill="rgba(255,255,255,0.88)"/>
    <text x="320" y="405" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="rgb(20,33,43)">${title.replace(/[<>&]/g, '')}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function fetchRemoteThumb(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export function corpusFilePath(id: string): string {
  return path.join(CORPUS_DIR, `${id}.png`);
}

async function loadPoster(
  id: string,
  remoteUrl: string | undefined,
  title: string,
  index: number,
): Promise<Buffer> {
  const localPath = corpusFilePath(id);
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath);

  let bytes = remoteUrl ? await fetchRemoteThumb(remoteUrl) : null;
  if (bytes) {
    try {
      bytes = await sharp(bytes).png().toBuffer();
    } catch {
      bytes = null;
    }
  }
  if (!bytes) bytes = await synthesizeLocalImage(id, title, index);
  fs.writeFileSync(localPath, bytes);
  return bytes;
}

export async function ensureCorpus(db: AppDatabase): Promise<number> {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });

  const upsert = db.prepare(`
    INSERT INTO corpus (id, title, url, thumb_url, source, license, ahash, updated_at, media, watch_url)
    VALUES (@id, @title, @url, @thumbUrl, @source, @license, @ahash, @updatedAt, @media, @watchUrl)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      thumb_url = excluded.thumb_url,
      source = excluded.source,
      license = excluded.license,
      ahash = excluded.ahash,
      updated_at = excluded.updated_at,
      media = excluded.media,
      watch_url = excluded.watch_url
  `);

  let indexed = 0;
  for (let i = 0; i < CORPUS_SEEDS.length; i += 1) {
    const seed = CORPUS_SEEDS[i]!;
    const bytes = await loadPoster(seed.id, seed.thumbUrl || seed.url, seed.title, i);
    const ahash = await averageHash(bytes);
    const servedUrl = `/v1/corpus/${seed.id}.png`;
    upsert.run({
      id: seed.id,
      title: seed.title,
      url: servedUrl,
      thumbUrl: servedUrl,
      source: seed.source,
      license: seed.license,
      ahash,
      updatedAt: new Date().toISOString(),
      media: 'image',
      watchUrl: null,
    });
    indexed += 1;
  }

  for (let i = 0; i < VIDEO_SEEDS.length; i += 1) {
    const seed = VIDEO_SEEDS[i]!;
    const bytes = await loadPoster(seed.id, seed.thumbUrl, seed.title, CORPUS_SEEDS.length + i);
    const ahash = await averageHash(bytes);
    const servedUrl = `/v1/corpus/${seed.id}.png`;
    upsert.run({
      id: seed.id,
      title: seed.title,
      url: servedUrl,
      thumbUrl: servedUrl,
      source: seed.source,
      license: seed.license,
      ahash,
      updatedAt: new Date().toISOString(),
      media: 'video',
      watchUrl: seed.fileUrl,
    });
    indexed += 1;
  }

  return (db.prepare(`SELECT COUNT(*) AS c FROM corpus`).get() as { c: number }).c;
}

export function listCorpus(db: AppDatabase): CorpusItem[] {
  const rows = db.prepare(`SELECT * FROM corpus`).all() as Array<{
    id: string;
    title: string;
    url: string;
    thumb_url: string;
    source: string;
    license: string;
    ahash: string;
    media: string | null;
    watch_url: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    thumbUrl: row.thumb_url,
    source: row.source,
    license: row.license,
    ahash: row.ahash,
    media: row.media === 'video' ? 'video' : 'image',
    watchUrl: row.watch_url ?? undefined,
  }));
}
