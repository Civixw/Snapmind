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
    const screenshot = await getScreenshotById(screenshotId);
    if (!screenshot) {
      return;
    }

    // Use base_score as the fixed initial score
    // If base_score is null, fall back to importance_score, then default to 50
    const baseScore = screenshot.base_score ?? screenshot.importance_score ?? 50;
    const importDate = screenshot.created_at;

    // Get interaction counts within default scoring window
    const interactionCounts = await getInteractionCounts(
      screenshotId,
      DEFAULT_SCORING_WINDOW_DAYS
    );

    // Calculate new score
    const calculation = await calculateImportanceScore(baseScore, importDate, interactionCounts);

    await updateImportanceScore(screenshotId, calculation.finalScore);
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
    const screenshots = await getAllScreenshots('all', 10000);

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

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffIso = cutoffDate.toISOString();

    return database.getAllAsync<Screenshot>(
      `SELECT id, image_path, raw_text, summary, category, tags, embedding, created_at, importance_score, score_updated_at, base_score, sensitive_flags
       FROM screenshots
       WHERE created_at >= ?
       ORDER BY importance_score DESC, created_at DESC
       LIMIT ?`,
      [cutoffIso, limit]
    );
  } catch (error) {
    console.error('[Scoring] Failed to get top screenshots:', error);
    throw error;
  }
}

/**
 * One-time migration to backfill importance scores
 * Sets base_score = 50 and importance_score = 50 for screenshots where they are NULL or = 0
 */
export async function backfillImportanceScores(): Promise<number> {
  try {
    const database = await getDb();

    const countResult = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM screenshots WHERE base_score IS NULL OR base_score = 0`
    );
    const count = countResult?.count ?? 0;

    if (count === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE screenshots
       SET base_score = 50, importance_score = 50, score_updated_at = ?
       WHERE base_score IS NULL OR base_score = 0`,
      [now]
    );

    return count;
  } catch (error) {
    console.error('[Scoring] Failed to backfill importance scores:', error);
    throw error;
  }
}
