import fs from 'fs';
import path from 'path';
import type { Database as SqlJsDatabase, BindParams } from 'sql.js';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

async function initDb(): Promise<SqlJsDatabase> {
  // Lazy-import sql.js only when actually needed, to avoid RSC compilation issues
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();

  let dbInstance: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run('PRAGMA foreign_keys = ON');
  initTables(dbInstance);
  return dbInstance;
}

function initTables(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game_version TEXT NOT NULL,
      release_type TEXT DEFAULT 'release',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add release_type column to existing databases
  try {
    database.run("ALTER TABLE collections ADD COLUMN release_type TEXT DEFAULT 'release'");
  } catch {
    // Column already exists
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS collection_items (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      source TEXT NOT NULL,
      icon_url TEXT,
      selected_file_id TEXT,
      selected_file_name TEXT,
      selected_game_version TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS recently_viewed (
      id TEXT PRIMARY KEY,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      source TEXT NOT NULL,
      icon_url TEXT,
      viewed_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveToDisk(database);
}

function saveToDisk(database: SqlJsDatabase): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = database.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (!initPromise) {
    initPromise = initDb();
  }

  db = await initPromise;
  return db;
}

// 执行写操作并自动保存到磁盘
export async function execAndSave(sql: string, params?: BindParams): Promise<void> {
  const database = await getDb();
  database.run(sql, params);
  saveToDisk(database);
}

// 执行只读查询
export async function queryAll<T>(sql: string, params?: BindParams): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  if (params) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export async function queryOne<T>(sql: string, params?: BindParams): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function closeDb(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    initPromise = null;
  }
}
