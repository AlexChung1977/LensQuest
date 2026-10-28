import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import { averageHash, hashSimilarity, hammingDistanceHex } from './ahash.js';

describe('ahash', () => {
  it('returns identical hash for the same image bytes', async () => {
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 120, b: 130 } },
    })
      .jpeg()
      .toBuffer();
    const a = await averageHash(bytes);
    const b = await averageHash(bytes);
    assert.equal(a, b);
    assert.equal(a.length, 16);
  });

  it('scores similar solid colors higher than opposite colors', async () => {
    const teal = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 13, g: 115, b: 119 } },
    })
      .png()
      .toBuffer();
    const teal2 = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 100, b: 110 } },
    })
      .png()
      .toBuffer();
    const white = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 240, g: 240, b: 240 } },
    })
      .png()
      .toBuffer();

    const h1 = await averageHash(teal);
    const h2 = await averageHash(teal2);
    const h3 = await averageHash(white);
    assert.ok(hashSimilarity(h1, h2) >= hashSimilarity(h1, h3));
    assert.equal(hammingDistanceHex(h1, h1), 0);
  });
});
