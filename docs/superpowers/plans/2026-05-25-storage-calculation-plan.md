# Storage Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded storage display with actual calculation of screenshot image sizes and adaptive formatting.

**Architecture:** Create new `storage.ts` service for file size calculations, integrate with existing Settings screen via `useFocusEffect` hook for real-time updates.

**Tech Stack:** expo-file-system, React Native hooks, TypeScript

---

## Task 1: Create storage service module

**Files:**
- Create: `services/storage.ts`

- [ ] **Step 1: Create the file with formatBytes utility function**

```typescript
// services/storage.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

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
```

---

## Task 2: Implement getStorageInfo function

**Files:**
- Modify: `services/storage.ts`

- [ ] **Step 1: Add getStorageInfo function**

```typescript
// Add to services/storage.ts after formatBytes function

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
    const imagesDir = `${FileSystem.documentDirectory}images/`;

    // Check if directory exists
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!dirInfo.exists) {
      return {
        totalBytes: 0,
        formatted: formatBytes(0),
        fileCount: 0,
      };
    }

    // Read directory contents
    const files = await FileSystem.readDirectoryAsync(imagesDir);

    let totalBytes = 0;
    let fileCount = 0;

    // Get size of each file
    for (const file of files) {
      const filePath = `${imagesDir}${file}`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (fileInfo.exists && fileInfo.size !== undefined) {
          totalBytes += fileInfo.size;
          fileCount++;
        }
      } catch (e) {
        // Skip files that can't be read
        console.warn(`Failed to get info for ${file}:`, e);
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
```

---

## Task 3: Update Settings screen state management

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Import storage service and add state**

```typescript
// Add import at top of settings.tsx
import { getStorageInfo, StorageInfo } from '../../services/storage';

// Inside SettingsScreen component, replace existing screenshotCount and add storage state:
export default function SettingsScreen() {
  // Remove: const screenshotCount = useStore(state => state.screenshots.length);
  const apiKey = useStore(state => state.apiKey);
  const setApiKey = useStore(state => state.setApiKey);
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  // Add new storage state
  const [storageInfo, setStorageInfo] = useState<{
    loading: boolean;
    fileCount: number;
    formatted: string;
  }>({
    loading: true,
    fileCount: 0,
    formatted: '...',
  });
```

- [ ] **Step 2: Add loadStorageInfo function and useFocusEffect**

```typescript
// Add after existing useEffect in settings.tsx

const loadStorageInfo = async () => {
  setStorageInfo({ loading: true, fileCount: 0, formatted: '...' });
  const info = await getStorageInfo();
  setStorageInfo({
    loading: false,
    fileCount: info.fileCount,
    formatted: info.formatted,
  });
};

// Add useFocusEffect import if not present: import { useFocusEffect } from 'expo-router';
useFocusEffect(
  React.useCallback(() => {
    loadStorageInfo();
  }, [])
);
```

---

## Task 4: Update Settings screen UI

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Replace the stats card content**

Find the statsCard section (around line 90-105) and replace with:

```typescript
{/* Stats Card */}
<View style={styles.section}>
  <GlassCard style={styles.statsCard}>
    <View style={styles.glowOrb} />
    <View style={styles.statsRow}>
      <View>
        <Text style={styles.statsLabel}>记忆存储</Text>
        <Text style={styles.statsCount}>
          {storageInfo.loading
            ? '计算中...'
            : `已保存 ${storageInfo.fileCount} 张截图，约 ${storageInfo.formatted}`
          }
        </Text>
      </View>
      <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.statsIcon}>
        <Ionicons name="cloud-done" size={30} color="#fff" />
      </LinearGradient>
    </View>
  </GlassCard>
</View>
```

- [ ] **Step 2: Remove unused styles**

Remove these style definitions from the StyleSheet:
- `statsBarBg`
- `statsBarFill`
- `statsSubtext`

These were used for the progress bar which is no longer needed.

---

## Task 5: Handle delete operation refresh

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Update handleClearAllData to refresh storage info**

In the `handleClearAllData` function, after the existing `useStore.getState().loadInitialData();` line, add:

```typescript
// Refresh store
useStore.getState().loadInitialData();

// Refresh storage info
loadStorageInfo();
```

---

## Task 6: Manual testing verification

**Files:**
- None (testing only)

- [ ] **Step 1: Test empty state**

1. Clear all data via Settings
2. Observe storage display shows "已保存 0 张截图，约 0 B"
3. Verify no errors in console

- [ ] **Step 2: Test with images**

1. Import a few screenshots
2. Navigate to Settings
3. Verify display shows correct count and size (e.g., "已保存 3 张截图，约 2.5 MB")
4. Navigate away and back to Settings
5. Verify storage recalculates (useFocusEffect working)

- [ ] **Step 3: Test large numbers**

1. Import enough images to exceed 1 GB total (if possible)
2. Verify format changes to GB with two decimals
3. Or import images > 1 MB to verify MB formatting

- [ ] **Step 4: Test error handling**

1. Force an error scenario (optional: manually corrupt images directory)
2. Verify app doesn't crash
3. Verify shows "计算失败" or safe fallback

- [ ] **Step 5: Test web platform**

1. Run app in web browser
2. Navigate to Settings
3. Verify shows appropriate web message ("不支持")

---

## Task 7: Remove unused screenshotCount hook

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Remove unused import and hook usage**

Remove from imports:
```typescript
import { useStore, useScreenshotCount } from '../../store';
```

Replace with:
```typescript
import { useStore } from '../../store';
```

The `useScreenshotCount` hook is no longer needed since we calculate file count in storage service.

---

## Success Criteria Verification

- [ ] Storage size accurately reflects actual file sizes
- [ ] Format is human-readable with appropriate units (B/KB/MB/GB)
- [ ] Calculation completes quickly (no noticeable lag)
- [ ] Error states handled gracefully
- [ ] Settings screen has no regressions
- [ ] Web platform shows appropriate fallback
