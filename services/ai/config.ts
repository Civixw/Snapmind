import { getProviderApiKey, getCurrentProvider } from './storage';

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

export interface ProviderConfigWithKey extends ProviderConfig {
  apiKey: string;
}

// 获取当前厂商的完整配置（包含 API Key）
export async function getCurrentProviderConfig(): Promise<ProviderConfigWithKey> {
  const provider = await getCurrentProvider();
  const apiKey = await getProviderApiKey(provider);

  return {
    ...PROVIDER_CONFIGS[provider],
    apiKey,
  };
}