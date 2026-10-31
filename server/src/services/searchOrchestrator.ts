import type { AppDatabase } from '../db/database.js';
import { insertJob, markJobFailed, markJobReady, markJobRunning } from '../db/jobs.js';
import { BingVisualSearchProvider } from '../providers/bingProvider.js';
import { LocalPerceptualProvider, searchLocalVideos } from '../providers/localProvider.js';
import { SerpApiGoogleLensProvider } from '../providers/serpApiProvider.js';
import type { SearchHit, VisualSearchProvider } from '../types.js';
import { sha256, shortId } from '../util/hash.js';
import { inferMedia } from '../util/media.js';

export function buildProviders(db: AppDatabase): VisualSearchProvider[] {
  const providers: VisualSearchProvider[] = [];
  const preferred = (process.env.SEARCH_PROVIDER ?? 'auto').toLowerCase();

  const bingKey = process.env.BING_VISUAL_SEARCH_KEY;
  const serpKey = process.env.SERPAPI_API_KEY;
  const imgbbKey = process.env.IMGBB_API_KEY;

  const bing = bingKey ? new BingVisualSearchProvider(bingKey) : null;
  const serp = serpKey ? new SerpApiGoogleLensProvider(serpKey, imgbbKey) : null;
  const local = new LocalPerceptualProvider(db);

  if (preferred === 'bing' && bing) return [bing, local];
  if (preferred === 'serpapi' && serp) return [serp, local];
  if (preferred === 'local') return [local];

  // auto: cloud first if configured, always fall back to local
  if (bing) providers.push(bing);
  if (serp) providers.push(serp);
  providers.push(local);
  return providers;
}

export async function runSearchJob(
  db: AppDatabase,
  input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    maxResults: number;
    minScore: number;
  },
): Promise<{ jobId: string; provider: string; hits: SearchHit[]; videos: SearchHit[] }> {
  const providers = buildProviders(db);
  const jobId = shortId('job');
  const queryHash = sha256(input.bytes);
  const createdAt = new Date().toISOString();

  insertJob(db, {
    id: jobId,
    status: 'queued',
    provider: providers[0]?.name ?? 'none',
    queryHash,
    fileName: input.fileName,
    createdAt,
  });
  markJobRunning(db, jobId);

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const found = await provider.search(input);
      const images = found.filter((hit) => (hit.media ?? inferMedia(hit.url)) !== 'video').map((hit) => ({
        ...hit,
        media: 'image' as const,
      }));
      const providerVideos = found
        .filter((hit) => (hit.media ?? inferMedia(hit.url)) === 'video')
        .map((hit) => ({ ...hit, media: 'video' as const }));
      if (images.length === 0 && providerVideos.length === 0 && provider.name !== 'local') {
        errors.push(`${provider.name}: empty results`);
        continue;
      }
      const videos = await mergeLocalVideos(db, input, providerVideos);
      markJobReady(db, jobId, images, videos);
      db.prepare(`UPDATE jobs SET provider = ? WHERE id = ?`).run(provider.name, jobId);
      return { jobId, provider: provider.name, hits: images, videos };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  const message = errors.join(' | ') || 'No search provider available';
  markJobFailed(db, jobId, message);
  throw new Error(message);
}

async function mergeLocalVideos(
  db: AppDatabase,
  input: { bytes: Buffer; maxResults: number; minScore: number },
  providerVideos: SearchHit[],
): Promise<SearchHit[]> {
  let localVideos: SearchHit[] = [];
  try {
    localVideos = await searchLocalVideos(db, input);
  } catch {
    localVideos = [];
  }

  const seen = new Set<string>();
  const merged: SearchHit[] = [];
  const ranked = [...providerVideos, ...localVideos].sort((a, b) => b.score - a.score);
  for (const hit of ranked) {
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    merged.push(hit);
    if (merged.length >= input.maxResults) break;
  }
  return merged;
}
