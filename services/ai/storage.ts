import { storageAdapter } from '../../store/persist';
import { useStore } from '../../store/useStore';
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

let hydrationPromise: Promise<void> | null = null;

async function ensureStore(forceRehydrate = false) {
  if (forceRehydrate && useStore.persist.hasHydrated()) {
    console.log('[AI Storage] Force rehydrating...');
    try {
      if (typeof useStore.persist.rehydrate === 'function') {
        await useStore.persist.rehydrate();
        console.log('[AI Storage] Rehydrate complete');
      } else {
        // Fallback: manually read from storage and update store
        const stored = await storageAdapter.getItem('snapmind-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          const storedState = parsed?.state;
          if (storedState) {
            console.log('[AI Storage] Manually restoring state from storage');
            useStore.setState(storedState);
          }
        }
      }
    } catch (e) {
      console.error('[AI Storage] Force rehydrate failed:', e);
    }
  }

  if (!hydrationPromise) {
    if (useStore.persist.hasHydrated()) {
      hydrationPromise = Promise.resolve();
      console.log('[AI Storage] Hydration already complete, using resolved promise');
    } else {
      console.log('[AI Storage] Waiting for hydration...');
      hydrationPromise = new Promise<void>((resolve) => {
        const unsub = useStore.persist.onFinishHydration(() => {
          console.log('[AI Storage] Hydration finished');
          unsub();
          resolve();
        });
      });
    }
  }
  await hydrationPromise;
  const state = useStore.getState();
  console.log('[AI Storage] Current provider:', state.currentProvider, 'API key present:', !!state.providerKeys[state.currentProvider]);
  return state;
}

export async function getCurrentProvider(): Promise<AIProvider> {
  const state = await ensureStore();
  return state.currentProvider as AIProvider;
}

export async function setCurrentProvider(provider: AIProvider): Promise<void> {
  useStore.setState({ currentProvider: provider });
}

export async function getProviderKeys(): Promise<ProviderKeys> {
  const state = await ensureStore();
  return state.providerKeys;
}

export async function setProviderKeys(keys: ProviderKeys): Promise<void> {
  try {
    useStore.setState({ providerKeys: keys });
  } catch (e) {
    console.error('[AI Storage] Failed to update store with provider keys:', e);
  }
}

export async function getProviderApiKey(provider: AIProvider): Promise<string> {
  const state = await ensureStore();
  const providerKeys = state.providerKeys;
  const key = providerKeys[provider];

  if (key) {
    return key;
  }

  // Fallback: read directly from storage in case Zustand store state is stale
  // This can happen on first install when persist middleware hasn't fully synced
  try {
    const stored = await storageAdapter.getItem('snapmind-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const storedKeys = parsed?.state?.providerKeys;
      if (storedKeys?.[provider]) {
        // Sync back to in-memory store
        useStore.setState({ providerKeys: storedKeys });
        return storedKeys[provider];
      }
    }
  } catch (e) {
    console.error('[AI Storage] Fallback storage read failed:', e);
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
  const state = useStore.getState();
  const newKeys = {
    ...state.providerKeys,
    [provider]: apiKey,
  };
  useStore.setState({ providerKeys: newKeys });
}

export async function getCurrentProviderConfig(): Promise<ProviderConfigWithKey> {
  let state = await ensureStore();
  const provider = state.currentProvider as AIProvider;
  let apiKey = state.providerKeys[provider];

  console.log('[AI Storage] getCurrentProviderConfig - provider:', provider, 'apiKey from store:', !!apiKey);

  // Fallback: read directly from storage if key not in store memory
  if (!apiKey) {
    console.log('[AI Storage] API key not in store, attempting force rehydrate...');
    // Force rehydrate to get latest from storage
    state = await ensureStore(true);
    apiKey = state.providerKeys[provider];

    if (apiKey) {
      console.log('[AI Storage] API key found after force rehydrate!');
    }
  }

  if (!apiKey) {
    console.log('[AI Storage] Still no API key after rehydrate, reading file directly...');
    try {
      const stored = await storageAdapter.getItem('snapmind-storage');
      console.log('[AI Storage] File exists:', !!stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedKeys = parsed?.state?.providerKeys;
        console.log('[AI Storage] Keys from file:', storedKeys);
        if (storedKeys?.[provider]) {
          apiKey = storedKeys[provider];
          console.log('[AI Storage] Found API key in file, syncing to store...');
          // Sync back to in-memory store
          useStore.setState({ providerKeys: storedKeys });
        }
      }
    } catch (e) {
      console.error('[AI Storage] Fallback storage read failed:', e);
    }
  }

  if (!apiKey) {
    const config = PROVIDER_CONFIGS[provider as AIProvider];
    console.error('[AI Storage] API key not found anywhere for provider:', provider);
    throw new Error(`${config.name} 未配置 API Key`);
  }

  const config = PROVIDER_CONFIGS[provider as AIProvider];
  console.log('[AI Storage] Returning config for', config.name, 'with API key');
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