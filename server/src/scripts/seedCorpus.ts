import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../db/database.js';
import { ensureCorpus } from '../services/corpus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = openDatabase();
const count = await ensureCorpus(db);
console.log(`Corpus indexed: ${count} images`);
