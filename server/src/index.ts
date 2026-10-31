import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db/database.js';
import { createApiRouter } from './routes/api.js';
import { ensureCorpus } from './services/corpus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const port = Number(process.env.PORT ?? 8787);
const db = openDatabase();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/v1', createApiRouter(db));

app.get('/', (_req, res) => {
  res.json({
    name: 'LensQuest API',
    docs: '/v1/health',
    endpoints: ['POST /v1/search', 'GET /v1/jobs/:id', 'GET /v1/history', 'GET /v1/proxy?url='],
  });
});

async function main() {
  console.log('[lensquest] indexing local image and video corpus…');
  const count = await ensureCorpus(db);
  console.log(`[lensquest] corpus size: ${count}`);

  app.listen(port, () => {
    console.log(`[lensquest] API listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
