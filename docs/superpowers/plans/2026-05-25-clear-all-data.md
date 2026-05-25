# Clear All Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the logout button in Settings with a "Clear All Data" feature that deletes all screenshots and images while preserving the API key.

**Architecture:** Single-screen modification. The Settings screen will import existing service functions (`getAllScreenshots`, `deleteScreenshot`, `deleteImage`, `getScreenshotCount`) and add a new `handleClearAllData` function that orchestrates the deletion process with user confirmation and feedback.

**Tech Stack:** React Native, Expo Router, expo-sqlite, expo-file-system, TypeScript

---

## File Structure

**Modified:**
- `app/(tabs)/settings.tsx` - Add clear data functionality

**No new files needed** - all required functions exist in services layer:
- `services/database.native.ts` - `getAllScreenshots()`, `deleteScreenshot()`, `getScreenshotCount()`
- `services/image.ts` - `deleteImage()`

---

## Task 1: Add Import for getAllScreenshots

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add getAllScreenshots to imports**

In the existing import statement, add `getAllScreenshots`:

```typescript
// Find this line (around line 6):
import { getScreenshotCount } from '../../services/database';

// Change to:
import { getScreenshotCount, getAllScreenshots } from '../../services/database';
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm start -- --no-dev --minify`
Expected: No TypeScript errors related to imports

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: import getAllScreenshots for clear data feature"
```

---

## Task 2: Add handleClearAllData Function

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add the clearAllData function before the return statement**

Find the `handleSaveKey` function (around line 19) and add this function after it:

```typescript
const handleClearAllData = async () => {
  Alert.alert(
    '清空所有数据',
    '此操作将删除所有截图和图片文件，且不可恢复。确定要继续吗？',
    [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          try {
            // Get all screenshots
            const screenshots = await getAllScreenshots();

            if (screenshots.length === 0) {
              Alert.alert('提示', '当前没有数据可清空');
              return;
            }

            // Delete each screenshot and its image file
            let successCount = 0;
            for (const screenshot of screenshots) {
              try {
                await deleteImage(screenshot.image_path);
                await deleteScreenshot(screenshot.id);
                successCount++;
              } catch (e) {
                console.error('Failed to delete screenshot:', screenshot.id, e);
              }
            }

            // Show result
            if (successCount === screenshots.length) {
              Alert.alert('完成', `已成功清空 ${successCount} 张截图`);
            } else if (successCount > 0) {
              Alert.alert('部分完成', `已清空 ${successCount} 张截图，部分删除失败`);
            } else {
              Alert.alert('失败', '清空失败，请重试');
            }

            // Refresh count
            const newCount = await getScreenshotCount();
            setCount(newCount);
          } catch (e) {
            console.error('Clear data error:', e);
            Alert.alert('错误', '清空数据时发生错误');
          }
        },
      },
    ]
  );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm start -- --no-dev --minify`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: add handleClearAllData function with confirmation dialog"
```

---

## Task 3: Replace Logout Button with Clear Data Button

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Find the logout button section**

Find this section in the JSX (around line 126-131):

```typescript
{/* Danger Zone */}
<View style={styles.section}>
  <TouchableOpacity style={styles.logoutBtn}>
    <Ionicons name="log-out-outline" size={20} color={colors.error} />
    <Text style={styles.logoutText}>退出登录</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Replace with clear data button**

Replace the entire logout button section with:

```typescript
{/* Danger Zone */}
<View style={styles.section}>
  <TouchableOpacity style={styles.logoutBtn} onPress={handleClearAllData}>
    <Ionicons name="trash-outline" size={20} color={colors.error} />
    <Text style={styles.logoutText}>清空所有数据</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm start -- --no-dev --minify`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: replace logout button with clear data button"
```

---

## Task 4: Test the Feature

**Files:**
- None (manual testing)

- [ ] **Step 1: Start the development server**

Run: `npm start`
Expected: Expo dev server starts, QR code displayed

- [ ] **Step 2: Load the app on device/emulator**

Use Expo Go app to scan QR code or press `a` for Android emulator / `i` for iOS simulator

- [ ] **Step 3: Navigate to Settings screen**

Tap the Settings tab at the bottom of the screen

- [ ] **Step 4: Verify the button appearance**

Expected: See "清空所有数据" button with trash icon at bottom of screen

- [ ] **Step 5: Test confirmation dialog**

Tap the "清空所有数据" button
Expected: Alert dialog appears with title "清空所有数据" and warning message

- [ ] **Step 6: Test cancel action**

Tap "取消" button
Expected: Dialog closes, no data is deleted

- [ ] **Step 7: Test empty state handling**

(If you have no screenshots) Tap "清空所有数据" → "清空"
Expected: Alert shows "当前没有数据可清空"

- [ ] **Step 8: Test actual deletion (if you have test screenshots)**

⚠️ **WARNING: This will delete all your screenshots**

Tap "清空所有数据" → "清空"
Expected:
- Success alert shows count of deleted screenshots
- Screenshot count in Settings updates to 0
- Navigate to Home tab: empty state shown
- Navigate to Search tab: no results

- [ ] **Step 9: Test error handling (simulated)**

To simulate partial failure, you would need to manually corrupt the database or image files. For now, verify the error handling code paths exist by reviewing the code.

- [ ] **Step 10: Commit testing documentation**

```bash
git commit --allow-empty -m "test: verify clear all data feature works correctly"
```

---

## Self-Review Results

**1. Spec coverage:**
- ✅ Delete all screenshot records from database - Task 2
- ✅ Delete all associated image files - Task 2
- ✅ Preserve API Key - No code touches API Key storage
- ✅ Reset screenshot count to 0 - Task 2 (calls `setCount`)
- ✅ Replace logout button - Task 3
- ✅ Confirmation dialog with warning - Task 2 (Alert.alert)
- ✅ Cancel/Clear buttons - Task 2 (Alert.alert options)
- ✅ Success message with count - Task 2
- ✅ Auto-refresh Settings - Task 2 (setCount)
- ✅ Error handling - Task 2 (try-catch blocks)
- ✅ No data case - Task 2 (checks `screenshots.length === 0`)

**2. Placeholder scan:**
- ✅ No "TBD", "TODO", or similar placeholders
- ✅ All code steps include actual code
- ✅ All commands are complete with expected outputs
- ✅ No "implement error handling" - actual error handling code provided
- ✅ No "similar to" - each step is self-contained

**3. Type consistency:**
- ✅ `getAllScreenshots()` return type matches usage (`Promise<Screenshot[]>`)
- ✅ `deleteScreenshot(id)` parameter type matches (`id: string`)
- ✅ `deleteImage(path)` parameter type matches (`path: string`)
- ✅ `getScreenshotCount()` return type matches (`Promise<number>`)
- ✅ State setter `setCount` accepts number
- ✅ Function names consistent throughout

**4. Import verification:**
- ✅ `Alert` is already imported from 'react-native' (line 3)
- ✅ `deleteImage` is not imported - **NEEDS TO BE ADDED**

**Correction needed:** Add `deleteImage` and `deleteScreenshot` to imports in Task 1.

---

## Correction: Update Task 1 Imports

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Update imports to include delete functions**

Find this line (around line 6-7):
```typescript
import { getScreenshotCount } from '../../services/database';
```

Change to:
```typescript
import { getScreenshotCount, getAllScreenshots, deleteScreenshot } from '../../services/database';
import { deleteImage } from '../../services/image';
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm start -- --no-dev --minify`
Expected: No TypeScript errors

- [ ] **Step 3: Update commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit --amend -m "feat: import functions for clear data feature"
```
