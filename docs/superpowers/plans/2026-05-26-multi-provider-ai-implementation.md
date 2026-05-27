# 多厂商 AI 服务支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持 OpenAI、阿里云百炼、智谱 GLM、DeepSeek、OpenRouter 五个厂商的 AI 服务，用户只需选择厂商并输入 API Key 即可使用

**Architecture:** 配置驱动的 AI 服务层，预设五个厂商的 API 配置（endpoint、模型名、向量维度），Store 存储当前选中厂商和各厂商的 API Key，服务层根据当前配置动态调用对应厂商 API

**Tech Stack:** TypeScript, Expo, Zustand, expo-sqlite, OpenAI-compatible APIs

---

## 文件结构

**新建文件：**
- `services/ai/config.ts` - 厂商预设配置常量
- `services/ai/storage.ts` - API Key 存储管理
- `services/ai/vision.ts` - 视觉分析功能
- `services/ai/embedding.ts` - 向量生成和搜索
- `services/ai/index.ts` - 统一导出

**修改文件：**
- `services/ai.ts` - 保留作为向后兼容入口，内部转发到新模块
- `store/useStore.ts` - 添加厂商配置相关状态
- `store/persist.ts` - 可能需要适配新的存储结构
- `app/(tabs)/settings.tsx` - 改造设置页面 UI

---

## Task 1: 创建厂商配置结构

**Files:**
- Create: `services/ai/config.ts`

- [ ] **Step 1: 创建厂商配置文件**

```typescript
// services/ai/config.ts

export type AIProvider =
  | 'openai'
  | 'dashscope'
  | 'zhipu'
  | 'deepseek'
  | 'openrouter';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiBaseUrl: string;
  visionModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiBaseUrl: 'https://api.openai.com/v1',
    visionModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1024,
  },
  dashscope: {
    id: 'dashscope',
    name: '阿里云百炼',
    apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    visionModel: 'qwen-vl-plus',
    embeddingModel: 'text-embedding-v3',
    embeddingDimensions: 1024,
  },
  zhipu: {
    id: 'zhipu',
    name: '智谱GLM',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    visionModel: 'glm-4v-plus',
    embeddingModel: 'embedding-3',
    embeddingDimensions: 1024,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    visionModel: 'deepseek-vl-chat',
    embeddingModel: 'deepseek-embedding',
    embeddingDimensions: 1024,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    apiBaseUrl: 'https://openrouter.ai/api/v1',
    visionModel: 'openai/gpt-4o-mini',
    embeddingModel: 'openai/text-embedding-3-small',
    embeddingDimensions: 1024,
  },
};

export const DEFAULT_PROVIDER: AIProvider = 'dashscope';
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la services/ai/config.ts`
Expected: 文件存在

- [ ] **Step 3: 提交**

```bash
git add services/ai/config.ts
git commit -m "feat: 添加厂商预设配置结构"
```

---

## Task 2: 创建 API Key 存储管理

**Files:**
- Create: `services/ai/storage.ts`

- [ ] **Step 1: 创建存储管理文件**

```typescript
// services/ai/storage.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { storageAdapter } from '../../store/persist';
import { AIProvider, PROVIDER_CONFIGS } from './config';

const isWeb = Platform.OS === 'web';

export interface ProviderKeys {
  openai: string | null;
  dashscope: string | null;
  zhipu: string | null;
  deepseek: string | null;
  openrouter: string | null;
}

const CURRENT_PROVIDER_KEY = 'snapmind_current_provider';
const PROVIDER_KEYS_KEY = 'snapmind_provider_keys';
const LEGACY_API_KEY_KEY = 'snapmind_api_key';

// 创建空的 provider keys
function createEmptyProviderKeys(): ProviderKeys {
  return {
    openai: null,
    dashscope: null,
    zhipu: null,
    deepseek: null,
    openrouter: null,
  };
}

// 获取当前选中的厂商
export async function getCurrentProvider(): Promise<AIProvider> {
  try {
    if (isWeb) {
      const stored = localStorage.getItem(CURRENT_PROVIDER_KEY);
      return (stored as AIProvider) || PROVIDER_CONFIGS.dashscope.id;
    } else {
      const fileUri = `${FileSystem.documentDirectory}${CURRENT_PROVIDER_KEY}.txt`;
      const content = await FileSystem.readAsStringAsync(fileUri);
      return content as AIProvider;
    }
  } catch {
    return PROVIDER_CONFIGS.dashscope.id;
  }
}

// 设置当前选中的厂商
export async function setCurrentProvider(provider: AIProvider): Promise<void> {
  if (isWeb) {
    localStorage.setItem(CURRENT_PROVIDER_KEY, provider);
  } else {
    const fileUri = `${FileSystem.documentDirectory}${CURRENT_PROVIDER_KEY}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, provider);
  }
}

// 获取所有厂商的 API Key
export async function getProviderKeys(): Promise<ProviderKeys> {
  try {
    const stored = await storageAdapter.getItem(PROVIDER_KEYS_KEY);
    if (stored) {
      return JSON.parse(stored) as ProviderKeys;
    }
    return createEmptyProviderKeys();
  } catch {
    return createEmptyProviderKeys();
  }
}

// 保存所有厂商的 API Key
export async function setProviderKeys(keys: ProviderKeys): Promise<void> {
  await storageAdapter.setItem(PROVIDER_KEYS_KEY, JSON.stringify(keys));
}

// 获取指定厂商的 API Key
export async function getProviderApiKey(provider: AIProvider): Promise<string> {
  const providerKeys = await getProviderKeys();
  const key = providerKeys[provider];

  if (key) {
    return key;
  }

  // 尝试从旧格式读取（向后兼容）
  const oldKey = await storageAdapter.getItem(LEGACY_API_KEY_KEY);
  if (oldKey) {
    if (provider === 'dashscope') {
      return oldKey;
    }
    throw new Error(`请先配置 ${PROVIDER_CONFIGS[provider].name} 的 API Key`);
  }

  throw new Error(`${PROVIDER_CONFIGS[provider].name} 未配置 API Key`);
}

// 设置指定厂商的 API Key
export async function setProviderApiKey(provider: AIProvider, apiKey: string | null): Promise<void> {
  const keys = await getProviderKeys();
  keys[provider] = apiKey;
  await setProviderKeys(keys);
}

// 数据迁移：将旧 API Key 迁移到新格式
export async function migrateApiKeyIfNecessary(): Promise<void> {
  const oldKey = await storageAdapter.getItem(LEGACY_API_KEY_KEY);
  const existingKeys = await storageAdapter.getItem(PROVIDER_KEYS_KEY);

  if (oldKey && !existingKeys) {
    // 迁移到阿里云百炼
    const keys: ProviderKeys = createEmptyProviderKeys();
    keys.dashscope = oldKey;

    await setProviderKeys(keys);
    await setCurrentProvider('dashscope');

    console.log('[AI] API Key 已迁移到新格式');
  }
}
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la services/ai/storage.ts`
Expected: 文件存在

- [ ] **Step 3: 提交**

```bash
git add services/ai/storage.ts
git commit -m "feat: 添加厂商 API Key 存储管理"
```

---

## Task 3: 创建视觉分析模块

**Files:**
- Create: `services/ai/vision.ts`

- [ ] **Step 1: 创建视觉分析模块**

```typescript
// services/ai/vision.ts
import * as FileSystem from 'expo-file-system';
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

export type SensitiveFlag =
  | 'id_card'
  | 'bank_card'
  | 'phone'
  | 'chat_record'
  | 'password'
  | 'private_photo';

export interface AnalysisResult {
  raw_text: string;
  summary: string;
  category: string;
  tags: string[];
  city: string | null;
  importance_score: number;
  sensitive_flags: SensitiveFlag[];
}

export async function analyzeScreenshot(imageUri: string): Promise<AnalysisResult> {
  const config = await getCurrentProviderConfig();

  // Resize image if too large to avoid API limits
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Check image size (base64 length * 0.75 ≈ bytes)
  const estimatedSize = base64.length * 0.75;
  if (estimatedSize > 20 * 1024 * 1024) { // 20MB limit
    throw new Error('图片太大，请选择小于20MB的图片');
  }

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'low'
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

敏感信息检测：检查图中是否包含以下类型的敏感信息，返回检测到的类型数组：
- id_card: 身份证、护照、驾驶证等证件号码
- bank_card: 银行卡号、信用卡号
- phone: 电话号码
- chat_record: 聊天记录、对话内容
- password: 密码、验证码、PIN码
- private_photo: 私密照片、不雅内容

示例输出：
{
  "raw_text": "识别图中所有文字内容",
  "summary": "1-2句中文摘要，概括这张截图的用途和关键信息",
  "category": "美食|购物|旅行|聊天|学习|健身|灵感|待办 中选一个",
  "tags": ["标签1", "标签2", "标签3"],
  "city": "如果图中提到城市名则提取，否则null",
  "importance_score": 65,
  "sensitive_flags": ["phone", "chat_record"]
}

如果没有检测到敏感信息，sensitive_flags 返回空数组 []`,
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
    throw new Error(`${config.name} API错误: ${response.status} ${err}`);
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

    // Ensure importance_score exists and is within valid range (0-100)
    if (typeof parsed.importance_score !== 'number') {
      parsed.importance_score = 50;
    } else {
      parsed.importance_score = Math.max(0, Math.min(100, parsed.importance_score));
    }
    return parsed;
  } catch (e) {
    console.error('JSON解析失败:', cleanJson);
    return {
      raw_text: '',
      summary: '无法解析AI返回结果',
      category: '待办',
      tags: [],
      city: null,
      importance_score: 50,
      sensitive_flags: [],
    };
  }
}
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la services/ai/vision.ts`
Expected: 文件存在

- [ ] **Step 3: 提交**

```bash
git add services/ai/vision.ts
git commit -m "feat: 添加视觉分析模块"
```

---

## Task 4: 创建向量嵌入模块

**Files:**
- Create: `services/ai/embedding.ts`

- [ ] **Step 1: 创建向量嵌入模块**

```typescript
// services/ai/embedding.ts
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
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la services/ai/embedding.ts`
Expected: 文件存在

- [ ] **Step 3: 提交**

```bash
git add services/ai/embedding.ts
git commit -m "feat: 添加向量嵌入模块"
```

---

## Task 5: 创建统一入口和配置获取函数

**Files:**
- Create: `services/ai/index.ts`

- [ ] **Step 1: 在 config.ts 中添加配置获取函数**

在 `services/ai/config.ts` 末尾添加：

```typescript
// 添加到 config.ts 末尾

import { getProviderApiKey } from './storage';

export interface ProviderConfigWithKey extends ProviderConfig {
  apiKey: string;
}

// 获取当前厂商的完整配置（包含 API Key）
export async function getCurrentProviderConfig(): Promise<ProviderConfigWithKey> {
  const provider = await (await import('./storage')).getCurrentProvider();
  const apiKey = await getProviderApiKey(provider);

  return {
    ...PROVIDER_CONFIGS[provider],
    apiKey,
  };
}
```

- [ ] **Step 2: 创建统一入口文件**

```typescript
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
```

- [ ] **Step 3: 验证文件创建**

Run: `ls -la services/ai/index.ts`
Expected: 文件存在

- [ ] **Step 4: 提交**

```bash
git add services/ai/config.ts services/ai/index.ts
git commit -m "feat: 添加统一入口和配置获取函数"
```

---

## Task 6: 更新旧 ai.ts 以向后兼容

**Files:**
- Modify: `services/ai.ts`

- [ ] **Step 1: 修改 ai.ts 为转发层**

```typescript
// services/ai.ts
// 向后兼容：将旧的导出转发到新模块

export * from './ai/index';
```

- [ ] **Step 2: 验证修改**

Run: `head -5 services/ai.ts`
Expected: 看到 `export * from './ai/index';`

- [ ] **Step 3: 提交**

```bash
git add services/ai.ts
git commit -m "refactor: 将 ai.ts 改为转发层以保持向后兼容"
```

---

## Task 7: 更新 Store 结构

**Files:**
- Modify: `store/useStore.ts`

- [ ] **Step 1: 添加厂商配置相关类型和状态**

在 `store/useStore.ts` 中：

1. 首先添加导入：
```typescript
// 在文件顶部添加
import type { AIProvider } from '../services/ai/config';
import type { ProviderKeys } from '../services/ai/storage';
```

2. 修改 `AppState` 接口：
```typescript
interface AppState {
  // Data state
  screenshots: Screenshot[];

  // 厂商配置
  currentProvider: AIProvider;
  providerKeys: ProviderKeys;

  // 移除旧的 apiKey，使用 providerKeys 替代
  // apiKey: string;  // <-- 删除这行

  recentSearches: string[];

  // Actions
  loadInitialData: () => Promise<void>;

  // 新增厂商相关操作
  setCurrentProvider: (provider: AIProvider) => Promise<void>;
  setProviderKey: (provider: AIProvider, apiKey: string | null) => Promise<void>;

  setScreenshots: (screenshots: Screenshot[]) => void;
  addScreenshots: (newScreenshots: Screenshot[]) => void;
  removeScreenshot: (id: string) => void;
  clearAllScreenshots: () => void;

  // 移除旧的 setApiKey
  // setApiKey: (key: string) => Promise<void>;  // <-- 删除这行

  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}
```

3. 修改状态初始值：
```typescript
persist(
  (set, get) => ({
    // Initial state
    screenshots: [],

    // 厂商配置初始值
    currentProvider: 'dashscope',
    providerKeys: {
      openai: null,
      dashscope: null,
      zhipu: null,
      deepseek: null,
      openrouter: null,
    },

    recentSearches: [],
```

4. 替换 `setApiKey` 实现：
```typescript
    // 保存当前选中的厂商
    setCurrentProvider: async (provider) => {
      try {
        const { setCurrentProvider: setProvider } = await import('../services/ai/storage');
        await setProvider(provider);
        set({ currentProvider: provider });
      } catch (error) {
        console.error('Failed to set current provider:', error);
        throw error;
      }
    },

    // 保存厂商 API Key
    setProviderKey: async (provider, apiKey) => {
      try {
        const { setProviderApiKey } = await import('../services/ai/storage');
        await setProviderApiKey(provider, apiKey);

        set((state) => ({
          providerKeys: {
            ...state.providerKeys,
            [provider]: apiKey,
          },
        }));
      } catch (error) {
        console.error('Failed to save provider API key:', error);
        throw error;
      }
    },
```

5. 移除旧的 `setApiKey` 实现（如果有）

- [ ] **Step 2: 验证修改**

Run: `grep -n "currentProvider\|providerKeys\|setCurrentProvider\|setProviderKey" store/useStore.ts`
Expected: 看到新增的类型和状态定义

- [ ] **Step 3: 提交**

```bash
git add store/useStore.ts
git commit -m "refactor: 更新 Store 支持多厂商配置"
```

---

## Task 8: 更新 persist 存储

**Files:**
- Modify: `store/persist.ts`（如果需要）
- Modify: `store/useStore.ts`

- [ ] **Step 1: 更新 persist 配置**

在 `store/useStore.ts` 中，修改 `persist` 配置的 `partialize` 函数：

```typescript
    {
      name: 'snapmind-storage',
      storage: createJSONStorage(() => storageAdapter),
      // 只持久化厂商配置和 recentSearches
      partialize: (state) => ({
        currentProvider: state.currentProvider,
        providerKeys: state.providerKeys,
        recentSearches: state.recentSearches,
      }),
    }
```

- [ ] **Step 2: 验证修改**

Run: `grep -A5 "partialize" store/useStore.ts`
Expected: 看到 currentProvider 和 providerKeys 在持久化配置中

- [ ] **Step 3: 提交**

```bash
git add store/useStore.ts
git commit -m "fix: 更新 persist 配置以持久化厂商设置"
```

---

## Task 9: 在 App 启动时执行数据迁移

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: 添加数据迁移调用**

在 `app/_layout.tsx` 的 useEffect 或适当位置添加迁移调用：

```typescript
// 添加导入
import { migrateApiKeyIfNecessary } from '../services/ai';

// 在 RootLayout 组件中添加
export default function RootLayout() {
  // ... 现有代码

  useEffect(() => {
    // 执行数据迁移
    migrateApiKeyIfNecessary().catch(err => {
      console.error('Failed to migrate API key:', err);
    });
  }, []);

  // ... 现有代码
}
```

- [ ] **Step 2: 验证修改**

Run: `grep "migrateApiKeyIfNecessary" app/_layout.tsx`
Expected: 看到迁移调用

- [ ] **Step 3: 提交**

```bash
git add app/_layout.tsx
git commit -m "feat: 添加 App 启动时的数据迁移"
```

---

## Task 10: 改造设置页面 UI - 厂商选择器

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: 添加厂商选择器 UI**

在设置页面的"智能引擎"部分，替换原有的 API Key 输入区域：

```typescript
// 添加导入
import { Picker } from '@react-native-picker/picker'; // 或使用其他下拉组件
import { PROVIDER_CONFIGS, type AIProvider } from '../../services/ai/config';

// 在 SettingsScreen 组件中添加状态
const [showProviderPicker, setShowProviderPicker] = useState(false);

const currentProvider = useStore(state => state.currentProvider);
const providerKeys = useStore(state => state.providerKeys);
const setCurrentProvider = useStore(state => state.setCurrentProvider);
const setProviderKey = useStore(state => state.setProviderKey);

// 厂商显示信息
const providerList: (AIProvider & { displayName: string })[] = [
  { id: 'openai', displayName: 'OpenAI' },
  { id: 'dashscope', displayName: '阿里云百炼' },
  { id: 'zhipu', displayName: '智谱GLM' },
  { id: 'deepseek', displayName: 'DeepSeek' },
  { id: 'openrouter', displayName: 'OpenRouter' },
];

// 渲染厂商选择器
< GlassCard style={styles.apiCard}>
  <View style={styles.apiHeader}>
    <Ionicons name="server" size={20} color={colors.primary} />
    <Text style={[styles.apiTitle, { color: colors.onSurface }]}>当前使用厂商</Text>
  </View>

  <TouchableOpacity
    style={[styles.providerSelector, { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceContainerHigh }]}
    onPress={() => setShowProviderPicker(true)}
  >
    <Text style={[styles.providerSelectorText, { color: colors.onSurface }]}>
      {PROVIDER_CONFIGS[currentProvider].name}
    </Text>
    <Ionicons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
  </TouchableOpacity>
</GlassCard>

// 厂商选择器 Modal
<Modal
  visible={showProviderPicker}
  transparent
  animationType="slide"
  onRequestClose={() => setShowProviderPicker(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.modalTitle, { color: colors.onSurface }]}>选择 AI 厂商</Text>

      {providerList.map((provider) => (
        <TouchableOpacity
          key={provider.id}
          style={[
            styles.providerOption,
            currentProvider === provider.id && { backgroundColor: colors.primaryContainer },
          ]}
          onPress={async () => {
            await setCurrentProvider(provider.id);
            setShowProviderPicker(false);
            setInputValue(providerKeys[provider.id] || '');
          }}
        >
          <Text
            style={[
              styles.providerOptionText,
              { color: currentProvider === provider.id ? colors.primary : colors.onSurface },
            ]}
          >
            {provider.displayName}
          </Text>
          {currentProvider === provider.id && (
            <Ionicons name="checkmark" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.modalCancelButton, { backgroundColor: colors.surfaceVariant }]}
        onPress={() => setShowProviderPicker(false)}
      >
        <Text style={[styles.modalCancelText, { color: colors.onSurface }]}>取消</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

- [ ] **Step 2: 添加样式**

```typescript
// 添加到 StyleSheet
const styles = StyleSheet.create({
  // ... 现有样式

  providerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
  },
  providerSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: borderRadius['2xl'],
    marginBottom: 8,
  },
  providerOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCancelButton: {
    paddingVertical: 16,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: 验证修改**

Run: `grep -n "providerSelector\|showProviderPicker" app/(tabs)/settings.tsx`
Expected: 看到新增的厂商选择器代码

- [ ] **Step 4: 提交**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat: 添加厂商选择器 UI"
```

---

## Task 11: 改造设置页面 UI - API Key 配置列表

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: 添加厂商 API Key 配置列表**

在厂商选择器下方添加 API Key 配置列表：

```typescript
// 在设置页面中添加厂商列表渲染
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>API Key 配置</Text>

  <GlassCard style={styles.providerListCard}>
    {providerList.map((provider) => {
      const isConfigured = !!providerKeys[provider.id];
      const isSelected = currentProvider === provider.id;

      return (
        <TouchableOpacity
          key={provider.id}
          style={[
            styles.providerListItem,
            isSelected && { backgroundColor: colors.primaryContainer + '20' },
          ]}
          onPress={() => {
            setCurrentProvider(provider.id);
            setInputValue(providerKeys[provider.id] || '');
          }}
        >
          <View style={styles.providerListItemLeft}>
            <View
              style={[
                styles.providerStatusDot,
                { backgroundColor: isConfigured ? colors.success : colors.surfaceContainerHigh },
              ]}
            />
            <Text style={[styles.providerListItemName, { color: colors.onSurface }]}>
              {provider.displayName}
            </Text>
            {isConfigured && (
              <Text style={[styles.providerListStatus, { color: colors.success }]}>已配置</Text>
            )}
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    })}
  </GlassCard>

  // API Key 输入框（显示当前选中厂商的 Key）
  <View style={[styles.apiInputRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceContainerHigh }]}>
    <TextInput
      style={[styles.apiInput, { color: colors.onSurface }]}
      value={inputValue}
      onChangeText={setInputValue}
      placeholder={`输入 ${PROVIDER_CONFIGS[currentProvider].name} 的 API 密钥`}
      placeholderTextColor={colors.onSurfaceVariant}
      secureTextEntry={!showKey}
      autoCapitalize="none"
    />
    <TouchableOpacity onPress={() => setShowKey(!showKey)}>
      <Ionicons
        name={showKey ? 'eye-off' : 'eye'}
        size={20}
        color={colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  </View>

  <TouchableOpacity
    onPress={() => handleSaveKey()}
    style={[styles.saveKeyBtn, { backgroundColor: colors.primary }]}
  >
    <Text style={styles.saveKeyBtnText}>保存 {PROVIDER_CONFIGS[currentProvider].name} API Key</Text>
  </TouchableOpacity>

  <Text style={[styles.apiHint, { color: colors.onSurfaceVariant }]}>
    💡 一个 API Key 可同时用于视觉分析和向量搜索
  </Text>
</View>
```

- [ ] **Step 2: 更新保存函数**

```typescript
// 修改 handleSaveKey 函数
const handleSaveKey = async () => {
  await setProviderKey(currentProvider, inputValue.trim());
  Alert.alert('成功', `${PROVIDER_CONFIGS[currentProvider].name} API Key 已保存`);
};
```

- [ ] **Step 3: 添加样式**

```typescript
// 添加到 StyleSheet
providerListCard: {
  paddingVertical: 8,
  marginBottom: 16,
},
providerListItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: borderRadius['2xl'],
},
providerListItemLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
providerStatusDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
},
providerListItemName: {
  fontSize: 16,
  fontWeight: '500',
},
providerListStatus: {
  fontSize: 12,
  fontWeight: '500',
  marginLeft: 4,
},
```

- [ ] **Step 4: 验证修改**

Run: `grep -n "providerListItem\|handleSaveKey" app/(tabs)/settings.tsx`
Expected: 看到新增的厂商列表代码

- [ ] **Step 5: 提交**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat: 添加厂商 API Key 配置列表"
```

---

## Task 12: 测试数据迁移

**Files:**
- No files changed

- [ ] **Step 1: 测试旧用户迁移场景**

1. 设置一个旧的 API Key（模拟老用户）：
```bash
# 在运行的应用中，在设置中输入一个 API Key
```

2. 重启应用
3. 验证：
   - API Key 被迁移到 `providerKeys.dashscope`
   - `currentProvider` 被设置为 `dashscope`
   - 应用功能正常

- [ ] **Step 2: 测试新用户场景**

1. 清除应用数据
2. 启动应用
3. 验证：
   - `currentProvider` 默认为 `dashscope`
   - `providerKeys` 所有值为 `null`
   - 设置页面显示正确

- [ ] **Step 3: 验证迁移日志**

检查控制台是否有迁移日志：
```
[AI] API Key 已迁移到新格式
```

- [ ] **Step 4: 创建测试标记文件**

```bash
# 创建测试标记（可选）
touch .migration-tested
```

- [ ] **Step 5: 提交**

```bash
git add .migration-tested 2>/dev/null || true
git commit -m "test: 验证数据迁移功能"
```

---

## Task 13: 测试厂商切换

**Files:**
- No files changed

- [ ] **Step 1: 测试厂商选择器**

1. 打开设置页面
2. 点击"当前使用厂商"下拉框
3. 选择不同厂商
4. 验证：
   - Modal 正确显示
   - 选择后 Modal 关闭
   - 当前厂商更新
   - API Key 输入框切换到对应厂商

- [ ] **Step 2: 测试多厂商配置**

1. 配置多个厂商的 API Key（例如 OpenAI 和阿里云）
2. 验证：
   - 厂商列表显示"已配置"状态
   - 切换厂商时输入框显示对应的 API Key
   - 配置状态持久化

- [ ] **Step 3: 测试 API 切换**

1. 配置 OpenAI API Key
2. 导入截图
3. 验证视觉分析使用 OpenAI
4. 切换到阿里云
5. 导入截图
6. 验证视觉分析使用阿里云

- [ ] **Step 4: 提交**

```bash
git commit --allow-empty -m "test: 验证厂商切换功能"
```

---

## Task 14: 集成测试 - 端到端验证

**Files:**
- No files changed

- [ ] **Step 1: 完整功能测试**

测试场景：
1. 新用户首次使用 → 选择厂商 → 配置 API Key → 导入截图 → 搜索
2. 老用户升级 → 自动迁移 → 继续使用
3. 切换厂商 → 重新配置 Key → 验证功能

- [ ] **Step 2: 错误处理测试**

1. 无效 API Key → 验证错误提示
2. 网络错误 → 验证错误提示
3. 未配置厂商 → 验证提示信息

- [ ] **Step 3: 边界测试**

1. 空 API Key
2. 切换到未配置的厂商
3. 快速切换厂商

- [ ] **Step 4: 提交**

```bash
git commit --allow-empty -m "test: 完成集成测试"
```

---

## Task 15: 清理和优化

**Files:**
- Modify: Multiple

- [ ] **Step 1: 移除未使用的代码**

检查并移除：
- 旧的 `apiKey` 相关代码（如果还有残留）
- 未使用的导入
- 注释掉的代码

- [ ] **Step 2: 添加代码注释**

在关键位置添加注释：
- 配置迁移逻辑
- 厂商切换逻辑
- API 调用流程

- [ ] **Step 3: 验证 TypeScript 类型**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: 清理代码和添加注释"
```

---

## 完成

所有任务完成后，应用应支持：

1. ✅ 五个厂商配置（OpenAI、阿里云、智谱、DeepSeek、OpenRouter）
2. ✅ 用户选择厂商并输入 API Key
3. ✅ 老用户自动迁移，无感知升级
4. ✅ 统一 1024 维向量
5. ✅ 清晰的错误提示
6. ✅ 配置持久化
