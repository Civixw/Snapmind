// ── Platform-specific database implementation ──
// Native platforms (iOS/Android) use SQLite via .native.ts
// Web platform uses this file as fallback (in-memory for development)

export * from './database.native';
