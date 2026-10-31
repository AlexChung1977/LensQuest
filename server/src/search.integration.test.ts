import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import { openDatabase } from './db/database.js';
import { ensureCorpus } from './services/corpus.js';
import { runSearchJob } from './services/searchOrchestrator.js';

describe('search integration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lensquest-'));
  const dbPath = path.join(tmpDir, 'test.sqlite');
  let db: ReturnType<typeof openDatabase>;

  before(async () => {
    process.env.LENSQUEST_DB_PATH = dbPath;
    process.env.SEARCH_PROVIDER = 'local';
    db = openDatabase(dbPath);
    const count = await ensureCorpus(db);
    assert.ok(count > 0);
  });

  after(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns ranked local hits for a query image', async () => {
    const bytes = await sharp({
      create: { width: 320, height: 240, channels: 3, background: { r: 13, g: 115, b: 119 } },
    })
      .png()
      .toBuffer();

    const result = await runSearchJob(db, {
      bytes,
      mimeType: 'image/png',
      fileName: 'query.png',
      maxResults: 5,
      minScore: 0.05,
    });

    assert.equal(result.provider, 'local');
    assert.ok(result.hits.length > 0);
    assert.ok(result.hits.every((hit) => hit.media === 'image'));
    assert.ok(result.hits[0]!.score >= result.hits.at(-1)!.score);
    assert.match(result.hits[0]!.url, /\/v1\/corpus\//);

    assert.ok(result.videos.length > 0);
    assert.ok(result.videos.every((hit) => hit.media === 'video' && hit.url.endsWith('.webm')));
    assert.ok(result.videos[0]!.score >= result.videos.at(-1)!.score);
    assert.ok(result.videos.every((video) => !result.hits.some((image) => image.id === video.id)));
  });
});
