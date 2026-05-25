# Clear All Data Feature Design

**Date:** 2026-05-25
**Status:** Approved
**Author:** Claude

## Overview

Add a "Clear All Data" feature to the Settings screen that allows users to delete all screenshot records and image files, resetting the app to its initial state while preserving the API Key configuration.

## Requirements

### Functional Requirements

1. **Data Scope**
   - Delete all screenshot records from the SQLite database
   - Delete all associated image files from the device storage
   - Preserve the user's API Key configuration
   - Reset the screenshot count to 0

2. **User Interaction**
   - Replace the existing "Logout" button in the Danger Zone
   - Require confirmation before executing the destructive action
   - Display warning message: "此操作将删除所有截图和图片文件，且不可恢复。确定要继续吗？"
   - Provide "Cancel" (default) and "Clear" (destructive) options

3. **Feedback**
   - Show success message with count: "已成功清空 X 张截图"
   - Auto-refresh the Settings page to update storage statistics
   - Reflect changes when navigating to other tabs

4. **Error Handling**
   - Display error message if deletion fails
   - Show actual count if only partial deletion succeeds

## UI Design

### Button Placement & Style

- **Location:** Bottom of Settings screen, Danger Zone section
- **Icon:** `trash-outline`
- **Text:** "清空所有数据"
- **Style:** Red warning color (`colors.error`), rounded pill background
- **Similar to existing logout button styling**

### Confirmation Dialog

```
Title: 清空所有数据
Message: 此操作将删除所有截图和图片文件，且不可恢复。确定要继续吗？
Buttons:
  - Cancel (default style)
  - Clear (destructive style)
```

### Success Feedback

```
Alert: "已成功清空 X 张截图"
```

## Technical Implementation

### Component Changes

**File:** `app/(tabs)/settings.tsx`

1. Replace the logout button section with clear data button
2. Add `handleClearAllData` function with:
   - Fetch all screenshots using `getAllScreenshots()`
   - Iterate through each screenshot:
     - Delete image file using `deleteImage(image_path)`
     - Delete database record using `deleteScreenshot(id)`
   - Count successful deletions
   - Show result alert
   - Refresh screenshot count by calling `getScreenshotCount()`

### Existing Dependencies

- `getAllScreenshots()` from `services/database`
- `deleteScreenshot(id)` from `services/database`
- `deleteImage(path)` from `services/image`
- `getScreenshotCount()` from `services/database`
- `Alert` from `react-native`

### Data Flow

```
User clicks "清空所有数据"
    ↓
Alert.alert() shows confirmation
    ↓
User confirms
    ↓
Get all screenshots from database
    ↓
For each screenshot:
  - Delete image file
  - Delete database record
  - Increment success counter
    ↓
Show success alert with count
    ↓
Refresh screenshot count state
```

## Edge Cases

1. **No data to clear:** Show message "当前没有数据可清空"
2. **Partial failure:** Show "已清空 X 张截图，部分删除失败"
3. **Complete failure:** Show "清空失败，请重试"
4. **Concurrent access:** SQLite handles concurrent operations safely

## Future Considerations

- Could add undo functionality (implement trash bin)
- Could add selective clearing (by category, date range)
- Could add export option before clearing

## Acceptance Criteria

- [ ] Button replaces logout button in Settings
- [ ] Clicking shows confirmation dialog with warning
- [ ] Confirming deletes all screenshots and images
- [ ] API Key remains unchanged
- [ ] Success message shows correct count
- [ ] Screenshot count updates to 0
- [ ] Other tabs show empty state after navigation
- [ ] Error cases display appropriate messages
