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

function createEmptyProviderKeys(): ProviderKeys {
  return {
    openai: null,
    dashscope: null,
    zhipu: null,
    deepseek: null,
    openrouter: null,
  };
}

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

export async function setCurrentProvider(provider: AIProvider): Promise<void> {
  if (isWeb) {
    localStorage.setItem(CURRENT_PROVIDER_KEY, provider);
  } else {
    const fileUri = `${FileSystem.documentDirectory}${CURRENT_PROVIDER_KEY}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, provider);
  }
}

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

export async function setProviderKeys(keys: ProviderKeys): Promise<void> {
  await storageAdapter.setItem(PROVIDER_KEYS_KEY, JSON.stringify(keys));
}

export async function getProviderApiKey(provider: AIProvider): Promise<string> {
  const providerKeys = await getProviderKeys();
  const key = providerKeys[provider];

  if (key) {
    return key;
  }

  const oldKey = await storageAdapter.getItem(LEGACY_API_KEY_KEY);
  if (oldKey) {
    if (provider === 'dashscope') {
      return oldKey;
    }
    throw new Error(`请先配置 ${PROVIDER_CONFIGS[provider].name} 的 API Key`);
  }

  throw new Error(`${PROVIDER_CONFIGS[provider].name} 未配置 API Key`);
}

export async function setProviderApiKey(provider: AIProvider, apiKey: string | null): Promise<void> {
  const keys = await getProviderKeys();
  keys[provider] = apiKey;
  await setProviderKeys(keys);
}

export async function migrateApiKeyIfNecessary(): Promise<void> {
  const oldKey = await storageAdapter.getItem(LEGACY_API_KEY_KEY);
  const existingKeys = await storageAdapter.getItem(PROVIDER_KEYS_KEY);

  if (oldKey && !existingKeys) {
    const keys: ProviderKeys = createEmptyProviderKeys();
    keys.dashscope = oldKey;

    await setProviderKeys(keys);
    await setCurrentProvider('dashscope');

    console.log('[AI] API Key 已迁移到新格式');
  }
}