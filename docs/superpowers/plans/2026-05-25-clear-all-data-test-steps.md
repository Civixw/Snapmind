# Clear All Data Feature - Test Steps

## Prerequisites
- Development server should be running
- App loaded on device/emulator or in web browser

## Test Steps

### 1. Navigate to Settings Screen
- **Action:** Tap the Settings tab at the bottom of the screen
- **Expected:** Settings screen loads with storage stats, API Key section, and Danger Zone at bottom

### 2. Verify Button Appearance
- **Action:** Scroll to bottom of Settings screen
- **Expected:** See "清空所有数据" button with trash icon (`trash-outline`) in red color
- **Screenshot:** The button should be at the bottom in a pill-shaped container

### 3. Test Confirmation Dialog
- **Action:** Tap the "清空所有数据" button
- **Expected:** Alert dialog appears with:
  - Title: "清空所有数据"
  - Message: "此操作将删除所有截图和图片文件，且不可恢复。确定要继续吗？"
  - Two buttons: "取消" (left, default) and "清空" (right, destructive/red)

### 4. Test Cancel Action
- **Action:** Tap "取消" button
- **Expected:** Dialog closes, no data is deleted, app returns to Settings screen

### 5. Test Empty State Handling
- **Condition:** If you have NO screenshots in your app
- **Action:** Tap "清空所有数据" → Tap "清空"
- **Expected:** Alert shows "当前没有数据可清空"

### 6. Test Actual Deletion (⚠️ DESTRUCTIVE)
**WARNING: This will delete ALL your screenshots!**

**Preparation:** Only proceed if you have test screenshots you're willing to lose, or want to clear your data.

- **Action:** Tap "清空所有数据" → Tap "清空"
- **Expected Results:**
  1. Success alert shows: "已成功清空 X 张截图" (where X is the count)
  2. Screenshot count in Settings updates to "已保存 0 张截图"
  3. Navigate to Home tab: Shows empty state ("还没有截图")
  4. Navigate to Search tab: Shows empty state when searching

### 7. Verify Data Persistence
- **Action:** Close and reopen the app
- **Expected:** Data remains cleared (count stays at 0)

## Test Results

### Passed ✅
- [ ] Button appears correctly
- [ ] Confirmation dialog shows correct text
- [ ] Cancel button works
- [ ] Empty state message appears when no data
- [ ] Success message shows correct count
- [ ] Count updates to 0 after deletion
- [ ] Home tab shows empty state
- [ ] Search tab shows empty results
- [ ] Data persists after app restart

### Failed ❌
- [ ] List any failures or unexpected behavior

## Notes
Record any observations or issues during testing:
___________________________________________________________________________________
___________________________________________________________________________________
___________________________________________________________________________________
