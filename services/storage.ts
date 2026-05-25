// services/storage.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getAllScreenshots } from './database';

export interface StorageInfo {
  totalBytes: number;
  formatted: string;
  fileCount: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const threshold = 1024;
  let unitIndex = 0;
  let size = bytes;

  while (size >= threshold && unitIndex < units.length - 1) {
    size /= threshold;
    unitIndex++;
  }

  // Format based on unit
  if (unitIndex === 0) {
    // Bytes - show integer
    return `${Math.round(size)} ${units[unitIndex]}`;
  } else if (unitIndex === 1) {
    // KB - show integer
    return `${Math.round(size)} ${units[unitIndex]}`;
  } else if (unitIndex === 2) {
    // MB - show one decimal
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  } else {
    // GB - show two decimals
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  // Web platform fallback
  if (Platform.OS === 'web') {
    return {
      totalBytes: 0,
      formatted: '不支持',
      fileCount: 0,
    };
  }

  try {
    // Get all screenshots from database
    const screenshots = await getAllScreenshots();

    let totalBytes = 0;
    let fileCount = 0;

    // Get size of each screenshot's image file
    for (const screenshot of screenshots) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(screenshot.image_path, { size: true });
        if (fileInfo.exists && fileInfo.size !== undefined) {
          totalBytes += fileInfo.size;
          fileCount++;
        }
      } catch (e) {
        // Skip files that can't be read
        console.warn(`Failed to get info for ${screenshot.image_path}:`, e);
      }
    }

    return {
      totalBytes,
      formatted: formatBytes(totalBytes),
      fileCount,
    };
  } catch (error) {
    console.error('Error calculating storage:', error);
    // Return safe default on error
    return {
      totalBytes: 0,
      formatted: '计算失败',
      fileCount: 0,
    };
  }
}
