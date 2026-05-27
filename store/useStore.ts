// store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Screenshot, getAllScreenshots } from '../services/database';
import { storageAdapter } from './persist';
import type { AIProvider } from '../services/ai/config';
import type { ProviderKeys } from '../services/ai/storage';
import { setCurrentProvider as setProvider, setProviderApiKey } from '../services/ai/storage';

interface AppState {
  // Data state
  screenshots: Screenshot[];
  currentProvider: AIProvider;
  providerKeys: ProviderKeys;
  recentSearches: string[];

  // Actions
  loadInitialData: () => Promise<void>;
  setScreenshots: (screenshots: Screenshot[]) => void;
  addScreenshots: (newScreenshots: Screenshot[]) => void;
  removeScreenshot: (id: string) => void;
  clearAllScreenshots: () => void;
  setCurrentProvider: (provider: AIProvider) => Promise<void>;
  setProviderKey: (provider: AIProvider, apiKey: string | null) => Promise<void>;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      screenshots: [],
      currentProvider: 'dashscope',
      providerKeys: {
        openai: null,
        dashscope: null,
        zhipu: null,
        deepseek: null,
        openrouter: null,
      },
      recentSearches: [],

      // Load initial data from database
      loadInitialData: async () => {
        try {
          // Load screenshots from database
          const screenshots = await getAllScreenshots();

          // Update screenshots state
          set({ screenshots });
        } catch (error) {
          console.error('Failed to load initial data:', error);
          // Use default values on error
          set({ screenshots: [] });
        }
      },

      // Replace all screenshots
      setScreenshots: (screenshots) => {
        set({ screenshots });
      },

      // Add new screenshots (for import)
      addScreenshots: (newScreenshots) => {
        set((state) => ({
          screenshots: [...newScreenshots, ...state.screenshots],
        }));
      },

      // Remove a single screenshot
      removeScreenshot: (id) => {
        set((state) => ({
          screenshots: state.screenshots.filter((s) => s.id !== id),
        }));
      },

      // Clear all screenshots
      clearAllScreenshots: () => {
        set({ screenshots: [] });
      },

      // Set current AI provider
      setCurrentProvider: async (provider) => {
        try {
          await setProvider(provider);
          set({ currentProvider: provider });
        } catch (error) {
          console.error('Failed to set current provider:', error);
          throw error;
        }
      },

      // Set provider API key
      setProviderKey: async (provider, apiKey) => {
        try {
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

      // Add a recent search
      addRecentSearch: (query) => {
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;

          // Remove duplicates and add to front, keep max 10
          const filtered = state.recentSearches.filter((s) => s !== trimmed);
          return {
            recentSearches: [trimmed, ...filtered].slice(0, 10),
          };
        });
      },

      // Clear all recent searches
      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },
    }),
    {
      name: 'snapmind-storage',
      storage: createJSONStorage(() => storageAdapter),
      // Only persist currentProvider, providerKeys, and recentSearches, not screenshots (from DB)
      partialize: (state) => ({
        currentProvider: state.currentProvider,
        providerKeys: state.providerKeys,
        recentSearches: state.recentSearches,
      }),
    }
  )
);

// Derived state helper for screenshot count
export const useScreenshotCount = () => useStore((state) => state.screenshots.length);
