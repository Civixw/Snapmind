# Global State Management Design

**Date:** 2026-05-25
**Author:** Claude
**Status:** Approved

## Problem Statement

SnapMind has two state synchronization issues:

1. **Screenshot count not updating:** After uploading images, the settings page shows stale count until app restart
2. **API key displays as empty but works:** The saved API key loads correctly for AI functions but doesn't display in the settings UI

## Root Cause

- Components use local `useState` that only loads on mount
- No shared state between screens
- Settings page has no `useEffect` to load the saved API key on mount

## Solution: Zustand + Persist Middleware

### Architecture

Use Zustand for global state management with automatic persistence for small data. Large data (screenshots) stays in SQLite but syncs to store.

### Store Structure

```typescript
interface AppState {
  // Data state
  screenshots: Screenshot[];
  apiKey: string;
  recentSearches: string[];

  // Derived state
  screenshotCount: number;

  // Actions
  loadInitialData: () => Promise<void>;
  setScreenshots: (screenshots: Screenshot[]) => void;
  addScreenshots: (newScreenshots: Screenshot[]) => void;
  removeScreenshot: (id: string) => void;
  clearAllScreenshots: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}
```

### Storage Strategy

| State | Persist Strategy | Reason |
|-------|------------------|--------|
| `screenshots` | No persist | Read from DB on demand, large data |
| `apiKey` | Persist | User config, needs persistence |
| `recentSearches` | Persist | User preference |
| `screenshotCount` | No persist | Derived from screenshots |

### Data Flow

**Initialization (App Startup):**
```
1. _layout.tsx mounts, calls loadInitialData()
2. Parallel load: apiKey, recentSearches from storage, screenshots from DB
3. Subscribed components auto-update
```

**Import Screenshots:**
```
1. ImportModal completes import
2. Calls store.addScreenshots(newData)
3. Home page auto-shows new data (reactive)
4. Settings page auto-updates count (reactive)
```

**Set API Key:**
```
1. User saves key in settings
2. Calls store.setApiKey(key)
3. Writes to storage, updates apiKey state
4. Settings input auto-fills latest value
```

### File Structure

```
store/
├── index.ts           # Export useStore
├── useStore.ts        # Zustand store definition
└── persist.ts         # Storage adapter (Web: localStorage, Native: FileSystem)
```

### Component Integration

**index.tsx (Home):**
```typescript
const screenshots = useStore(state => state.screenshots);
const loadData = useStore(state => state.loadInitialData);
useFocusEffect(() => { loadData(); });
```

**settings.tsx:**
```typescript
const screenshotCount = useStore(state => state.screenshotCount);
const apiKey = useStore(state => state.apiKey);
const setApiKey = useStore(state => state.setApiKey);
```

**search.tsx:**
```typescript
const recentSearches = useStore(state => state.recentSearches);
const addRecentSearch = useStore(state => state.addRecentSearch);
```

**ImportModal.tsx:**
```typescript
const addScreenshots = useStore(state => state.addScreenshots);
onComplete: (newScreenshots) => { addScreenshots(newScreenshots); }
```

### Error Handling

- **Store layer:** Catch errors, use default values, log to console
- **Component layer:** Keep existing try-catch + Alert patterns
- Store handles state, components handle UI errors

### Changes Required

**New files (3):**
- `store/index.ts`
- `store/useStore.ts`
- `store/persist.ts`

**Modified files (4):**
- `app/(tabs)/index.tsx`
- `app/(tabs)/settings.tsx`
- `app/(tabs)/search.tsx`
- `components/ImportModal.tsx`

### Issue Resolution

**Problem 1 - Count not updating:**
- After import, `addScreenshots()` updates store
- Settings page gets count from `screenshotCount` (reactive) ✅

**Problem 2 - API key empty display:**
- `loadInitialData()` loads saved key on startup
- Settings page displays from `apiKey` state ✅
