import { getCurrentProviderConfig } from './config';

const FETCH_TIMEOUT = 30000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const config = await getCurrentProviderConfig();

  if (!text || text.trim().length === 0) {
    return [];
  }

  const body: any = {
    model: config.embeddingModel,
    input: text.trim(),
  };

  // OpenAI 和 OpenRouter 支持降维参数
  if (config.id === 'openai' || config.id === 'openrouter') {
    body.dimensions = config.embeddingDimensions;
  }

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`${config.name} Embedding API错误:`, err);
    return [];
  }

  try {
    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error(`${config.name} Embedding响应解析失败:`, e);
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult {
  id: string;
  score: number;
}

export function semanticSearch(
  queryEmbedding: number[],
  screenshots: { id: string; embedding: string }[],
  topK: number = 20
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const s of screenshots) {
    const emb = JSON.parse(s.embedding) as number[];
    if (emb.length === 0) continue;
    const score = cosineSimilarity(queryEmbedding, emb);
    results.push({ id: s.id, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.filter(r => r.score >= 0.5).slice(0, topK);
}