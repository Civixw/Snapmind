import {
  getScreenshotById,
  getAllScreenshots,
  updateScreenshot,
  updateImportanceScore,
  getDb,
  Screenshot,
} from './database.native';
import { getInteractionCounts, DEFAULT_SCORING_WINDOW_DAYS } from './interactions';

// Constants for score calculation
export const DECAY_LAMBDA = 0.05;
export const VIEW_BONUS = 3;
export const SEARCH_HIT_BONUS = 5;

export interface ScoreCalculation {
  baseScore: number;
  timeDecay: number;
  interactionBonus: number;
  finalScore: number;
}

/**
 * Calculate time decay coefficient
 * Formula: e^(-lambda × days) where lambda = 0.05
 * Returns decay factor between 0 and 1
 */
export function decayScore(daysSinceImport: number): number {
  return Math.exp(-DECAY_LAMBDA * daysSinceImport);
}

/**
 * Calculate days between import date and now
 * Returns integer days
 */
export function daysSince(importDate: string | Date): number {
  const now = new Date();
  const importDateObj = new Date(importDate);
  const diffMs = now.getTime() - importDateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays); // Ensure non-negative
}

/**
 * Calculate final importance score
 * Returns: { baseScore, timeDecay, interactionBonus, finalScore }
 * Final = (baseScore × timeDecay) + interactionBonus
 * interactionBonus = (views × VIEW_BONUS) + (searchHits × SEARCH_HIT_BONUS)
 * Final score clamped to 0-100
 */
export async function calculateImportanceScore(
  baseScore: number,
  importDate: string | Date,
  interactionCounts: { views: number; searchHits: number }
): Promise<ScoreCalculation> {
  const days = daysSince(importDate);
  const timeDecay = decayScore(days);

  // Calculate interaction bonus
  const interactionBonus =
    interactionCounts.views * VIEW_BONUS + interactionCounts.searchHits * SEARCH_HIT_BONUS;

  // Calculate final score with decay and bonus
  let finalScore = baseScore * timeDecay + interactionBonus;

  // Clamp to 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    baseScore,
    timeDecay,
    interactionBonus,
    finalScore: Math.round(finalScore), // Round to integer for storage
  };
}

/**
 * Update single screenshot's importance score in database
 * - Gets screenshot's base_score and created_at
 * - Gets interaction counts from interactions service
 * - Calculates new score
 * - Updates database with new score and timestamp
 */
export async function updateScreenshotScore(screenshotId: string): Promise<void> {
  try {
    // Get screenshot data
    const screenshot = await getScreenshotById(screenshotId);
    if (!screenshot) {
      console.warn('[Scoring] Screenshot not found:', screenshotId);
      return;
    }

    // Use importance_score as base score (defaults to 0 if null)
    const baseScore = screenshot.importance_score ?? 0;
    const importDate = screenshot.created_at;

    // Get interaction counts within default scoring window
    const interactionCounts = await getInteractionCounts(
      screenshotId,
      DEFAULT_SCORING_WINDOW_DAYS
    );

    // Calculate new score
    const calculation = await calculateImportanceScore(baseScore, importDate, interactionCounts);

    // Update database
    await updateImportanceScore(screenshotId, calculation.finalScore);

    console.log(
      '[Scoring] Updated score for',
      screenshotId,
      ':',
      calculation.finalScore,
      '(base:',
      baseScore,
      'decay:',
      calculation.timeDecay.toFixed(3),
      'bonus:',
      calculation.interactionBonus,
      ')'
    );
  } catch (error) {
    console.error('[Scoring] Failed to update screenshot score:', error);
    throw error;
  }
}

/**
 * Recalculate all screenshots' importance scores
 * Loops through all screenshots and updates each
 */
export async function recalculateAllScores(): Promise<number> {
  try {
    const screenshots = await getAllScreenshots('all', 10000); // Get all screenshots
    console.log('[Scoring] Recalculating scores for', screenshots.length, 'screenshots');

    let successCount = 0;
    let failCount = 0;

    for (const screenshot of screenshots) {
      try {
        await updateScreenshotScore(screenshot.id);
        successCount++;
      } catch (error) {
        console.error('[Scoring] Failed to update score for', screenshot.id, ':', error);
        failCount++;
      }
    }

    console.log('[Scoring] Recalculation complete:', successCount, 'success,', failCount, 'failed');
    return successCount;
  } catch (error) {
    console.error('[Scoring] Failed to recalculate all scores:', error);
    throw error;
  }
}

/**
 * Get top screenshots by importance score within time window
 * @param daysBack - Number of days to look back (default 30)
 * @param limit - Maximum number of screenshots to return (default 24)
 * @returns Screenshots sorted by importance_score DESC, created_at DESC
 */
export async function getTopScreenshots(
  daysBack: number = 30,
  limit: number = 24
): Promise<Screenshot[]> {
  try {
    const database = await getDb();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffIso = cutoffDate.toISOString();

    console.log('[Scoring] Getting top', limit, 'screenshots since', cutoffIso);

    const results = await database.getAllAsync<Screenshot>(
      `SELECT id, image_path, raw_text, summary, category, tags, embedding, created_at, importance_score, score_updated_at
       FROM screenshots
       WHERE created_at >= ?
       ORDER BY importance_score DESC, created_at DESC
       LIMIT ?`,
      [cutoffIso, limit]
    );

    console.log('[Scoring] Retrieved', results.length, 'top screenshots');
    return results;
  } catch (error) {
    console.error('[Scoring] Failed to get top screenshots:', error);
    throw error;
  }
}

/**
 * One-time migration to backfill importance scores
 * Sets importance_score = 50 for screenshots where score IS NULL or = 0
 */
export async function backfillImportanceScores(): Promise<number> {
  try {
    const database = await getDb();

    // Count screenshots needing backfill
    const countResult = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM screenshots WHERE importance_score IS NULL OR importance_score = 0`
    );
    const count = countResult?.count ?? 0;

    if (count === 0) {
      console.log('[Scoring] No screenshots need backfilling');
      return 0;
    }

    console.log('[Scoring] Backfilling importance scores for', count, 'screenshots');

    // Update screenshots with default score
    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE screenshots
       SET importance_score = 50, score_updated_at = ?
       WHERE importance_score IS NULL OR importance_score = 0`,
      [now]
    );

    console.log('[Scoring] Backfill complete:', count, 'screenshots updated');
    return count;
  } catch (error) {
    console.error('[Scoring] Failed to backfill importance scores:', error);
    throw error;
  }
}
