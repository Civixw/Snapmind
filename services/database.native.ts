import * as SQLite from 'expo-sqlite';

export interface Screenshot {
  id: string;
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;
  embedding: string;
  sensitive_flags: string | null;
  created_at: string;
  importance_score?: number;
  score_updated_at?: string;
  base_score?: number;
}

export interface UserInteraction {
  id: string;
  screenshot_id: string;
  interaction_type: 'view' | 'search_hit';
  created_at: string;
}

// Database version constants
// Version 2: Added user_interactions table
// Version 3: Added importance_score columns to screenshots table
// Version 4: Added base_score column to screenshots table (separate from dynamic importance_score)
// Version 5: Added sensitive_flags column to screenshots table
const DB_VERSION = 5;
const USER_INTERACTIONS_VERSION = 2;
const SCORES_VERSION = 3;
const BASE_SCORE_VERSION = 4;
const SENSITIVE_FLAGS_VERSION = 5;

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('snapmind.db');

  try {
    // Get current database version
    const versionResult = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const currentVersion = versionResult?.user_version ?? 0;
    console.log('[DB] Current database version:', currentVersion);

    // 检查是否需要迁移（检查rowid列是否存在）
    const tableInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='screenshots'"
    );

    const needsMigration = tableInfo?.sql && !tableInfo.sql.includes('rowid INTEGER PRIMARY KEY');

    if (needsMigration) {
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

    // Add sensitive_flags column if it doesn't exist (for existing databases)
    try {
      await db.execAsync(`
        ALTER TABLE screenshots ADD COLUMN sensitive_flags TEXT;
      `);
      console.log('[Database] Added sensitive_flags column');
    } catch (error) {
      // Column already exists, ignore error
      console.log('[Database] sensitive_flags column already exists');
    }

    // Sequential migrations - must run in order
    // Migration for user_interactions table (version 2)
    console.log('[DB] Checking migration: currentVersion =', currentVersion, 'USER_INTERACTIONS_VERSION =', USER_INTERACTIONS_VERSION);
    if (currentVersion < USER_INTERACTIONS_VERSION) {
      console.log('[DB] Migrating to version', USER_INTERACTIONS_VERSION, '- creating user_interactions table');
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS user_interactions (
            id TEXT PRIMARY KEY,
            screenshot_id TEXT NOT NULL,
            interaction_type TEXT NOT NULL CHECK(interaction_type IN ('view', 'search_hit')),
            created_at TEXT NOT NULL,
            FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_interactions_screenshot ON user_interactions(screenshot_id);
          CREATE INDEX IF NOT EXISTS idx_interactions_type_created ON user_interactions(interaction_type, created_at);
        `);

        // Update database version to 2
        await db.execAsync(`PRAGMA user_version = ${USER_INTERACTIONS_VERSION}`);
        currentVersion = USER_INTERACTIONS_VERSION; // Update local version for next check
        console.log('[DB] Migration to version', USER_INTERACTIONS_VERSION, 'completed successfully');
      } catch (e) {
        console.error('[DB] Migration to version', USER_INTERACTIONS_VERSION, 'failed:', e);
        throw e;
      }
    }

    // Migration for importance_score columns (version 3) - runs after version 2
    if (currentVersion < SCORES_VERSION) {
      console.log('[DB] Migrating to version', SCORES_VERSION, '- adding importance_score columns');
      try {
        // Check if columns already exist to handle edge case
        const tableInfo = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(screenshots)"
        );
        const columnNames = tableInfo.map(col => col.name);
        const hasImportanceScore = columnNames.includes('importance_score');
        const hasScoreUpdatedAt = columnNames.includes('score_updated_at');

        if (!hasImportanceScore) {
          console.log('[DB] Adding importance_score column');
          await db.execAsync('ALTER TABLE screenshots ADD COLUMN importance_score INTEGER DEFAULT 0');
        } else {
          console.log('[DB] importance_score column already exists, skipping');
        }

        if (!hasScoreUpdatedAt) {
          console.log('[DB] Adding score_updated_at column');
          await db.execAsync('ALTER TABLE screenshots ADD COLUMN score_updated_at TEXT');
        } else {
          console.log('[DB] score_updated_at column already exists, skipping');
        }

        // Update database version to 3
        await db.execAsync(`PRAGMA user_version = ${SCORES_VERSION}`);
        currentVersion = SCORES_VERSION; // Update local version for next check
        console.log('[DB] Migration to version', SCORES_VERSION, 'completed successfully');
      } catch (e) {
        console.error('[DB] Migration to version', SCORES_VERSION, 'failed:', e);
        throw e;
      }
    }

    // Migration for base_score column (version 4) - runs after version 3
    if (currentVersion < BASE_SCORE_VERSION) {
      console.log('[DB] Migrating to version', BASE_SCORE_VERSION, '- adding base_score column');
      try {
        // Check if column already exists
        const tableInfo = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(screenshots)"
        );
        const columnNames = tableInfo.map(col => col.name);
        const hasBaseScore = columnNames.includes('base_score');

        if (!hasBaseScore) {
          console.log('[DB] Adding base_score column');
          await db.execAsync('ALTER TABLE screenshots ADD COLUMN base_score INTEGER DEFAULT 50');

          // Initialize base_score with current importance_score values (or 50 if null/0)
          await db.execAsync(`
            UPDATE screenshots
            SET base_score = CASE
              WHEN importance_score IS NULL OR importance_score = 0 THEN 50
              ELSE importance_score
            END
          `);
          console.log('[DB] Initialized base_score for existing screenshots');
        } else {
          console.log('[DB] base_score column already exists, skipping');
        }

        // Update database version to 4
        await db.execAsync(`PRAGMA user_version = ${BASE_SCORE_VERSION}`);
        currentVersion = BASE_SCORE_VERSION; // Update local version for next check
        console.log('[DB] Migration to version', BASE_SCORE_VERSION, 'completed successfully');
      } catch (e) {
        console.error('[DB] Migration to version', BASE_SCORE_VERSION, 'failed:', e);
        throw e;
      }
    }

    // Migration for sensitive_flags column (version 5) - runs after version 4
    if (currentVersion < SENSITIVE_FLAGS_VERSION) {
      console.log('[DB] Migrating to version', SENSITIVE_FLAGS_VERSION, '- adding sensitive_flags column');
      try {
        // Check if column already exists
        const tableInfo = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(screenshots)"
        );
        const columnNames = tableInfo.map(col => col.name);
        const hasSensitiveFlags = columnNames.includes('sensitive_flags');

        if (!hasSensitiveFlags) {
          console.log('[DB] Adding sensitive_flags column');
          await db.execAsync('ALTER TABLE screenshots ADD COLUMN sensitive_flags TEXT');
          console.log('[DB] Added sensitive_flags column for storing sensitive content flags');
        } else {
          console.log('[DB] sensitive_flags column already exists, skipping');
        }

        // Update database version to 5
        await db.execAsync(`PRAGMA user_version = ${SENSITIVE_FLAGS_VERSION}`);
        console.log('[DB] Migration to version', SENSITIVE_FLAGS_VERSION, 'completed successfully');
      } catch (e) {
        console.error('[DB] Migration to version', SENSITIVE_FLAGS_VERSION, 'failed:', e);
        throw e;
      }
    }
  } catch (e) {
    console.error('[DB] 数据库初始化错误:', e);
    throw e;
  }

  return db;
}

export async function insertScreenshot(screenshot: Screenshot): Promise<void> {
  const database = await getDatabase();

  const result = await database.runAsync(
    `INSERT INTO screenshots (id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [screenshot.id, screenshot.image_path, screenshot.raw_text, screenshot.summary,
     screenshot.category, screenshot.tags, screenshot.embedding, screenshot.sensitive_flags ?? null,
     screenshot.created_at, screenshot.importance_score ?? 0, screenshot.score_updated_at ?? null,
     screenshot.base_score ?? screenshot.importance_score ?? 50]
  );

  const insertRowId = (result as any).lastInsertRowId;

  let rowid: number | undefined;
  if (typeof insertRowId === 'number') {
    rowid = insertRowId;
  } else {
    const row = await database.getFirstAsync<{ rowid: number }>(
      'SELECT rowid FROM screenshots WHERE id = ?', [screenshot.id]
    );
    rowid = row?.rowid;
  }

  if (rowid !== undefined) {
    try {
      await database.runAsync(
        `INSERT INTO screenshots_fts(rowid, raw_text, summary) VALUES (?, ?, ?)`,
        [rowid, screenshot.raw_text, screenshot.summary]
      );
    } catch (e) {
      console.error('[DB] FTS插入失败:', e);
    }
  }
}

export async function getAllScreenshots(
  category?: string, limit: number = 100, offset: number = 0
): Promise<Screenshot[]> {
  const database = await getDatabase();
  let result: Screenshot[];
  if (category && category !== 'all') {
    result = await database.getAllAsync<Screenshot>(
      'SELECT id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score FROM screenshots WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [category, limit, offset]
    );
  } else {
    result = await database.getAllAsync<Screenshot>(
      'SELECT id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score FROM screenshots ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }
  return result;
}

export async function getScreenshotById(id: string): Promise<Screenshot | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Screenshot>(
    'SELECT id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score FROM screenshots WHERE id = ?', [id]
  );
}

export async function searchByKeyword(query: string): Promise<Screenshot[]> {
  const database = await getDatabase();
  const likeQuery = `%${query}%`;
  return database.getAllAsync<Screenshot>(
    `SELECT id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score FROM screenshots
     WHERE summary LIKE ? OR raw_text LIKE ? OR tags LIKE ? OR category LIKE ?
     ORDER BY created_at DESC LIMIT 50`,
    [likeQuery, likeQuery, likeQuery, likeQuery]
  );
}

export async function updateScreenshot(
  id: string, updates: Partial<Pick<Screenshot, 'tags' | 'category' | 'summary' | 'importance_score' | 'score_updated_at' | 'base_score' | 'sensitive_flags'>>
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
  return result?.count ?? 0;
}

// Export database instance for use by other services
export { db };
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return getDatabase();
}

// User Interactions CRUD operations
export async function insertUserInteraction(interaction: UserInteraction): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO user_interactions (id, screenshot_id, interaction_type, created_at)
     VALUES (?, ?, ?, ?)`,
    [interaction.id, interaction.screenshot_id, interaction.interaction_type, interaction.created_at]
  );
}

export async function getUserInteractions(
  screenshotId?: string,
  interactionType?: 'view' | 'search_hit',
  limit: number = 100,
  offset: number = 0
): Promise<UserInteraction[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM user_interactions WHERE 1=1';
  const params: any[] = [];

  if (screenshotId) {
    query += ' AND screenshot_id = ?';
    params.push(screenshotId);
  }

  if (interactionType) {
    query += ' AND interaction_type = ?';
    params.push(interactionType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return database.getAllAsync<UserInteraction>(query, params);
}

export async function getUserInteractionsByScreenshotIds(
  screenshotIds: string[]
): Promise<UserInteraction[]> {
  const database = await getDatabase();
  if (screenshotIds.length === 0) return [];

  const placeholders = screenshotIds.map(() => '?').join(',');
  return database.getAllAsync<UserInteraction>(
    `SELECT * FROM user_interactions WHERE screenshot_id IN (${placeholders}) ORDER BY created_at DESC`,
    screenshotIds
  );
}

export async function deleteUserInteraction(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM user_interactions WHERE id = ?', [id]);
}

export async function deleteUserInteractionsByScreenshotId(screenshotId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM user_interactions WHERE screenshot_id = ?', [screenshotId]);
}

export async function getInteractionCount(
  screenshotId?: string,
  interactionType?: 'view' | 'search_hit'
): Promise<number> {
  const database = await getDatabase();

  let query = 'SELECT COUNT(*) as count FROM user_interactions WHERE 1=1';
  const params: any[] = [];

  if (screenshotId) {
    query += ' AND screenshot_id = ?';
    params.push(screenshotId);
  }

  if (interactionType) {
    query += ' AND interaction_type = ?';
    params.push(interactionType);
  }

  const result = await database.getFirstAsync<{ count: number }>(query, params);
  return result?.count ?? 0;
}

// Helper function to update importance score for a screenshot
export async function updateImportanceScore(
  id: string,
  score: number,
  updatedAt: string = new Date().toISOString()
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE screenshots SET importance_score = ?, score_updated_at = ? WHERE id = ?',
    [score, updatedAt, id]
  );
}

// Helper function to get screenshots sorted by importance score
export async function getScreenshotsByImportance(
  limit: number = 50,
  offset: number = 0
): Promise<Screenshot[]> {
  const database = await getDatabase();
  return database.getAllAsync<Screenshot>(
    `SELECT id, image_path, raw_text, summary, category, tags, embedding, sensitive_flags, created_at, importance_score, score_updated_at, base_score
     FROM screenshots
     WHERE importance_score > 0
     ORDER BY importance_score DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}
