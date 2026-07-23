import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'work_app.db');

let db: SqlJsDatabase | null = null;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Пробуем загрузить существующую БД
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Включаем foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Создаём таблицы
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT '',
      base_price REAL NOT NULL DEFAULT 0,
      design_price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      service_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      needs_design INTEGER NOT NULL DEFAULT 0,
      needs_packaging INTEGER NOT NULL DEFAULT 0,
      base_price REAL NOT NULL,
      design_price REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      received_amount REAL NOT NULL DEFAULT 0,
      created_by_telegram_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS materials_poligraphy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materials_epoxy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Таблица закупок — каждая покупка материала
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('poligraphy', 'epoxy')),
      name TEXT NOT NULL,
      quantity_packages REAL NOT NULL DEFAULT 1,
      pieces_per_package INTEGER NOT NULL DEFAULT 1,
      price_per_package REAL NOT NULL DEFAULT 0,
      price_total REAL GENERATED ALWAYS AS (quantity_packages * price_per_package) STORED,
      pieces_total INTEGER GENERATED ALWAYS AS (CAST(quantity_packages AS INTEGER) * pieces_per_package) STORED,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Материалы, потраченные в заказе
    CREATE TABLE IF NOT EXISTS order_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      pieces_used INTEGER NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Обладнання (принтер, резак тощо) — разові витрати для окупності
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      purchase_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Миграция: добавляем колонки cost_price и received_amount, если их нет
  const tableInfo = db.exec("PRAGMA table_info(orders)");
  if (tableInfo.length > 0) {
    const columns = tableInfo[0].values.map((v: any) => v[1] as string);
    if (!columns.includes('cost_price')) {
      db.run("ALTER TABLE orders ADD COLUMN cost_price REAL NOT NULL DEFAULT 0");
    }
    if (!columns.includes('received_amount')) {
      db.run("ALTER TABLE orders ADD COLUMN received_amount REAL NOT NULL DEFAULT 0");
    }
  }

  saveDb();

  // Seed: если нет админов — добавить из переменной окружения
  const adminIds = process.env.ADMIN_TELEGRAM_IDS;
  if (adminIds) {
    const ids = adminIds.split(',').map(id => id.trim());
    const count = (db.exec('SELECT COUNT(*) as cnt FROM admins')[0]?.values[0][0] as number) || 0;
    if (count === 0) {
      for (const id of ids) {
        db.run('INSERT OR IGNORE INTO admins (telegram_id, name) VALUES (?, ?)', [id, 'Owner']);
      }
      saveDb();
    }
  }

  console.log('✅ База данных инициализирована');
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  return db;
}

/**
 * Выполнить SELECT и вернуть массив объектов
 */
export function queryAll<T>(sql: string, params: any[] = []): T[] {
  const result = getDb().exec(sql, params);
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj as T;
  });
}

/**
 * Выполнить SELECT и вернуть один объект
 */
export function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const rows = queryAll<T>(sql, params);
  return rows[0];
}

/**
 * Выполнить INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const db = getDb();
  db.run(sql, params);
  const result = db.exec('SELECT changes() as changes, last_insert_rowid() as lastInsertRowid');
  if (result.length === 0 || result[0].values.length === 0) {
    return { changes: 0, lastInsertRowid: 0 };
  }
  const row = result[0].values[0];
  return {
    changes: row[0] as number,
    lastInsertRowid: row[1] as number,
  };
}

export function isAdmin(telegramId: string): boolean {
  const row = queryOne<{ id: number }>('SELECT id FROM admins WHERE telegram_id = ?', [telegramId]);
  return !!row;
}

export function getAdminName(telegramId: string): string {
  const row = queryOne<{ name: string }>('SELECT name FROM admins WHERE telegram_id = ?', [telegramId]);
  return row?.name || 'Пользователь';
}

/**
 * Получить всех админов
 */
export function getAdmins(): { telegram_id: string }[] {
  return queryAll<{ telegram_id: string }>('SELECT telegram_id FROM admins');
}
