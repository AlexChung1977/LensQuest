import type { AppDatabase } from '../db/database.js';
import { listCorpus } from '../services/corpus.js';
import type { SearchHit, VisualSearchProvider } from '../types.js';
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
    const queryHash = await averageHash(input.bytes);
    const corpus = listCorpus(this.db);
    if (corpus.length === 0) {
      throw new Error('本機圖庫尚未建立，請稍後再試或執行 npm run seed');
    }

    const ranked = corpus
      .map((item) => ({
        item,
        score: hashSimilarity(queryHash, item.ahash),
      }))
      .sort((a, b) => b.score - a.score);

    const hits: SearchHit[] = [];
    for (const entry of ranked) {
      if (entry.score < input.minScore) continue;
      hits.push({
        id: shortId('hit'),
        url: entry.item.url,
        thumbUrl: entry.item.thumbUrl,
        score: Math.round(entry.score * 1000) / 1000,
        source: entry.item.source,
        license: entry.item.license as SearchHit['license'],
        title: entry.item.title,
      });
      if (hits.length >= input.maxResults) break;
    }

    // If threshold filters everything, still return top matches so UX isn't empty.
    if (hits.length === 0) {
      return ranked.slice(0, Math.min(input.maxResults, 8)).map((entry) => ({
        id: shortId('hit'),
        url: entry.item.url,
        thumbUrl: entry.item.thumbUrl,
        score: Math.round(entry.score * 1000) / 1000,
        source: entry.item.source,
        license: entry.item.license as SearchHit['license'],
        title: entry.item.title,
      }));
    }

    return hits;
  }
}
