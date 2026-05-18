import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.env['DATABASE_PATH'] ?? './data/app.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db: DatabaseType = new Database(dbPath);

// WAL mode gives better read concurrency and crash safety for SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
