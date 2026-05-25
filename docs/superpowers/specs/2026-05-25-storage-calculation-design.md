# Storage Calculation Feature Design

**Date:** 2025-05-25
**Author:** Claude & Civi
**Status:** Approved

## Overview

Replace the hardcoded "65% storage used" display in the Settings screen with actual storage usage calculation. The feature will display the total size of all stored screenshot images with adaptive unit formatting (KB/MB/GB).

## Requirements

### Functional Requirements
- Calculate total storage used by all screenshot images
- Display the count of saved screenshots
- Format storage size with adaptive units (B/KB/MB/GB)
- Recalculate each time the Settings screen is focused

### Non-Functional Requirements
- Fast calculation (target: < 100ms for typical usage)
- Handle edge cases (no files, calculation errors)
- Web platform fallback (show appropriate message)

## Architecture

### New Service Module

Create `services/storage.ts` to handle storage-related operations:

```typescript
// services/storage.ts
export interface StorageInfo {
  totalBytes: number
  formatted: string
  fileCount: number
}

export async function getTotalStorageSize(): Promise<number>
export async function getStorageInfo(): Promise<StorageInfo>
export function formatBytes(bytes: number): string
```

### File Structure

```
services/
├── storage.ts          # NEW: Storage calculation service
├── image.ts            # EXISTING: Image file operations
├── database.native.ts  # EXISTING: Database operations
└── ai.ts               # EXISTING: AI analysis
```

## Data Flow

```
SettingsScreen mounts / receives focus
    ↓
Calls storage.getStorageInfo()
    ↓
Iterates through images/ directory files
    ↓
Accumulates file sizes
    ↓
Formats to readable unit (KB/MB/GB)
    ↓
Updates UI state
    ↓
Displays: "已保存 X 张截图，约 Y"
```

## Implementation Details

### Size Formatting Rules

| Bytes Range | Display Format |
|-------------|----------------|
| < 1 KB      | "XXX B" or "< 1 KB" |
| 1 KB - 1 MB | "XXX KB" |
| 1 MB - 1 GB | "XXX.X MB" |
| ≥ 1 GB      | "X.XX GB" |

### Error Handling

| Scenario | Display |
|----------|---------|
| No images | "已保存 0 张截图，约 0 B" |
| Directory not found | "计算失败" |
| Permission error | "无法访问存储" |
| Web platform | "网页版不支持存储统计" |

### UI Changes

**Before (settings.tsx):**
```tsx
<Text style={styles.statsCount}>已保存 {screenshotCount} 张截图</Text>
<View style={styles.statsBarBg}>
  <View style={[styles.statsBarFill, { width: '65%' }]} />
</View>
<Text style={styles.statsSubtext}>存储空间：已使用 65%</Text>
```

**After:**
```tsx
<Text style={styles.statsCount}>
  {loading ? '计算中...' : `已保存 ${fileCount} 张截图，约 ${formattedSize}`}
</Text>
{/* Remove progress bar */}
```

## State Management

```typescript
const [storageInfo, setStorageInfo] = useState<{
  loading: boolean
  fileCount: number
  formatted: string
  error?: string
}>({ loading: true, fileCount: 0, formatted: '...' })
```

Use `useFocusEffect` to recalculate when screen receives focus:

```typescript
useFocusEffect(
  useCallback(() => {
    loadStorageInfo()
  }, [])
)
```

## Platform Considerations

### Native (iOS/Android)
- Full implementation using `expo-file-system`
- Access `FileSystem.documentDirectory + 'images/'`
- Use `FileSystem.getInfoAsync()` for each file

### Web
- Show fallback message: "网页版不支持存储统计"
- Or display screenshot count only without size

## Testing Strategy

### Unit Tests
- `formatBytes()` with various input values
- Edge cases: 0, negative, very large numbers

### Manual Testing
| Test Case | Expected Result |
|-----------|-----------------|
| No images | "已保存 0 张截图，约 0 B" |
| 1 small image | Correct size in KB |
| 10 images | Correct sum in MB |
| Large collection | Correct format (MB or GB) |
| Web platform | Fallback message |

## Success Criteria

- ✅ Storage size accurately reflects actual file sizes
- ✅ Format is human-readable with appropriate units
- ✅ Calculation completes in < 100ms for typical usage
- ✅ Error states handled gracefully
- ✅ No regressions in existing Settings functionality
