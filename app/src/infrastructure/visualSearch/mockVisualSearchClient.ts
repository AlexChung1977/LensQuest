import type { SearchHit } from '../../domain/types';
import type { VisualSearchClient, VisualSearchRequest, VisualSearchResponse } from './types';

const SOURCES = [
  'Unsplash',
  'Pexels',
  'Wikimedia',
  'Flickr',
  'Museum Archive',
  'Stock Index',
] as const;

const PALETTES = [
  ['#0d7377', '#eef3f7', '#14212b'],
  ['#c45c26', '#f3ebe4', '#3a2418'],
  ['#1f7a4c', '#e8f3ec', '#143222'],
  ['#3a4a57', '#d9e3ea', '#101820'],
  ['#5b4b8a', '#ece8f5', '#241c33'],
  ['#8a5a2b', '#f4ece2', '#2c1c0f'],
] as const;

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makePlaceholderDataUrl(seed: number, label: string): string {
  const [a, b, c] = PALETTES[seed % PALETTES.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#g)"/>
  <circle cx="320" cy="220" r="88" fill="${b}" opacity="0.92"/>
  <rect x="48" y="360" width="544" height="72" rx="8" fill="${b}" opacity="0.88"/>
  <text x="320" y="405" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="28" fill="${c}">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Mock reverse-image search for the UI scaffold.
 * Uses local SVG placeholders so demos work without external image CDNs.
 * Swap this for SerpAPI Google Lens / Bing Visual Search behind the same interface.
 */
export class MockVisualSearchClient implements VisualSearchClient {
  async search(request: VisualSearchRequest): Promise<VisualSearchResponse> {
    await delay(1400 + seededUnit(request.image.contentHash.length) * 800);

    const seedBase = [...request.image.contentHash].reduce(
      (acc, ch) => acc + ch.charCodeAt(0),
      0,
    );
    const count = Math.min(request.maxResults, 12);
    const hits: SearchHit[] = [];

    for (let i = 0; i < count; i += 1) {
      const score = 0.92 - i * 0.045 - seededUnit(seedBase + i) * 0.04;
      if (score < request.minScore) continue;

      const label = `Related ${String(i + 1).padStart(2, '0')}`;
      const url = makePlaceholderDataUrl(seedBase + i, label);

      hits.push({
        id: `hit-${request.image.id}-${i}`,
        url,
        thumbUrl: url,
        score: Math.round(score * 1000) / 1000,
        source: SOURCES[(seedBase + i) % SOURCES.length],
        license: i % 4 === 0 ? 'creative_commons' : i % 5 === 0 ? 'public_domain' : 'unknown',
        width: 640,
        height: 480,
      });
    }

    return {
      jobId: `job-${Date.now().toString(36)}`,
      hits,
    };
  }
}

export const mockVisualSearchClient = new MockVisualSearchClient();
