# Smart Vault (智能精选) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered smart curation system that automatically identifies and displays high-value screenshots based on content analysis and user behavior.

**Architecture:** Hybrid scoring engine (AI content analysis + user behavior tracking) with time-decay algorithm. New behavior tracking table, extended screenshots table with scores. Vault UI with segmented time-window control.

**Tech Stack:** expo-sqlite, expo-file-system, expo-task-manager, React Native hooks, TypeScript, OpenAI API

---

## Task 1: Add database migrations for user_interactions table

**Files:**
- Modify: `services/database.native.ts`

- [ ] **Step 1: Add version constant and migration function**

In `services/database.native.ts`, after the existing `DATABASE_VERSION` constant, add:

```typescript
// After existing imports and constants
const DATABASE_VERSION_VAULT = 2;

async function createInteractionsTable(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_interactions (
      id TEXT PRIMARY KEY,
      screenshot_id TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_interactions_screenshot ON user_interactions(screenshot_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_type_created ON user_interactions(interaction_type, created_at);
  `);
}

async function migrateToVersion2(db: SQLiteDatabase) {
  await createInteractionsTable(db);
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION_VAULT};`);
}
```

- [ ] **Step 2: Update initDatabase to handle migrations**

Find the `initDatabase` function and update it to check for migrations:

```typescript
// Replace the existing initDatabase function
export async function initDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('snapmind.db');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = version?.user_version ?? 0;

  if (currentVersion < 1) {
    await createTables(db);
  }

  // Run vault migrations if needed
  if (currentVersion < DATABASE_VERSION_VAULT) {
    await migrateToVersion2(db);
  }

  return db;
}
```

- [ ] **Step 3: Verify migration by running app and checking table exists**

Run: `npm start`
Expected: App starts without errors, database is at version 2

In terminal, check SQLite:
```bash
# Connect to database using sqlite3 (platform-specific path)
# Then run: .schema user_interactions
```
Expected: user_interactions table schema is displayed

---

## Task 2: Add importance_score columns to screenshots table

**Files:**
- Modify: `services/database.native.ts`

- [ ] **Step 1: Add migration for importance_score columns**

In `services/database.native.ts`, add migration to version 3:

```typescript
const DATABASE_VERSION_SCORES = 3;

async function migrateToVersion3(db: SQLiteDatabase) {
  // Check if columns exist before adding
  const tableInfo = await db.getFirstAsync<{ sql: string }>(`SELECT sql FROM sqlite_master WHERE type='table' AND name='screenshots';`);
  const hasImportanceScore = tableInfo?.sql?.includes('importance_score');

  if (!hasImportanceScore) {
    await db.execAsync(`
      ALTER TABLE screenshots ADD COLUMN importance_score INTEGER DEFAULT 0;
      ALTER TABLE screenshots ADD COLUMN score_updated_at TEXT;
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION_SCORES};`);
}
```

- [ ] **Step 2: Update migrateToVersion2 to set version to 2**

Modify the end of `migrateToVersion2`:

```typescript
// In migrateToVersion2, the last line should be:
await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION_VAULT};`);
// Make sure DATABASE_VERSION_VAULT = 2 is defined
```

- [ ] **Step 3: Update initDatabase to call version 3 migration**

Update the migration check in `initDatabase`:

```typescript
// In initDatabase function, after version 2 check:
if (currentVersion < DATABASE_VERSION_SCORES) {
  await migrateToVersion3(db);
}
```

- [ ] **Step 4: Verify columns exist**

Restart app and check database:
```sql
PRAGMA table_info(screenshots);
```
Expected: importance_score and score_updated_at columns appear in list

---

## Task 3: Create interactions service for behavior tracking

**Files:**
- Create: `services/interactions.ts`

- [ ] **Step 1: Create interactions service file**

Create `services/interactions.ts`:

```typescript
import { db } from './database';
import { genUUID } from './database';

export type InteractionType = 'view' | 'search_hit';

export interface Interaction {
  id: string;
  screenshot_id: string;
  interaction_type: InteractionType;
  created_at: string;
}

/**
 * Record a user viewing a screenshot detail
 */
export async function recordView(screenshotId: string): Promise<void> {
  try {
    await db.runAsync(
      `INSERT INTO user_interactions (id, screenshot_id, interaction_type, created_at) VALUES (?, ?, ?, ?)`,
      [genUUID(), screenshotId, 'view', new Date().toISOString()]
    );
  } catch (error) {
    console.error('[Interactions] Failed to record view:', error);
    // Silent fail - don't block user action
  }
}

/**
 * Record a screenshot appearing in search results
 */
export async function recordSearchHit(screenshotId: string): Promise<void> {
  try {
    await db.runAsync(
      `INSERT INTO user_interactions (id, screenshot_id, interaction_type, created_at) VALUES (?, ?, ?, ?)`,
      [genUUID(), screenshotId, 'search_hit', new Date().toISOString()]
    );
  } catch (error) {
    console.error('[Interactions] Failed to record search hit:', error);
  }
}

/**
 * Get interaction counts for a screenshot within a time window
 */
export async function getInteractionCounts(
  screenshotId: string,
  daysBack: number = 30
): Promise<{ views: number; searchHits: number }> {
  try {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const result = await db.getAllAsync<{
      interaction_type: InteractionType;
      count: number;
    }>(
      `SELECT interaction_type, COUNT(*) as count
       FROM user_interactions
       WHERE screenshot_id = ? AND created_at >= ?
       GROUP BY interaction_type`,
      [screenshotId, cutoff]
    );

    const views = result.find(r => r.interaction_type === 'view')?.count ?? 0;
    const searchHits = result.find(r => r.interaction_type === 'search_hit')?.count ?? 0;

    return { views, searchHits };
  } catch (error) {
    console.error('[Interactions] Failed to get interaction counts:', error);
    return { views: 0, searchHits: 0 };
  }
}

/**
 * Clean up old interactions (keep last 90 days)
 */
export async function cleanupOldInteractions(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await db.runAsync(
      `DELETE FROM user_interactions WHERE created_at < ?`,
      [cutoff]
    );
  } catch (error) {
    console.error('[Interactions] Failed to cleanup old interactions:', error);
  }
}
```

- [ ] **Step 2: Export from services index**

Add to `services/index.ts` or create if not exists:

```typescript
// services/index.ts
export * from './interactions';
```

---

## Task 4: Create scoring service

**Files:**
- Create: `services/scoring.ts`

- [ ] **Step 1: Create scoring service with time decay and score calculation**

Create `services/scoring.ts`:

```typescript
import { db } from './database';
import { getInteractionCounts } from './interactions';

// Decay constant: lambda ≈ 0.05
// e^(-0.05 * days) = 0.5 at ~14 days, 0.22 at 30 days
const DECAY_LAMBDA = 0.05;
const VIEW_BONUS = 3;
const SEARCH_HIT_BONUS = 5;

export interface ScoreBreakdown {
  baseScore: number;
  timeDecay: number;
  interactionBonus: number;
  finalScore: number;
}

/**
 * Calculate time decay coefficient based on days since import
 */
export function decayScore(daysSinceImport: number): number {
  return Math.exp(-DECAY_LAMBDA * daysSinceImport);
}

/**
 * Calculate days between two dates
 */
export function daysSince(importDate: string): number {
  const now = Date.now();
  const imported = new Date(importDate).getTime();
  return Math.floor((now - imported) / (24 * 60 * 60 * 1000));
}

/**
 * Calculate final importance score for a screenshot
 */
export function calculateImportanceScore(
  baseScore: number,
  importDate: string,
  interactionCounts: { views: number; searchHits: number }
): ScoreBreakdown {
  const days = daysSince(importDate);
  const timeDecay = decayScore(days);
  const interactionBonus = (interactionCounts.views * VIEW_BONUS) + (interactionCounts.searchHits * SEARCH_HIT_BONUS);
  const finalScore = Math.round((baseScore * timeDecay) + interactionBonus);

  return {
    baseScore,
    timeDecay,
    interactionBonus,
    finalScore: Math.max(0, Math.min(100, finalScore)), // Clamp to 0-100
  };
}

/**
 * Update importance score for a single screenshot
 */
export async function updateScreenshotScore(screenshotId: string): Promise<void> {
  try {
    // Get screenshot data
    const screenshot = await db.getFirstAsync<{
      importance_score: number;
      created_at: string;
    }>(
      `SELECT importance_score, created_at FROM screenshots WHERE id = ?`,
      [screenshotId]
    );

    if (!screenshot) return;

    // Get interaction counts
    const interactions = await getInteractionCounts(screenshotId);

    // Calculate new score
    const { finalScore } = calculateImportanceScore(
      screenshot.importance_score || 50, // Default to 50 if not set
      screenshot.created_at,
      interactions
    );

    // Update database
    await db.runAsync(
      `UPDATE screenshots SET importance_score = ?, score_updated_at = ? WHERE id = ?`,
      [finalScore, new Date().toISOString(), screenshotId]
    );
  } catch (error) {
    console.error('[Scoring] Failed to update score for screenshot:', screenshotId, error);
  }
}

/**
 * Recalculate scores for all screenshots
 */
export async function recalculateAllScores(): Promise<void> {
  try {
    const screenshots = await db.getAllAsync<{
      id: string;
      importance_score: number;
      created_at: string;
    }>(
      `SELECT id, importance_score, created_at FROM screenshots ORDER BY created_at DESC`
    );

    for (const screenshot of screenshots) {
      await updateScreenshotScore(screenshot.id);
    }

    console.log(`[Scoring] Recalculated ${screenshots.length} screenshot scores`);
  } catch (error) {
    console.error('[Scoring] Failed to recalculate scores:', error);
  }
}

/**
 * Get top screenshots by importance score within a time window
 */
export async function getTopScreenshots(
  daysBack: number,
  limit: number = 24
): Promise<Array<{ id: string; image_path: string; summary: string; category: string; tags: string; created_at: string; importance_score: number }>> {
  try {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const screenshots = await db.getAllAsync<any>(
      `SELECT id, image_path, summary, category, tags, created_at, importance_score
       FROM screenshots
       WHERE created_at >= ?
       ORDER BY importance_score DESC, created_at DESC
       LIMIT ?`,
      [cutoff, limit]
    );

    return screenshots;
  } catch (error) {
    console.error('[Scoring] Failed to get top screenshots:', error);
    return [];
  }
}

/**
 * Backfill importance scores for existing screenshots (one-time migration)
 */
export async function backfillImportanceScores(): Promise<void> {
  try {
    const screenshots = await db.getAllAsync<{ id: string; importance_score: number }>(
      `SELECT id, importance_score FROM screenshots WHERE importance_score = 0 OR importance_score IS NULL`
    );

    console.log(`[Scoring] Backfilling scores for ${screenshots.length} screenshots`);

    for (const screenshot of screenshots) {
      // Set default score of 50 for un-scored screenshots
      await db.runAsync(
        `UPDATE screenshots SET importance_score = ?, score_updated_at = ? WHERE id = ?`,
        [50, new Date().toISOString(), screenshot.id]
      );
    }
  } catch (error) {
    console.error('[Scoring] Failed to backfill scores:', error);
  }
}
```

- [ ] **Step 2: Export from services index**

Add to `services/index.ts`:

```typescript
export * from './scoring';
```

---

## Task 5: Update AI service to return importance score

**Files:**
- Modify: `services/ai.ts`

- [ ] **Step 1: Update AnalysisResult interface**

Find the `AnalysisResult` interface and add `importance_score`:

```typescript
// In services/ai.ts, update the interface:
export interface AnalysisResult {
  raw_text: string;
  summary: string;
  category: string;
  tags: string[];
  embedding: number[];
  importance_score: number;  // ADD THIS LINE
}
```

- [ ] **Step 2: Update prompt to request importance score**

Find the system prompt in `analyzeScreenshot` function and add scoring instructions:

```typescript
// In the analyzeScreenshot function, update the prompt string:
const systemPrompt = `你是一个智能截图分析助手。请分析图片中的文字内容，提供：
1. raw_text: 提取的所有文字内容
2. summary: 一句话总结（15字内）
3. category: 选择一个分类（美食、购物、旅行、聊天、学习、健身、灵感、待办）
4. tags: 3-5个标签
5. importance_score: 重要性评分（0-100）

重要性评分标准：
- 包含待办事项、日期时间：+30分
- 包含地址、电话、链接：+20分
- 订单/票据/备忘录类：+20分
- 信息密度高（文字多、有结构）：+30分
- 纯美食/风景图片：0-20分

请以JSON格式返回，包含以上所有字段。`;
```

- [ ] **Step 3: Update JSON parsing to extract importance_score**

Find where the response is parsed and ensure importance_score is extracted:

```typescript
// In the response handling section of analyzeScreenshot:
const parsed = JSON.parse(content.trim());
return {
  raw_text: parsed.raw_text || '',
  summary: parsed.summary || '',
  category: parsed.category || '灵感',
  tags: parsed.tags || [],
  embedding: await getEmbedding(parsed.raw_text || ''),
  importance_score: parsed.importance_score || 50,  // ADD THIS LINE - default to 50 if missing
};
```

- [ ] **Step 4: Update insertScreenshot call to include importance_score**

Find where `insertScreenshot` is called in the import flow:

```typescript
// When calling insertScreenshot with analysis result:
await insertScreenshot({
  image_path: savedPath,
  raw_text: result.raw_text,
  summary: result.summary,
  category: result.category,
  tags: JSON.stringify(result.tags),
  embedding: JSON.stringify(result.embedding),
  importance_score: result.importance_score,  // ADD THIS LINE
});
```

---

## Task 6: Update database service to handle importance_score

**Files:**
- Modify: `services/database.native.ts`

- [ ] **Step 1: Update Screenshot interface**

Add `importance_score` to the `Screenshot` interface:

```typescript
// In services/database.native.ts, update the interface:
export interface Screenshot {
  id: string;
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;
  embedding: string;
  created_at: string;
  importance_score?: number;  // ADD THIS LINE
}
```

- [ ] **Step 2: Update insertScreenshot function**

Modify the `insertScreenshot` function to accept and store `importance_score`:

```typescript
// In the insertScreenshot function:
export async function insertScreenshot(screenshot: {
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;
  embedding: string;
  importance_score?: number;  // ADD THIS PARAMETER
}): Promise<void> {
  // ... existing validation code ...

  await db.runAsync(
    `INSERT INTO screenshots (id, image_path, raw_text, summary, category, tags, embedding, importance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      genUUID(),
      screenshot.image_path,
      screenshot.raw_text,
      screenshot.summary,
      screenshot.category,
      screenshot.tags,
      screenshot.embedding,
      screenshot.importance_score || 50,  // ADD THIS - default to 50
    ]
  );
}
```

- [ ] **Step 3: Update getAllScreenshots to include importance_score**

Add `importance_score` to the SELECT query:

```typescript
// In getAllScreenshots function, update the query:
const result = await db.getAllAsync<Screenshot>(
  `SELECT id, image_path, raw_text, summary, category, tags, created_at, embedding, importance_score FROM screenshots ORDER BY created_at DESC`
);
// ... rest of function ...
```

---

## Task 7: Add view tracking to detail page

**Files:**
- Modify: `app/detail/[id].tsx`

- [ ] **Step 1: Import recordView function**

Add import at the top of the file:

```typescript
// At the top of app/detail/[id].tsx, add:
import { recordView } from '../../services/interactions';
```

- [ ] **Step 2: Add useFocusEffect to record view**

Add the tracking hook inside the component:

```typescript
// In the component body of app/detail/[id].tsx, add:
import { useFocusEffect } from 'expo-router';
import React from 'react';

// ... existing code ...

useFocusEffect(
  React.useCallback(() => {
    // Record view when user navigates to detail page
    if (id) {
      recordView(id);
    }
  }, [id])
);
```

---

## Task 8: Add search hit tracking

**Files:**
- Modify: `app/(tabs)/search.tsx`

- [ ] **Step 1: Import recordSearchHit function**

Add import:

```typescript
// At the top of app/(tabs)/search.tsx, add:
import { recordSearchHit } from '../../services/interactions';
```

- [ ] **Step 2: Record search hits for each result**

In the `handleSearch` function, after setting results, record hits:

```typescript
// In app/(tabs)/search.tsx, in the handleSearch function, after setting results:
// Find where setResults(results) or setResults(keywordResults) is called
// Add immediately after:

// Record search hits for engagement tracking
keywordResults.forEach(result => {
  recordSearchHit(result.id);
});
```

Specifically, update this part of handleSearch:

```typescript
// Replace the "Use keyword results as fallback" section with:
// Use keyword results as fallback
setResults(keywordResults);

// Record search hits
keywordResults.forEach(result => {
  recordSearchHit(result.id);
});
```

And for the semantic search path:

```typescript
// In the semantic search success branch, after setResults(merged):
setResults(merged);

// Record search hits for all results
merged.forEach(result => {
  recordSearchHit(result.id);
});
```

---

## Task 9: Update ScreenshotCard to show score badge

**Files:**
- Modify: `components/ScreenshotCard.tsx`

- [ ] **Step 1: Add importanceScore prop**

Update the props interface:

```typescript
// In components/ScreenshotCard.tsx, update the interface:
interface ScreenshotCardProps {
  id: string;
  imagePath: string;
  summary: string;
  category: string;
  tags: string;
  createdAt: string;
  onPress: () => void;
  importanceScore?: number;  // ADD THIS LINE
}
```

- [ ] **Step 2: Update component destructuring**

Update the function signature:

```typescript
// Update the component function:
export default function ScreenshotCard({
  id,
  imagePath,
  summary,
  category,
  tags,
  createdAt,
  onPress,
  importanceScore,  // ADD THIS
}: ScreenshotCardProps) {
  // ... existing code ...
}
```

- [ ] **Step 3: Add score badge component and styles**

Add the score badge render logic before the card content:

```typescript
// In the component, before the return statement, add:

// Helper to render score badge
const renderScoreBadge = () => {
  if (!importanceScore || importanceScore < 60) return null;

  const isHighScore = importanceScore >= 80;
  const emoji = isHighScore ? '🔥' : '⭐';
  const bgColor = isHighScore ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 107, 53, 0.9)';
  const textColor = isHighScore ? '#000' : '#fff';

  return (
    <View style={[styles.scoreBadge, { backgroundColor: bgColor }]}>
      <Text style={styles.scoreEmoji}>{emoji}</Text>
      <Text style={[styles.scoreValue, { color: textColor }]}>{importanceScore}</Text>
    </View>
  );
};
```

- [ ] **Step 4: Add badge to card layout**

Place the badge in the card (positioned absolutely in top-right):

```typescript
// In the return JSX, inside the Pressable, add the badge after the ImageBackground:
<Pressable onPress={onPress} style={styles.card}>
  <ImageBackground /* ... existing props ... */>
    {/* ... existing gradient overlay ... */}

    {/* ADD THIS: Score Badge */}
    {importanceScore && importanceScore >= 60 && (
      <View style={styles.badgeContainer}>
        {renderScoreBadge()}
      </View>
    )}

    {/* ... existing category/tag/content ... */}
  </ImageBackground>
</Pressable>
```

- [ ] **Step 5: Add badge styles**

Add to the StyleSheet:

```typescript
// Add to styles in ScreenshotCard.tsx:
badgeContainer: {
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 10,
},
scoreBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  gap: 4,
},
scoreEmoji: {
  fontSize: 12,
},
scoreValue: {
  fontSize: 12,
  fontWeight: '700',
},
```

---

## Task 10: Implement Vault screen with segmented control

**Files:**
- Modify: `app/(tabs)/vault.tsx`

- [ ] **Step 1: Replace placeholder with Vault screen implementation**

Replace the entire content of `app/(tabs)/vault.tsx` with:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import ScreenshotCard from '../../components/ScreenshotCard';
import { getTopScreenshots } from '../../services/scoring';
import { colors, borderRadius } from '../../constants/theme';

type TimeWindow = 'week' | 'month';

export default function VaultScreen() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('week');
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);

  const loadVault = async (window: TimeWindow, autoDowngrade: boolean = true) => {
    setLoading(true);
    try {
      const days = window === 'week' ? 7 : 30;
      const results = await getTopScreenshots(days, 24);

      // Auto-downgrade if no results
      if (autoDowngrade && results.length < 3 && window === 'week') {
        const monthResults = await getTopScreenshots(30, 24);
        if (monthResults.length >= 3) {
          setTimeWindow('month');
          setScreenshots(monthResults);
          setHasData(true);
          setLoading(false);
          return;
        }
      }

      setScreenshots(results);
      setHasData(results.length > 0);
    } catch (error) {
      console.error('[Vault] Failed to load:', error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVault(timeWindow);
    }, [timeWindow])
  );

  const { left, right } = React.useMemo(() => {
    const l: any[] = [];
    const r: any[] = [];
    screenshots.forEach((item, i) => {
      (i % 2 === 0 ? l : r).push(item);
    });
    return { left: l, right: r };
  }, [screenshots]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>智能精选</Text>
          <Text style={styles.headerSubtitle}>AI 为你挑选的高光时刻</Text>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'week' && styles.segmentActive]}
          onPress={() => setTimeWindow('week')}
        >
          <Text style={[styles.segmentText, timeWindow === 'week' && styles.segmentTextActive]}>
            本周
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'month' && styles.segmentActive]}
          onPress={() => setTimeWindow('month')}
        >
          <Text style={[styles.segmentText, timeWindow === 'month' && styles.segmentTextActive]}>
            本月
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI 正在整理...</Text>
        </View>
      ) : !hasData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={64} color={colors.outlineVariant} />
          <Text style={styles.emptyTitle}>暂无精选内容</Text>
          <Text style={styles.emptySubtitle}>导入截图后，AI 会帮你找出重要内容</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {left.map((item) => (
              <ScreenshotCard
                key={item.id}
                id={item.id}
                imagePath={item.image_path}
                summary={item.summary}
                category={item.category}
                tags={item.tags}
                createdAt={item.created_at}
                importanceScore={item.importance_score}
                onPress={() => {}}
              />
            ))}
          </View>
          <View style={styles.column}>
            {right.map((item) => (
              <ScreenshotCard
                key={item.id}
                id={item.id}
                imagePath={item.image_path}
                summary={item.summary}
                category={item.category}
                tags={item.tags}
                createdAt={item.created_at}
                importanceScore={item.importance_score}
                onPress={() => {}}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitleWrapper: {},
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: borderRadius.full,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.outline,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 16,
  },
});
```

---

## Task 11: Update Home screen to show importance scores

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Pass importanceScore to ScreenshotCard**

In the home screen where ScreenshotCard is rendered, add the prop:

```typescript
// In app/(tabs)/index.tsx, find where ScreenshotCard is rendered and add importanceScore:
<ScreenshotCard
  key={item.id}
  id={item.id}
  imagePath={item.image_path}
  summary={item.summary}
  category={item.category}
  tags={item.tags}
  createdAt={item.created_at}
  importanceScore={item.importance_score}  // ADD THIS LINE
  onPress={() => router.push(`/detail/${item.id}`)}
/>
```

---

## Task 12: Add one-time backfill for existing screenshots

**Files:**
- Modify: `store/useStore.ts` or wherever initial data loading happens

- [ ] **Step 1: Add backfill call to app initialization**

In the initial data loading logic (likely in `_layout.tsx` or store initialization), add a one-time backfill:

```typescript
// In the app initialization or store loadInitialData function:
import { backfillImportanceScores } from '../services/scoring';

// Add to initialization (run once on app start):
export async function loadInitialData() {
  // ... existing code ...

  // One-time backfill for existing screenshots
  try {
    await backfillImportanceScores();
  } catch (error) {
    console.error('[Init] Failed to backfill scores:', error);
  }

  // ... rest of existing code ...
}
```

---

## Task 13: Manual testing verification

**Files:**
- None (testing only)

- [ ] **Step 1: Test empty state**

1. Clear all data via Settings
2. Navigate to Vault tab
3. Verify: "暂无精选内容" empty state is shown
4. Verify: Header and segmented control still visible

- [ ] **Step 2: Test with new screenshots**

1. Import 3-5 screenshots with varied content (order confirmation, food photo, memo)
2. Navigate to Vault tab
3. Verify: Screenshots appear sorted by importance score
4. Verify: Score badges (🔥 or ⭐) appear on high-scoring items
5. Switch between 本周/本月 - verify filtering works

- [ ] **Step 3: Test view tracking**

1. Tap on a screenshot to view details
2. Navigate back to Vault
3. Wait for score recalculation (or manually trigger via developer menu)
4. Verify: That screenshot's score increased due to view

- [ ] **Step 4: Test search hit tracking**

1. Go to Search tab
2. Search for a term that matches several screenshots
3. Navigate to Vault tab
4. Verify: Screenshots that appeared in search have slightly higher scores

- [ ] **Step 5: Test time decay**

1. Check database to find screenshot with old `created_at` date
2. Manually update it to 30+ days old
3. Run score recalculation
4. Verify: Old screenshot's score is significantly decayed

- [ ] **Step 6: Test auto-downgrade**

1. Delete all screenshots or use app with no recent activity
2. Verify: "本周" shows empty state or auto-switches to "本月"
3. Verify: Helpful message guides user to import more content

---

## Task 14: Optional - Set up background score recalculation

**Files:**
- Modify: `app.json` or add background task setup

- [ ] **Step 1: Register background task (optional enhancement)**

This is an optional enhancement using expo-task-manager. If implementing:

```typescript
// Create services/backgroundTasks.ts:
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { recalculateAllScores } from './scoring';

const SCORE_RECALC_TASK = 'SCORE_RECALC_TASK';

export async function registerBackgroundTasks() {
  // Check if already registered
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SCORE_RECALC_TASK);
  if (isRegistered) return;

  // Register daily recalculation task
  await BackgroundFetch.registerTaskAsync(SCORE_RECALC_TASK, {
    minimumInterval: 60 * 60 * 24, // 24 hours
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

TaskManager.defineTask(SCORE_RECALC_TASK, async () => {
  try {
    await recalculateAllScores();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
```

Note: This requires expo-background-fetch and expo-task-manager packages, and needs proper permissions configuration.

---

## Success Criteria Verification

After completing all tasks, verify:

- [ ] Database migrations run successfully (user_interactions table, importance_score columns)
- [ ] New screenshots get importance scores from AI analysis
- [ ] Existing screenshots have backfilled scores (50 default)
- [ ] Viewing screenshot detail records interaction in database
- [ ] Search results record hit interactions
- [ ] Vault tab displays top screenshots with score badges
- [ ] Time window toggle (本周/本月) filters correctly
- [ ] Empty states show helpful messages
- [ ] Score badges appear on high-scoring items (60+)
- [ ] Interactions affect scores (after recalculation)
- [ ] App performance remains good (< 500ms Vault load time)

---

**End of Implementation Plan**
