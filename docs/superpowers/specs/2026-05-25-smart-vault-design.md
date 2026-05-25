# Smart Vault (智能精选) Feature Design

**Date:** 2026-05-25
**Author:** Claude & Civi
**Status:** Approved

## Overview

The Smart Vault feature automatically identifies and surfaces the most valuable screenshots to users. It uses a hybrid scoring system combining AI content analysis with user behavior patterns, presenting curated highlights in "This Week" and "This Month" time windows.

## Goals

Enable users to quickly review high-value content without manually sifting through all screenshots. The feature should feel like a personal assistant that knows what's important.

## Requirements

### Functional Requirements

1. **Automatic Curation**
   - Calculate an importance score for each screenshot (0-100)
   - Display top-scoring screenshots in dedicated Vault tab
   - Support filtering by time windows: "This Week" and "This Month"

2. **Hybrid Scoring**
   - AI analysis provides base score during import
   - User behaviors (views, search hits) add bonus points
   - Time decay ensures fresh content stays relevant

3. **User Interaction Tracking**
   - Record when user views screenshot details
   - Record when screenshot appears in search results
   - Use interactions to boost importance score

### Non-Functional Requirements

- Fast loading: Vault screen should load in < 500ms
- Background scoring: Recalculate scores daily without blocking UI
- Graceful degradation: Work even if AI scoring fails
- Database efficiency: Indexes for time-based queries

## Architecture

### Database Changes

**New Table: `user_interactions`**
```sql
CREATE TABLE user_interactions (
  id TEXT PRIMARY KEY,
  screenshot_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,  -- 'view' | 'search_hit'
  created_at TEXT NOT NULL,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id)
);

CREATE INDEX idx_interactions_screenshot ON user_interactions(screenshot_id);
CREATE INDEX idx_interactions_type_created ON user_interactions(interaction_type, created_at);
```

**Modified Table: `screenshots`**
```sql
ALTER TABLE screenshots ADD COLUMN importance_score INTEGER DEFAULT 0;
ALTER TABLE screenshots ADD COLUMN score_updated_at TEXT;
```

### Scoring Formula

```
Final Score = (Base Score × Time Decay) + Interaction Bonus

Where:
- Base Score: AI analysis result (0-100)
- Time Decay: e^(-λ × days_since_import), λ ≈ 0.05
  - Today: 1.0
  - 7 days ago: 0.70
  - 30 days ago: 0.22
- Interaction Bonus:
  - Each view: +3 points
  - Each search hit: +5 points
```

### File Structure

```
services/
├── scoring.ts          # NEW: Scoring engine
│   ├── calculateScore()         # Calculate final score
│   ├── decayScore()             # Apply time decay
│   ├── updateScore()            # Update database
│   └── recalculateAllScores()   # Batch recalculation
├── interactions.ts     # NEW: User behavior tracking
│   ├── recordView()             # Record detail view
│   ├── recordSearchHit()        # Record search result appearance
│   └── getRecentInteractions()  # Get interactions for scoring
├── ai.ts (modified)   # Returns importance_score in analysis
└── database.native.ts (modified) # Score CRUD operations
```

## Data Flow

### Import Flow
```
User imports screenshot
    ↓
ImportModal calls ai.analyzeScreenshot()
    ↓
OpenAI returns: raw_text, summary, category, tags, embedding, **importance_score**
    ↓
Database stores screenshot with base importance_score
    ↓
Vault can now display this screenshot if score is high enough
```

### Interaction Flow
```
User views screenshot detail (app/detail/[id].tsx)
    ↓
interactions.recordView(id)
    ↓
New row in user_interactions table
    ↓
Next daily recalc: view adds +3 to score
```

### Scoring Flow (Daily Background Job)
```
Daily trigger (could use expo-task-manager)
    ↓
scoring.recalculateAllScores()
    ↓
For each screenshot:
  1. Fetch base_score from AI analysis
  2. Fetch interaction counts (views × 3, hits × 5)
  3. Apply time decay based on created_at
  4. Calculate final score
  5. Update screenshots.importance_score
    ↓
Vault shows fresh rankings next visit
```

### Vault Display Flow
```
User opens Vault tab
    ↓
Load screenshots where created_at >= time_window_cutoff
    ↓
Sort by importance_score DESC
    ↓
Take top 24 results
    ↓
Display in two-column grid with score badges
```

## UI Design

### Vault Screen Layout

```
┌─────────────────────────────────┐
│  🔍 智能精选         ⚙️        │ ← Header
├─────────────────────────────────┤
│  ┌───┐ 本周  ┌───┐ 本月         │ ← Segmented Control
│  └───┘       └───┘              │
├─────────────────────────────────┤
│                                 │
│  ┌─────┐  ┌─────┐              │
│  │ 🔥72│  │ 68  │              │ ← Score badges (80+)
│  │高光 │  │     │              │
│  └─────┘  └─────┘              │
│  ┌─────┐  ┌─────┐              │
│  │ ⭐65│  │ 61  │              │ ← Score badges (60-79)
│  │     │  │     │              │
│  └─────┘  └─────┘              │
│                                 │
└─────────────────────────────────┘
```

### Score Badge Styles

| Score Range | Badge | Colors |
|-------------|-------|--------|
| 80-100 | 🔥 number | Gold bg, dark text |
| 60-79 | ⭐ number | Orange bg, white text |
| 0-59 | (none) | - |

### Empty States

| Scenario | Display |
|----------|---------|
| No screenshots at all | "导入截图后，AI 会帮你找出重要内容" |
| No screenshots in time window | "本周暂无高光，试试放宽到本月？" |
| No high-scoring screenshots | "暂无精选内容，继续导入截图吧" |

### Segmented Control Behavior

- **本周 (This Week)**: Default, filters screenshots from last 7 days
- **本月 (This Month)**: Filters screenshots from last 30 days
- **Auto-downgrade**: If selected window has < 3 screenshots, auto-expand to wider window

## AI Scoring Criteria

### Importance Score Calculation (via GPT-4o-mini)

**Base Score Factors:**
- **Actionability** (+30): Contains todos, dates, times to remember
- **Contact Info** (+20): Contains addresses, phone numbers, URLs
- **Content Type** (+20): Orders, tickets, memos, confirmations
- **Information Density** (+30): High text volume, structured content
- **Visual Only** (0-20): Pure food/scenery photos with minimal text

**Prompt Addition:**
```
Please calculate an importance score (0-100) for this screenshot based on:
- Contains actionable items (todos, dates, times): +30
- Contains contact info (addresses, phones, links): +20
- Content type (orders, tickets, memos): +20
- Information density (text volume, structure): +30
- Pure visual content (food, scenery): 0-20

Return just the number as "importance_score": <score>
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| AI analysis fails (no score) | Default to 50, log error |
| Behavior record fails | Silent fail, don't block user action |
| Score calculation fails | Keep existing score, retry next run |
| Database query fails | Show error state with retry button |
| No data in time window | Auto-expand window or show helpful message |

## Performance Considerations

### Database Optimization
- Index on `screenshots(created_at)` for time-based filtering
- Index on `screenshots(importance_score)` for sorting
- Composite index on `user_interactions(screenshot_id, interaction_type)`

### Lazy Loading
- Interactions only aggregated when needed (Vault load, score recalc)
- Vault page uses pagination if > 24 screenshots

### Background Jobs
- Score recalculation runs once daily (expo-task-manager)
- Can be triggered manually from Settings for testing

## Testing Strategy

### Unit Tests
- `scoring.calculateScore()`: Correct weighted calculation
- `scoring.decayScore()`: Accurate decay curve
- `interactions.recordView()`: Data written correctly
- `interactions.getRecentInteractions()`: Correct aggregation

### Manual Test Scenarios
| Test | Expected Result |
|------|-----------------|
| Import order screenshot | Score > 70, appears in This Week |
| Import pure food photo | Score < 40, not in top results |
| View screenshot 5 times | Score increases by 15, rank improves |
| Search hits screenshot | Score increases by 5 per hit |
| Switch Week/Month toggle | Correct time filtering |
| 30-day-old screenshot | Significant time decay applied |

### Integration Tests
- Full flow: Import → Record behaviors → Recalculate scores → Vault display
- Database migration: Old screenshots get scored on first run

## Migration Plan

### Phase 1: Database & Services
- Add `user_interactions` table
- Add `importance_score` columns to `screenshots`
- Create `services/scoring.ts` and `services/interactions.ts`

### Phase 2: AI Integration
- Modify `ai.ts` prompt to return importance_score
- Update analysis result interface

### Phase 3: Interaction Tracking
- Add tracking calls in detail page and search
- Implement background score recalculation

### Phase 4: UI Implementation
- Build Vault screen with segmented control
- Add score badges to screenshot cards

### Phase 5: Backfill
- One-time job to score existing screenshots
- Can run incrementally in background

## Future Enhancements

- **Manual scoring override**: Let users boost/demote screenshots
- **Custom time windows**: User-defined date ranges
- **Score explanation**: Show user why a screenshot was selected
- **Categories in Vault**: Filter by category within time window
- **Export highlights**: Share or export curated collection

## Success Criteria

- ✅ Vault shows high-value screenshots within correct time window
- ✅ Score calculations are fast and don't block UI
- ✅ User interactions meaningfully affect rankings
- ✅ Empty states are helpful and guide users
- ✅ Time decay prevents old content from dominating
- ✅ Feature works offline after initial scoring
