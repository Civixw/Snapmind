import { storageAdapter } from '../../store/persist';
import type { AIProvider, ProviderConfigWithKey } from './config';
import { PROVIDER_CONFIGS } from './config';

export interface ProviderKeys {
  openai: string | null;
  dashscope: string | null;
  zhipu: string | null;
  deepseek: string | null;
  openrouter: string | null;
}

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

// Lazy import to avoid circular dependency
// @ts-ignore - Dynamic import works in React Native runtime
let getStoreState: () => import('../../store/useStore').AppState | null = null;

async function ensureStore() {
  if (!getStoreState) {
    // @ts-ignore - Dynamic import works in React Native runtime
    const storeModule = await import('../../store/useStore');
    getStoreState = () => storeModule.useStore.getState();
  }
  return getStoreState();
}

export async function getCurrentProvider(): Promise<AIProvider> {
  const state = await ensureStore();
  return state.currentProvider as AIProvider;
}

export async function setCurrentProvider(provider: AIProvider): Promise<void> {
  // @ts-ignore - Dynamic import works in React Native runtime
  const storeModule = await import('../../store/useStore');
  // Use setState to update without calling the action
  storeModule.useStore.setState({ currentProvider: provider });
}

export async function getProviderKeys(): Promise<ProviderKeys> {
  const state = await ensureStore();
  return state.providerKeys;
}

export async function setProviderKeys(keys: ProviderKeys): Promise<void> {
  await storageAdapter.setItem(PROVIDER_KEYS_KEY, JSON.stringify(keys));
}

export async function getProviderApiKey(provider: AIProvider): Promise<string> {
  const state = await ensureStore();
  const providerKeys = state.providerKeys;
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
  // @ts-ignore - Dynamic import works in React Native runtime
  const storeModule = await import('../../store/useStore');
  const state = storeModule.useStore.getState();
  // Use setState to update without calling the action
  storeModule.useStore.setState({
    providerKeys: {
      ...state.providerKeys,
      [provider]: apiKey,
    },
  });
}

export async function getCurrentProviderConfig(): Promise<ProviderConfigWithKey> {
  const state = await ensureStore();
  const provider = state.currentProvider as AIProvider;
  const apiKey = state.providerKeys[provider];

  if (!apiKey) {
    const config = PROVIDER_CONFIGS[provider as AIProvider];
    throw new Error(`${config.name} 未配置 API Key`);
  }

  const config = PROVIDER_CONFIGS[provider as AIProvider];
  return {
    ...config,
    apiKey,
  };
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