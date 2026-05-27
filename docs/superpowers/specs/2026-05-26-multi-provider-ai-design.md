# 多厂商 AI 服务支持设计文档

**日期**: 2026-05-26
**状态**: 设计中
**作者**: Claude Code

## 概述

将 SnapMind 的 AI 服务从单一的阿里云百炼集成扩展为支持多个主流 AI 厂商，用户只需选择厂商并输入 API Key 即可使用。

## 背景

当前实现硬编码使用阿里云百炼（Dashscope）的 API：
- Vision 模型：`qwen-vl-plus`
- Embedding 模型：`text-embedding-v3`
- API Endpoint：`https://dashscope.aliyuncs.com/compatible-mode/v1`

用户需求：
- 支持多个主流 AI 厂商
- 统一的 API Key 配置体验
- 一个 API Key 同时支持视觉分析和向量搜索

## 设计目标

1. **易用性**：用户只需选择厂商 + 输入 API Key
2. **兼容性**：老用户自动迁移，无感知升级
3. **可扩展性**：新增厂商只需添加配置
4. **数据一致性**：统一向量维度，避免重新生成

## 支持的厂商

| 厂商 | API Base URL | Vision 模型 | Embedding 模型 | 向量维度 |
|------|-------------|-------------|----------------|----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | `text-embedding-3-small` | 1024 |
| 阿里云百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-vl-plus` | `text-embedding-v3` | 1024 |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4v-plus` | `embedding-3` | 1024 |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-vl-chat` | `deepseek-embedding` | 1024* |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` | `openai/text-embedding-3-small` | 1024 |

*DeepSeek embedding 维度需测试确认

## 架构设计

### 数据结构

```typescript
// 厂商类型
type AIProvider =
  | 'openai'
  | 'dashscope'
  | 'zhipu'
  | 'deepseek'
  | 'openrouter';

// 厂商预设配置
interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiBaseUrl: string;
  visionModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

// 用户保存的配置
interface ProviderKeys {
  openai: string | null;
  dashscope: string | null;
  zhipu: string | null;
  deepseek: string | null;
  openrouter: string | null;
}
```

### Store 结构

```typescript
interface AppState {
  // 当前选中的厂商
  currentProvider: AIProvider;

  // 已配置的厂商 API Key 映射
  providerKeys: ProviderKeys;

  // Actions
  setCurrentProvider: (provider: AIProvider) => void;
  setProviderKey: (provider: AIProvider, apiKey: string | null) => Promise<void>;
}
```

### 服务层结构

```
services/
├── ai/
│   ├── config.ts          # 厂商预设配置常量
│   ├── storage.ts         # API Key 存储管理
│   ├── vision.ts          # 视觉分析功能
│   ├── embedding.ts       # 向量生成和搜索
│   └── index.ts           # 统一导出
└── ai.ts                  # 保留（向后兼容）
```

## UI 设计

### 设置页面改造

```
┌─────────────────────────────────────┐
│ 智能引擎                             │
├─────────────────────────────────────┤
│                                     │
│  当前使用厂商                        │
│  ┌────────────────────────────────┐ │
│  │ 🤖 OpenAI                    ▼ │ │
│  └────────────────────────────────┘ │
│                                     │
│  API Key 配置                        │
│  ┌────────────────────────────────┐ │
│  │ ● OpenAI          已配置        │ │
│  │ ○ 阿里云百炼                     │ │
│  │ ○ 智谱GLM                       │ │
│  │ ○ DeepSeek                     │ │
│  │ ○ OpenRouter                   │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ sk-proj-xxx      👁️   [保存]    │ │
│  └────────────────────────────────┘ │
│                                     │
│  💡 一个 API Key 可同时用于         │
│     视觉分析和向量搜索               │
└─────────────────────────────────────┘
```

### 交互流程

1. 用户从下拉菜单选择厂商
2. 下方列表高亮当前厂商
3. 输入框显示该厂商的 API Key（已配置则自动填充）
4. 点击保存，存储到对应厂商的配置槽位
5. 切换厂商时，输入框自动切换到对应 API Key

## API 调用流程

### 获取当前配置

```typescript
async function getCurrentProviderConfig(): Promise<ProviderConfig & { apiKey: string }> {
  const provider = await getCurrentProvider();
  const apiKey = await getProviderApiKey(provider);
  return {
    ...PROVIDER_CONFIGS[provider],
    apiKey,
  };
}
```

### 视觉分析

```typescript
export async function analyzeScreenshot(imageUri: string): Promise<AnalysisResult> {
  const config = await getCurrentProviderConfig();

  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.visionModel,
      messages: [{ role: 'user', content: [...] }],
    }),
  });

  // ... 错误处理和响应解析
}
```

### 向量生成

```typescript
export async function getEmbedding(text: string): Promise<number[]> {
  const config = await getCurrentProviderConfig();

  const body: any = {
    model: config.embeddingModel,
    input: text,
  };

  // OpenAI/OpenRouter 支持降维参数
  if (config.id === 'openai' || config.id === 'openrouter') {
    body.dimensions = config.embeddingDimensions;
  }

  const response = await fetch(`${config.apiBaseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // ... 错误处理和响应解析
}
```

## 数据迁移方案

### 迁移逻辑

App 启动时执行一次迁移：

```typescript
async function migrateApiKeyIfNecessary() {
  const oldApiKey = await storageAdapter.getItem('snapmind_api_key');

  if (oldApiKey && !storageAdapter.getItem('provider_keys')) {
    // 将现有 API Key 迁移到阿里云百炼
    const providerKeys: ProviderKeys = {
      dashscope: oldApiKey,  // 当前使用阿里云
      openai: null,
      zhipu: null,
      deepseek: null,
      openrouter: null,
    };

    await storageAdapter.setItem('provider_keys', JSON.stringify(providerKeys));
    await storageAdapter.setItem('current_provider', 'dashscope');
  }
}
```

### 向后兼容

```typescript
async function getProviderApiKey(provider: AIProvider): Promise<string> {
  const providerKeysStr = await storageAdapter.getItem('provider_keys');

  if (providerKeysStr) {
    // 新格式
    const keys = JSON.parse(providerKeysStr);
    const key = keys[provider];
    if (!key) {
      throw new Error(`${PROVIDER_CONFIGS[provider].name} 未配置 API Key`);
    }
    return key;
  } else {
    // 旧格式：假设是阿里云
    const oldKey = await storageAdapter.getItem('snapmind_api_key');
    if (oldKey) {
      if (provider !== 'dashscope') {
        throw new Error(`请先配置 ${PROVIDER_CONFIGS[provider].name} 的 API Key`);
      }
      return oldKey;
    }
    throw new Error('请先配置 API Key');
  }
}
```

## 错误处理

### 统一错误类

```typescript
class AIProviderError extends Error {
  constructor(
    provider: AIProvider,
    action: 'vision' | 'embedding',
    originalError: unknown
  ) {
    const providerName = PROVIDER_CONFIGS[provider].name;
    const actionName = action === 'vision' ? '视觉分析' : '向量生成';

    let message = `${providerName} ${actionName}失败`;

    // 解析常见错误
    if (originalError instanceof Error) {
      if (originalError.message.includes('401')) {
        message = `${providerName} API Key 无效或已过期`;
      } else if (originalError.message.includes('429')) {
        message = `${providerName} API 调用频率超限`;
      } else if (originalError.message.includes('timeout')) {
        message = `${providerName} API 请求超时`;
      }
    }

    super(message);
    this.name = 'AIProviderError';
  }
}
```

## 测试策略

### 单元测试

- 验证所有厂商配置完整性
- 测试数据迁移逻辑
- 测试向后兼容逻辑

### 集成测试

- 使用 mock server 验证各厂商 API 请求格式
- 测试切换厂商后的功能正常性

## 实施计划

1. 创建厂商配置结构
2. 重构 AI 服务层
3. 改造设置页面 UI
4. 实现数据迁移
5. 增强错误处理
6. 编写测试

## 风险与注意事项

1. **DeepSeek embedding 维度**：需要测试确认是否支持 1024 维
2. **智谱 API 格式**：需要验证是否完全兼容 OpenAI 格式
3. **向量存储**：确保现有 embedding 数据不受影响
