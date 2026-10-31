import type { AppDatabase } from '../db/database.js';
import { listCorpus, type CorpusItem } from '../services/corpus.js';
import type { MediaKind, SearchHit, VisualSearchProvider } from '../types.js';
import { averageHash, hashSimilarity } from '../util/ahash.js';
import { shortId } from '../util/hash.js';

/**
 * Offline-capable perceptual search against the indexed Wikimedia corpus.
 * Always available; used as default and as fallback when cloud providers fail.
 */
export class LocalPerceptualProvider implements VisualSearchProvider {
  readonly name = 'local';

  constructor(private readonly db: AppDatabase) {}

  async search(input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    maxResults: number;
    minScore: number;
  }): Promise<SearchHit[]> {
    return searchCorpusByMedia(this.db, input, 'image');
  }
}

export async function searchLocalVideos(
  db: AppDatabase,
  input: {
    bytes: Buffer;
    maxResults: number;
    minScore: number;
  },
): Promise<SearchHit[]> {
  return searchCorpusByMedia(db, input, 'video');
}

async function searchCorpusByMedia(
  db: AppDatabase,
  input: { bytes: Buffer; maxResults: number; minScore: number },
  media: MediaKind,
): Promise<SearchHit[]> {
  const queryHash = await averageHash(input.bytes);
  const corpus = listCorpus(db).filter((item) => item.media === media);
  if (media === 'image' && corpus.length === 0) {
    throw new Error('本機圖庫尚未建立，請稍後再試或執行 npm run seed');
  }
  if (corpus.length === 0) return [];

  const ranked = corpus
    .map((item) => ({
      item,
      score: hashSimilarity(queryHash, item.ahash),
    }))
    .filter((entry) => media === 'image' || Boolean(entry.item.watchUrl))
    .sort((a, b) => b.score - a.score);

  const hits: SearchHit[] = [];
  for (const entry of ranked) {
    if (entry.score < input.minScore) continue;
    hits.push(toHit(entry.item, entry.score, media));
    if (hits.length >= input.maxResults) break;
  }

  if (hits.length === 0) {
    return ranked.slice(0, Math.min(input.maxResults, 8)).map((entry) =>
      toHit(entry.item, entry.score, media),
    );
  }

  return hits;
}

function toHit(item: CorpusItem, score: number, media: MediaKind): SearchHit {
  return {
    id: shortId(media === 'video' ? 'vid' : 'hit'),
    url: media === 'video' ? (item.watchUrl ?? item.url) : item.url,
    thumbUrl: item.thumbUrl,
    score: Math.round(score * 1000) / 1000,
    source: item.source,
    license: item.license as SearchHit['license'],
    media,
    title: item.title,
  };
}
