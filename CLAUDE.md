# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapMind is a React Native Expo app for saving and searching screenshots with AI-powered analysis. Users import screenshots, which are analyzed via OpenAI's API (OCR, categorization, summarization, embeddings) and stored locally in SQLite for fast search and retrieval.

**Tech Stack:**
- Expo SDK 52 (React Native 0.76.9)
- expo-router for file-based routing (tabs layout)
- expo-sqlite for local database with FTS5 full-text search
- OpenAI API (gpt-4o-mini for analysis, text-embedding-3-small for embeddings)
- TypeScript with path aliases (`@/*` → project root)

## Development Commands

```bash
# Start development server (Expo Go app for testing)
npm start

# Run on specific platforms
npm run android    # Build and run on Android
npm run ios        # Build and run on iOS
npm run web        # Run in web browser
```

## Architecture

### File-Based Routing (app/)

Uses expo-router with a tabs layout:
- `app/_layout.tsx` - Root layout with font loading and error boundary
- `app/(tabs)/` - Tab navigation screens:
  - `index.tsx` - Home timeline (screenshot grid)
  - `search.tsx` - Keyword and semantic search
  - `vault.tsx` - Placeholder
  - `settings.tsx` - API key configuration
- `app/detail/[id].tsx` - Individual screenshot detail view

### Services Layer (services/)

- `database.native.ts` - SQLite operations (CRUD, FTS5 search)
  - Main table: `screenshots` with FTS5 virtual table
  - Handles schema migrations
  - API: `insertScreenshot`, `getAllScreenshots`, `searchByKeyword`, `updateScreenshot`, `deleteScreenshot`, `getScreenshotCount`

- `ai.ts` - OpenAI API integration
  - `analyzeScreenshot()` - OCR + categorization using gpt-4o-mini
  - `getEmbedding()` - Generate embeddings with text-embedding-3-small
  - `semanticSearch()` - Cosine similarity search
  - API key stored in filesystem (native) or localStorage (web)

- `image.ts` - Image file operations
  - `pickImages()` - Image picker with multi-selection
  - `saveImage()` - Copy to app's document directory
  - `deleteImage()` - Clean up image files
  - Images stored at `${FileSystem.documentDirectory}images/`

### Store Layer (store/)

- `index.ts` - Export useStore hook
- `useStore.ts` - Zustand store with global state
  - State: screenshots, apiKey, recentSearches
  - Actions: loadInitialData, setScreenshots, addScreenshots, removeScreenshot, clearAllScreenshots, setApiKey, addRecentSearch, clearRecentSearches
  - Uses persist middleware for apiKey and recentSearches
- `persist.ts` - Storage adapter (Web: localStorage, Native: FileSystem)

### Key Data Structures

```typescript
interface Screenshot {
  id: string;
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;        // JSON string array
  embedding: string;   // JSON number array
  created_at: string;
}
```

Categories: 美食, 购物, 旅行, 聊天, 学习, 健身, 灵感, 待办

### Components (components/)

- `ImportModal.tsx` - Multi-image import with progress tracking
- `ScreenshotCard.tsx` - Grid item with category/tag chips
- `CategoryFilter.tsx` - Category filter pills
- `SearchBar.tsx` - Search input
- `TagChip.tsx` - Individual tag display
- `GlassCard.tsx` - Glassmorphism container
- `ErrorBoundary.tsx` - Error boundary

## Important Notes

- Platform differences handled via `Platform.OS` (web vs native)
- Images stored locally; paths saved in database
- FTS5 search uses prefix matching (`"term"*`) for partial matches
- Database includes automatic migration logic for schema changes
- OpenAI API calls have 30s timeout and size limits (20MB images)
- The app requires a valid OpenAI API key to function (configured in Settings)

## Version Constraints

- Expo SDK 52 (refer to https://docs.expo.dev/versions/v52.0.0/ for documentation)
- React Native 0.76.9
- TypeScript 6.0.3 with strict mode enabled
