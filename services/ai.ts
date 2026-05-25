import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const API_KEY_FILE = `${FileSystem.documentDirectory}apikey.txt`;
const API_KEY_STORAGE_KEY = 'snapmind_api_key';
const FETCH_TIMEOUT = 30000; // 30 seconds

// Detect if we're in web environment using Platform
const isWeb = Platform.OS === 'web';

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

async function getApiKey(): Promise<string> {
  try {
    if (isWeb) {
      const key = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (!key) {
        throw new Error('请先在设置页配置 API Key');
      }
      return key;
    } else {
      return await FileSystem.readAsStringAsync(API_KEY_FILE);
    }
  } catch {
    throw new Error('请先在设置页配置 API Key');
  }
}

export async function saveApiKey(key: string): Promise<void> {
  const trimmedKey = key.trim();
  if (isWeb) {
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
  } else {
    await FileSystem.writeAsStringAsync(API_KEY_FILE, trimmedKey);
  }
}

interface AnalysisResult {
  raw_text: string;
  summary: string;
  category: string;
  tags: string[];
  city: string | null;
  importance_score: number;
}

export async function analyzeScreenshot(imageUri: string): Promise<AnalysisResult> {
  const apiKey = await getApiKey();

  // Resize image if too large to avoid API limits
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Check image size (base64 length * 0.75 ≈ bytes)
  const estimatedSize = base64.length * 0.75;
  if (estimatedSize > 20 * 1024 * 1024) { // 20MB limit
    throw new Error('图片太大，请选择小于20MB的图片');
  }

  const response = await fetchWithTimeout(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'low' // Use low detail for faster & cheaper API calls
              },
            },
            {
              type: 'text',
              text: `分析这张截图，返回纯JSON（不要markdown代码块）：

重要性评分说明：综合评估截图的实用价值，返回0-100之间的整数。
评分参考标准（非硬性累加，请根据实际情况综合判断）：
- 待办事项、日期时间类：高分段（70-100）
- 订单/票据/备忘录类：中高分段（60-90）
- 地址、电话、链接类：中分段（50-80）
- 信息密度高（文字多、有结构）：中高分段（60-90）
- 普通聊天/学习/购物：中分段（40-70）
- 纯美食/风景图片：低分段（0-40）

示例输出：
{
  "raw_text": "识别图中所有文字内容",
  "summary": "1-2句中文摘要，概括这张截图的用途和关键信息",
  "category": "美食|购物|旅行|聊天|学习|健身|灵感|待办 中选一个",
  "tags": ["标签1", "标签2", "标签3"],
  "city": "如果图中提到城市名则提取，否则null",
  "importance_score": 65
}`,
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API错误: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Handle markdown code blocks if present
  const cleanJson = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanJson);

    // 调试：查看AI返回的完整数据
    console.log('[AI] 返回的importance_score:', parsed.importance_score, '类型:', typeof parsed.importance_score);
    console.log('[AI] 完整数据:', parsed);

    // Ensure importance_score exists and is within valid range (0-100)
    if (typeof parsed.importance_score !== 'number') {
      console.warn('[AI] importance_score不是数字，使用默认值50');
      parsed.importance_score = 50;
    } else {
      // Clamp to valid range [0, 100]
      parsed.importance_score = Math.max(0, Math.min(100, parsed.importance_score));
    }
    return parsed;
  } catch (e) {
    // If JSON parsing fails, return a safe fallback
    console.error('JSON解析失败:', cleanJson);
    return {
      raw_text: '',
      summary: '无法解析AI返回结果',
      category: '待办',
      tags: [],
      city: null,
      importance_score: 50,
    };
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = await getApiKey();

  if (!text || text.trim().length === 0) {
    return [];
  }

  const response = await fetchWithTimeout(`${API_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-v3',
      input: text.trim(),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Embedding API错误:', err);
    // Return empty array instead of throwing - allow app to continue
    return [];
  }

  try {
    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error('Embedding响应解析失败:', e);
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
  results.forEach(r => console.log(`[AI] 语义搜索: id=${r.id}, score=${r.score.toFixed(4)}`));
  return results.filter(r => r.score >= 0.5).slice(0, topK);
}
