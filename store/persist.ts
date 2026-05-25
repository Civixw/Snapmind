// store/persist.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Storage adapter for Zustand persist middleware
// Web: localStorage, Native: expo-file-system
export const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      } else {
        const filePath = `${FileSystem.documentDirectory}${key}`;
        const exists = await FileSystem.getInfoAsync(filePath);
        if (exists.exists) {
          return await FileSystem.readAsStringAsync(filePath);
        }
        return null;
      }
    } catch (error) {
      console.error(`Failed to read ${key} from storage:`, error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
      } else {
        const filePath = `${FileSystem.documentDirectory}${key}`;
        await FileSystem.writeAsStringAsync(filePath, value);
      }
    } catch (error) {
      console.error(`Failed to write ${key} to storage:`, error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
      } else {
        const filePath = `${FileSystem.documentDirectory}${key}`;
        const exists = await FileSystem.getInfoAsync(filePath);
        if (exists.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error);
    }
  },
};
