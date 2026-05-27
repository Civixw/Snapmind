// services/ai/index.ts
// 统一导出所有 AI 相关功能

// 配置
export * from './config';

// 存储
export * from './storage';

// 视觉分析
export { analyzeScreenshot } from './vision';
export type { AnalysisResult, SensitiveFlag } from './vision';

// 向量嵌入
export { getEmbedding, semanticSearch } from './embedding';
export type { SearchResult } from './embedding';

// 数据迁移
export { migrateApiKeyIfNecessary } from './storage';