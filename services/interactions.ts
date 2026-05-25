import { insertUserInteraction, getUserInteractions, deleteUserInteraction, deleteUserInteractionsByScreenshotId, getInteractionCount, getDb } from './database.native';

// Simple UUID generator (v4) - doesn't require expo-crypto
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Type exports
export type InteractionType = 'view' | 'search_hit';
export interface Interaction {
  id: string;
  screenshot_id: string;
  interaction_type: InteractionType;
  created_at: string;
}

// Constants for interaction tracking
export const INTERACTION_RETENTION_DAYS = 90;
export const DEFAULT_SCORING_WINDOW_DAYS = 30;

/**
 * Record when user views screenshot detail
 * Silent fail on error (don't block user action)
 */
export async function recordView(screenshotId: string): Promise<void> {
  try {
    const interaction: Interaction = {
      id: generateUUID(),
      screenshot_id: screenshotId,
      interaction_type: 'view',
      created_at: new Date().toISOString(),
    };
    await insertUserInteraction(interaction);
  } catch (error) {
    // Silent fail - don't block user action
    console.warn('[Interactions] Failed to record view:', error);
  }
}

/**
 * Record when screenshot appears in search results
 * Silent fail on error (don't block user action)
 */
export async function recordSearchHit(screenshotId: string): Promise<void> {
  try {
    const interaction: Interaction = {
      id: generateUUID(),
      screenshot_id: screenshotId,
      interaction_type: 'search_hit',
      created_at: new Date().toISOString(),
    };
    await insertUserInteraction(interaction);
  } catch (error) {
    // Silent fail - don't block user action
    console.warn('[Interactions] Failed to record search hit:', error);
  }
}

/**
 * Get interaction counts for scoring within time window
 * Returns { views: number, searchHits: number }
 * Returns {0, 0} on error
 */
export async function getInteractionCounts(
  screenshotId: string,
  daysBack: number = DEFAULT_SCORING_WINDOW_DAYS
): Promise<{ views: number; searchHits: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffIso = cutoffDate.toISOString();

    const database = await getDb();

    // Get counts within time window using a single query
    const result = await database.getFirstAsync<{
      views: number;
      search_hits: number;
    }>(
      `SELECT
        SUM(CASE WHEN interaction_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN interaction_type = 'search_hit' THEN 1 ELSE 0 END) as search_hits
       FROM user_interactions
       WHERE screenshot_id = ? AND created_at >= ?`,
      [screenshotId, cutoffIso]
    );

    return {
      views: result?.views ?? 0,
      searchHits: result?.search_hits ?? 0,
    };
  } catch (error) {
    console.warn('[Interactions] Failed to get interaction counts:', error);
    return { views: 0, searchHits: 0 };
  }
}

/**
 * Delete interactions older than retention period
 * Optional maintenance function to keep database size manageable
 */
export async function cleanupOldInteractions(
  retentionDays: number = INTERACTION_RETENTION_DAYS
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const database = await getDb();

    // Get count before deletion
    const countResult = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_interactions WHERE created_at < ?',
      [cutoffIso]
    );
    const deletedCount = countResult?.count ?? 0;

    // Delete old interactions
    await database.runAsync(
      'DELETE FROM user_interactions WHERE created_at < ?',
      [cutoffIso]
    );

    console.log('[Interactions] Cleaned up', deletedCount, 'old interactions');
    return deletedCount;
  } catch (error) {
    console.error('[Interactions] Failed to cleanup old interactions:', error);
    return 0;
  }
}

/**
 * Get all interactions for a screenshot (for debugging/analytics)
 */
export async function getScreenshotInteractions(
  screenshotId: string,
  limit: number = 100
): Promise<Interaction[]> {
  try {
    return await getUserInteractions(screenshotId, undefined, limit);
  } catch (error) {
    console.warn('[Interactions] Failed to get screenshot interactions:', error);
    return [];
  }
}

/**
 * Delete all interactions for a screenshot (called when screenshot is deleted)
 */
export async function deleteScreenshotInteractions(screenshotId: string): Promise<void> {
  try {
    await deleteUserInteractionsByScreenshotId(screenshotId);
  } catch (error) {
    console.warn('[Interactions] Failed to delete screenshot interactions:', error);
  }
}

/**
 * Get total interaction count for a screenshot (all time)
 */
export async function getTotalInteractionCount(screenshotId: string): Promise<number> {
  try {
    return await getInteractionCount(screenshotId);
  } catch (error) {
    console.warn('[Interactions] Failed to get total interaction count:', error);
    return 0;
  }
}
