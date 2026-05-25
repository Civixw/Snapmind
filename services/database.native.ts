import * as SQLite from 'expo-sqlite';

export interface Screenshot {
  id: string;
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;
  embedding: string;
  created_at: string;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('snapmind.db');

  try {
    // 检查是否需要迁移（检查rowid列是否存在）
    const tableInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='screenshots'"
    );

    console.log('[DB] 当前表结构:', tableInfo?.sql);

    const needsMigration = tableInfo?.sql && !tableInfo.sql.includes('rowid INTEGER PRIMARY KEY');

    if (needsMigration) {
      console.log('[DB] 检测到旧schema，开始迁移...');
      try {
        // 备份数据
        await db.execAsync(`
          CREATE TABLE screenshots_backup AS SELECT * FROM screenshots;
          DROP TABLE screenshots;
          CREATE TABLE screenshots (
            rowid INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT UNIQUE,
            image_path TEXT NOT NULL,
            raw_text TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            category TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            embedding TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
          );
          INSERT INTO screenshots (id, image_path, raw_text, summary, category, tags, embedding, created_at)
          SELECT id, image_path, raw_text, summary, category, tags, embedding, created_at FROM screenshots_backup;
          DROP TABLE screenshots_backup;
        `);
        console.log('[DB] 迁移完成');
      } catch (e) {
        console.error('[DB] 迁移失败，重新创建表:', e);
        // 如果迁移失败，删除并重新创建
        await db.execAsync(`
          DROP TABLE IF EXISTS screenshots;
          CREATE TABLE screenshots (
            rowid INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT UNIQUE,
            image_path TEXT NOT NULL,
            raw_text TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            category TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            embedding TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
          );
        `);
      }
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS screenshots (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT UNIQUE,
        image_path TEXT NOT NULL,
        raw_text TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        category TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        embedding TEXT DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_category ON screenshots(category);
      CREATE INDEX IF NOT EXISTS idx_created_at ON screenshots(created_at);
      CREATE INDEX IF NOT EXISTS idx_id ON screenshots(id);
      CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
        raw_text, summary, content='screenshots', content_rowid='rowid'
      );
    `);
  } catch (e) {
    console.error('[DB] 数据库初始化错误:', e);
    throw e;
  }

  return db;
}

export async function insertScreenshot(screenshot: Screenshot): Promise<void> {
  const database = await getDatabase();
  console.log('[DB] 准备插入数据, id:', screenshot.id, 'category:', screenshot.category);

  // 插入主表，让SQLite自动生成rowid
  const result = await database.runAsync(
    `INSERT INTO screenshots (id, image_path, raw_text, summary, category, tags, embedding, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [screenshot.id, screenshot.image_path, screenshot.raw_text, screenshot.summary,
     screenshot.category, screenshot.tags, screenshot.embedding, screenshot.created_at]
  );

  // 对于expo-sqlite，lastInsertRowId可能不存在，回退到查询
  const insertRowId = (result as any).lastInsertRowId;
  console.log('[DB] 插入主表成功, lastInsertRowId:', insertRowId);

  let rowid: number | undefined;
  if (typeof insertRowId === 'number') {
    rowid = insertRowId;
  } else {
    // 回退到查询rowid
    const row = await database.getFirstAsync<{ rowid: number }>(
      'SELECT rowid FROM screenshots WHERE id = ?', [screenshot.id]
    );
    rowid = row?.rowid;
  }

  console.log('[DB] 使用rowid:', rowid);
  if (rowid !== undefined) {
    try {
      await database.runAsync(
        `INSERT INTO screenshots_fts(rowid, raw_text, summary) VALUES (?, ?, ?)`,
        [rowid, screenshot.raw_text, screenshot.summary]
      );
      console.log('[DB] FTS插入成功');
    } catch (e) {
      console.error('[DB] FTS插入失败:', e);
      // 不抛出错误，让主记录保留
    }
  } else {
    console.warn('[DB] ⚠️ 未能获取rowid，FTS索引可能未创建');
  }
  console.log('[DB] insertScreenshot完成');
}

export async function getAllScreenshots(
  category?: string, limit: number = 100, offset: number = 0
): Promise<Screenshot[]> {
  const database = await getDatabase();
  console.log('[DB] getAllScreenshots调用, category:', category, 'limit:', limit);
  let result: Screenshot[];
  if (category && category !== 'all') {
    console.log('[DB] 按category查询:', category);
    result = await database.getAllAsync<Screenshot>(
      'SELECT * FROM screenshots WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [category, limit, offset]
    );
  } else {
    console.log('[DB] 查询所有数据');
    result = await database.getAllAsync<Screenshot>(
      'SELECT * FROM screenshots ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }
  console.log('[DB] 查询返回', result.length, '条数据');
  if (result.length > 0) {
    console.log('[DB] 第一条数据:', result[0]);
  }
  return result;
}

export async function getScreenshotById(id: string): Promise<Screenshot | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Screenshot>(
    'SELECT * FROM screenshots WHERE id = ?', [id]
  );
}

export async function searchByKeyword(query: string): Promise<Screenshot[]> {
  const database = await getDatabase();
  const likeQuery = `%${query}%`;
  return database.getAllAsync<Screenshot>(
    `SELECT * FROM screenshots
     WHERE summary LIKE ? OR raw_text LIKE ? OR tags LIKE ? OR category LIKE ?
     ORDER BY created_at DESC LIMIT 50`,
    [likeQuery, likeQuery, likeQuery, likeQuery]
  );
}

export async function updateScreenshot(
  id: string, updates: Partial<Pick<Screenshot, 'tags' | 'category' | 'summary'>>
): Promise<void> {
  const database = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await database.runAsync(
    `UPDATE screenshots SET ${sets.join(', ')} WHERE id = ?`, values
  );
}

export async function deleteScreenshot(id: string): Promise<void> {
  const database = await getDatabase();
  // First get the rowid before deleting
  const row = await database.getFirstAsync<{ rowid: number }>(
    'SELECT rowid FROM screenshots WHERE id = ?', [id]
  );
  // Delete from main table
  await database.runAsync('DELETE FROM screenshots WHERE id = ?', [id]);
  // Also delete from FTS table
  if (row) {
    await database.runAsync('DELETE FROM screenshots_fts WHERE rowid = ?', [row.rowid]);
  }
}

export async function getScreenshotCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM screenshots'
  );
  const count = result?.count ?? 0;
  console.log('[DB] getScreenshotCount:', count);
  return count;
}
