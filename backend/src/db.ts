import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL || join(__dirname, '..', 'data', 'pharmacy.db');

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function uuid(): string {
  return randomUUID();
}

export default db;