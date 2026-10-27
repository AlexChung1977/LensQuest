import { Router } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import { z } from 'zod';
import type { AppDatabase } from '../db/database.js';
import { getJob, listJobs } from '../db/jobs.js';
import { corpusFilePath } from '../services/corpus.js';
import { buildProviders, runSearchJob } from '../services/searchOrchestrator.js';
import type { SearchHit } from '../types.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const searchFields = z.object({
  maxResults: z.coerce.number().int().min(1).max(40).default(12),
  minScore: z.coerce.number().min(0).max(1).default(0.2),
});

export function createApiRouter(db: AppDatabase): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const providers = buildProviders(db).map((p) => p.name);
    res.json({
      ok: true,
      service: 'lensquest-server',
      providers,
      time: new Date().toISOString(),
    });
  });

  router.get('/corpus/:file', (req, res) => {
    const file = req.params.file;
    if (!/^[a-z0-9-]+\.png$/i.test(file)) {
      res.status(400).json({ error: 'invalid corpus id' });
      return;
    }
    const id = file.replace(/\.png$/i, '');
    const absolute = corpusFilePath(id);
    if (!fs.existsSync(absolute)) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(absolute);
  });

  router.post('/search', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '缺少 image 檔案欄位' });
        return;
      }
      const parsed = searchFields.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      const result = await runSearchJob(db, {
        bytes: req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname || 'query.jpg',
        maxResults: parsed.data.maxResults,
        minScore: parsed.data.minScore,
      });

      res.json({
        job_id: result.jobId,
        provider: result.provider,
        hits: result.hits,
      });
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : '搜尋失敗',
      });
    }
  });

  router.get('/jobs/:id', (req, res) => {
    const job = getJob(db, req.params.id);
    if (!job) {
      res.status(404).json({ error: '找不到 job' });
      return;
    }
    const hits = JSON.parse(job.hitsJson) as SearchHit[];
    res.json({
      job_id: job.id,
      status: job.status,
      provider: job.provider,
      query_hash: job.queryHash,
      file_name: job.fileName,
      created_at: job.createdAt,
      finished_at: job.finishedAt,
      error_message: job.errorMessage,
      hits,
    });
  });

  router.get('/history', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
    const jobs = listJobs(db, limit).map((job) => ({
      job_id: job.id,
      status: job.status,
      provider: job.provider,
      query_hash: job.queryHash,
      file_name: job.fileName,
      created_at: job.createdAt,
      finished_at: job.finishedAt,
      hit_count: job.hitCount,
      error_message: job.errorMessage,
    }));
    res.json({ jobs });
  });

  /**
   * Image download proxy — avoids browser CORS issues when saving remote images.
   * Only allows http(s) URLs.
   */
  router.get('/proxy', async (req, res) => {
    try {
      const raw = String(req.query.url ?? '');
      if (!raw) {
        res.status(400).json({ error: '缺少 url' });
        return;
      }
      let target: URL;
      try {
        target = new URL(raw);
      } catch {
        res.status(400).json({ error: 'url 無效' });
        return;
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        res.status(400).json({ error: '僅允許 http(s)' });
        return;
      }

      const upstream = await fetch(target, {
        headers: {
          'User-Agent': 'LensQuest/0.1 image-proxy',
          Accept: 'image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(30000),
        redirect: 'follow',
      });
      if (!upstream.ok) {
        res.status(502).json({ error: `上游 HTTP ${upstream.status}` });
        return;
      }
      const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
      if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
        res.status(415).json({ error: `非圖片 content-type: ${contentType}` });
        return;
      }
      const bytes = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(bytes);
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'proxy 失敗',
      });
    }
  });

  return router;
}
