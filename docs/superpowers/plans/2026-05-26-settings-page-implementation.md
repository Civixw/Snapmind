# 设置页面功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 为 SnapMind 应用实现深色模式切换和敏感内容检测提醒功能

**架构:**
- 深色模式: 创建 ThemeContext 管理主题状态，通过 React Context API 传递给所有组件，使用 AsyncStorage 持久化用户选择
- 敏感检测: 在现有 AI 分析流程中添加敏感信息识别，数据库添加 sensitive_flags 字段存储结果，UI 显示敏感标记

**技术栈:** React Native, Expo 52, expo-sqlite, OpenAI API, AsyncStorage, TypeScript

---

## 文件结构

### 新建文件
- `contexts/ThemeContext.tsx` - 主题上下文 Provider，管理主题模式状态
- `hooks/useTheme.ts` - 便捷 hook，访问主题上下文
- `app/(tabs)/settings/appearance.tsx` - 外观设置子页面（深色模式切换）
- `app/(tabs)/settings/privacy.tsx` - 隐私设置子页面（敏感内容开关）

### 修改文件
- `constants/theme.ts` - 添加 darkTheme 配色方案
- `app/_layout.tsx` - 根节点包裹 ThemeProvider
- `app/(tabs)/settings.tsx` - 导航到子设置页面
- `services/ai.ts` - 更新分析提示词，添加敏感信息检测
- `services/database.native.ts` - 添加 sensitive_flags 字段迁移
- `components/ScreenshotCard.tsx` - 显示敏感内容图标
- `components/GlassCard.tsx` - 支持深色主题
- `package.json` - 添加 async-storage 依赖

---

## Task 1: 添加 async-storage 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 @react-native-async-storage/async-storage**

```bash
npm install @react-native-async-storage/async-storage
```

- [ ] **Step 2: 验证安装成功**

Run: `npm list @react-native-async-storage/async-storage`
Expected: 显示版本号

- [ ] **Step 3: 提交依赖变更**

```bash
git add package.json package-lock.json
git commit -m "feat: add async-storage dependency for theme persistence"
```

---

## Task 2: 扩展主题常量 - 添加深色配色

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: 定义深色主题配色**

在 `constants/theme.ts` 中添加 darkTheme 导出，与现有 lightTheme 结构相同但使用深色系：

```typescript
// 在文件末尾添加
export const darkTheme = {
  // 背景色系
  background: '#1A1A1A',
  surfaceContainerLow: 'rgba(255,255,255,0.05)',
  surfaceContainerHigh: 'rgba(255,255,255,0.08)',

  // 主色系
  primary: '#FF6B35',
  primaryFixed: '#FFCCBC',
  onPrimary: '#FFFFFF',

  // 文本色
  onSurface: '#F5E6D3',
  onSurfaceVariant: '#C4B5A0',
  outline: '#7C6A58',
  outlineVariant: '#3D3228',

  // 功能色
  error: '#FFB4AB',
  secondary: '#89F87A',
  tertiary: '#51A3C9',

  // 渐变
  gradientColors: ['rgba(255,107,53,0.8)', 'rgba(171,53,0,0.8)'],
};
```

- [ ] **Step 2: 导出主题类型**

在文件顶部添加主题类型定义：

```typescript
export type ThemeName = 'light' | 'dark';

export interface Theme {
  background: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  primary: string;
  primaryFixed: string;
  onPrimary: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  secondary: string;
  tertiary: string;
  gradientColors: [string, string];
}
```

- [ ] **Step 3: 提交主题扩展**

```bash
git add constants/theme.ts
git commit -m "feat: add dark theme color palette"
```

---

## Task 3: 创建 ThemeContext

**Files:**
- Create: `contexts/ThemeContext.tsx`

- [ ] **Step 1: 创建 contexts 目录**

```bash
mkdir -p contexts
```

- [ ] **Step 2: 创建 ThemeContext.tsx 完整实现**

创建 `contexts/ThemeContext.tsx` 文件：

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type ThemeName } from '../constants/theme';

const THEME_STORAGE_KEY = 'snapmind_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: ThemeName;
  setMode: (mode: ThemeMode) => void;
  colors: typeof lightTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载保存的主题模式
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setModeState(savedMode);
      }
      setIsLoaded(true);
    }).catch((error) => {
      console.warn('[ThemeContext] Failed to load theme mode:', error);
      setIsLoaded(true);
    });
  }, []);

  // 保存主题模式到 AsyncStorage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((error) => {
      console.warn('[ThemeContext] Failed to save theme mode:', error);
    });
  };

  // 计算当前生效的主题
  const activeTheme: ThemeName = React.useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemColorScheme]);

  // 获取当前主题颜色
  const colors = activeTheme === 'dark' ? darkTheme : lightTheme;

  // 等待加载完成再渲染
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 3: 提交 ThemeContext**

```bash
git add contexts/ThemeContext.tsx
git commit -m "feat: create ThemeContext with dark mode support"
```

---

## Task 4: 创建便捷 hook

**Files:**
- Create: `hooks/useTheme.ts`

- [ ] **Step 1: 创建 hooks 目录**

```bash
mkdir -p hooks
```

- [ ] **Step 2: 创建 useTheme.ts**

创建 `hooks/useTheme.ts` 文件：

```typescript
export { useTheme, ThemeProvider } from '../contexts/ThemeContext';
export type { ThemeMode } from '../contexts/ThemeContext';
```

- [ ] **Step 3: 提交便捷 hook**

```bash
git add hooks/useTheme.ts
git commit -m "feat: add useTheme convenience export"
```

---

## Task 5: 更新根布局包裹 ThemeProvider

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: 导入 ThemeProvider**

在 `app/_layout.tsx` 顶部添加导入：

```typescript
import { ThemeProvider } from '../contexts/ThemeContext';
```

- [ ] **Step 2: 包裹现有布局**

找到 `RootLayoutNav` 组件的返回语句，用 `ThemeProvider` 包裹：

```typescript
// 原来的代码：
return (
  <Stack screenOptions={{ headerShown: false }}>
    {/* ... screens ... */}
  </Stack>
);

// 修改为：
return (
  <ThemeProvider>
    <Stack screenOptions={{ headerShown: false }}>
      {/* ... screens ... */}
    </Stack>
  </ThemeProvider>
);
```

- [ ] **Step 3: 提交布局更新**

```bash
git add app/_layout.tsx
git commit -m "feat: wrap root layout with ThemeProvider"
```

---

## Task 6: 更新 GlassCard 支持深色主题

**Files:**
- Modify: `components/GlassCard.tsx`

- [ ] **Step 1: 导入并使用 useTheme hook**

在 `components/GlassCard.tsx` 中：

```typescript
// 在顶部导入
import { useTheme } from '../hooks/useTheme';

// 在组件内部添加
const { colors } = useTheme();

// 修改 style 中的 backgroundColor 从硬编码改为使用 colors.background
// 修改 borderColor 从硬编码改为使用 colors.surfaceContainerHigh
```

完整更新后的组件：

```typescript
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { borderRadius } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassCard({ children, style }: GlassCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 2: 提交 GlassCard 更新**

```bash
git add components/GlassCard.tsx
git commit -m "feat: update GlassCard to support dark theme"
```

---

## Task 7: 更新设置页面使用主题

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: 导入并使用 useTheme**

在 `app/(tabs)/settings.tsx` 中添加主题支持：

```typescript
// 在导入部分添加
import { useTheme } from '../../hooks/useTheme';

// 在 SettingsScreen 组件内部添加
const { colors } = useTheme();

// 修改 StyleSheet 中的颜色引用，将 colors.xxx 改为从 useTheme 获取的 colors
```

具体修改样式：

```typescript
// 修改前：
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // ...
});

// 修改后 - 直接在组件中使用 colors 对象：
<View style={{ flex: 1, backgroundColor: colors.background }}>
  {/* ... 内容 ... */}
</View>

// 或者保持 StyleSheet 但使用动态颜色（需要将 styles 移到组件外或使用 useMemo）
```

- [ ] **Step 2: 修改"外观与主题"按钮为可点击导航**

找到 SettingRow 组件渲染"外观与主题"的地方，修改为：

```typescript
<TouchableOpacity onPress={() => router.push('/settings/appearance')}>
  <SettingRow icon="color-palette-outline" label="外观与主题" />
</TouchableOpacity>
```

同时修改"隐私与安全"按钮：

```typescript
<TouchableOpacity onPress={() => router.push('/settings/privacy')}>
  <SettingRow icon="shield-outline" label="隐私与安全" />
</TouchableOpacity>
```

- [ ] **Step 3: 提交设置页面更新**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat: make settings page theme-aware and add navigation"
```

---

## Task 8: 创建外观设置页面（深色模式切换）

**Files:**
- Create: `app/(tabs)/settings/appearance.tsx`

- [ ] **Step 1: 创建 settings 子目录**

```bash
mkdir -p "app/(tabs)/settings"
```

- [ ] **Step 2: 创建 appearance.tsx 完整实现**

创建 `app/(tabs)/settings/appearance.tsx`：

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../../components/GlassCard';
import { useTheme } from '../../../hooks/useTheme';
import { colors as staticColors, borderRadius } from '../../../constants/theme';

export default function AppearanceScreen() {
  const router = useRouter();
  const { mode, setMode, activeTheme } = useTheme();

  const ThemeOption = ({
    value,
    icon,
    label,
  }: {
    value: 'light' | 'dark' | 'system';
    icon: string;
    label: string;
  }) => {
    const isActive = mode === value;
    return (
      <TouchableOpacity
        style={[styles.option, isActive && styles.optionActive]}
        onPress={() => setMode(value)}
      >
        <Ionicons
          name={icon as any}
          size={24}
          color={isActive ? staticColors.primary : staticColors.onSurfaceVariant}
        />
        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
          {label}
        </Text>
        {isActive && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={20} color={staticColors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={staticColors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>外观与主题</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>主题模式</Text>

          <ThemeOption value="light" icon="sunny" label="浅色模式" />
          <View style={styles.divider} />
          <ThemeOption value="dark" icon="moon" label="深色模式" />
          <View style={styles.divider} />
          <ThemeOption value="system" icon="phone-portrait" label="跟随系统" />
        </GlassCard>

        <Text style={styles.hint}>
          当前生效：{activeTheme === 'dark' ? '深色模式' : '浅色模式'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: staticColors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: staticColors.onSurfaceVariant,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    gap: 16,
  },
  optionActive: {
    backgroundColor: 'rgba(255,107,53,0.1)',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: staticColors.onSurface,
  },
  optionLabelActive: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
  hint: {
    fontSize: 14,
    color: staticColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
});
```

- [ ] **Step 3: 提交外观设置页面**

```bash
git add "app/(tabs)/settings/appearance.tsx"
git commit -m "feat: create appearance settings page with theme switcher"
```

---

## Task 9: 更新 AI 服务 - 添加敏感信息检测提示词

**Files:**
- Modify: `services/ai.ts`

- [ ] **Step 1: 更新 analyzeScreenshot 函数的提示词**

在 `services/ai.ts` 中找到 `analyzeScreenshot` 函数的 prompt 部分，添加敏感信息检测指令。

在现有的 JSON 响应结构中添加 `sensitive_flags` 字段：

```typescript
// 更新 prompt，在现有指令后添加：
const prompt = `
分析这张截图并返回 JSON 格式：
{
  "raw_text": "OCR 识别的文本内容",
  "summary": "简要摘要（50字内）",
  "category": "分类（美食/购物/旅行/聊天/学习/健身/灵感/待办之一）",
  "tags": ["标签1", "标签2", "标签3"],
  "sensitive_flags": ["检测到的敏感信息类型"]
}

敏感信息类型包括：
- id_card: 身份证、护照、驾驶证等证件号码
- bank_card: 银行卡号、信用卡号
- phone: 电话号码
- chat_record: 聊天记录、对话内容
- password: 密码、验证码、PIN码
- private_photo: 私密照片、不雅内容

如果没有检测到敏感信息，sensitive_flags 返回空数组 []。

注意：只返回 JSON，不要其他文字。
`;
```

- [ ] **Step 2: 更新 AnalysisResult 类型**

在 `services/ai.ts` 中更新类型定义：

```typescript
export type SensitiveFlag =
  | 'id_card'
  | 'bank_card'
  | 'phone'
  | 'chat_record'
  | 'password'
  | 'private_photo';

export interface AnalysisResult {
  raw_text: string;
  summary: string;
  category: string;
  tags: string[];
  sensitive_flags: SensitiveFlag[];
}
```

- [ ] **Step 3: 提交 AI 服务更新**

```bash
git add services/ai.ts
git commit -m "feat: add sensitive content detection to AI analysis"
```

---

## Task 10: 更新数据库 - 添加 sensitive_flags 字段

**Files:**
- Modify: `services/database.native.ts`

- [ ] **Step 1: 更新 Screenshot 类型**

在 `services/database.native.ts` 中找到 Screenshot 接口定义，添加新字段：

```typescript
export interface Screenshot {
  id: string;
  image_path: string;
  raw_text: string;
  summary: string;
  category: string;
  tags: string;          // JSON string array
  embedding: string;     // JSON number array
  sensitive_flags: string | null;  // JSON string array, 新增
  created_at: string;
  importance_score: number;
}
```

- [ ] **Step 2: 更新数据库初始化 - 添加迁移逻辑**

在 `initDatabase()` 函数中找到 CREATE TABLE 语句，添加新列的迁移：

```typescript
// 在 CREATE TABLE screenshots 语句后添加迁移：
await database.execAsync(`
  CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    image_path TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at TEXT NOT NULL,
    importance_score REAL DEFAULT 0
  );
`);

// 添加列迁移（如果不存在）
try {
  await database.execAsync(`
    ALTER TABLE screenshots ADD COLUMN sensitive_flags TEXT;
  `);
  console.log('[Database] Added sensitive_flags column');
} catch (error) {
  // 列已存在，忽略错误
  console.log('[Database] sensitive_flags column already exists');
}

// 继续执行 FTS5 表创建...
```

- [ ] **Step 3: 更新 insertScreenshot 函数**

修改 `insertScreenshot` 函数签名，添加 `sensitive_flags` 参数：

```typescript
export async function insertScreenshot(
  screenshot: Omit<Screenshot, 'created_at' | 'importance_score'> & {
    sensitive_flags?: string | null;
  }
): Promise<Screenshot> {
  // ... 现有代码，在 INSERT 语句中添加 sensitive_flags
}
```

- [ ] **Step 4: 提交数据库更新**

```bash
git add services/database.native.ts
git commit -m "feat: add sensitive_flags column to screenshots table"
```

---

## Task 11: 更新 ScreenshotCard 显示敏感标记

**Files:**
- Modify: `components/ScreenshotCard.tsx`

- [ ] **Step 1: 添加敏感标记图标和逻辑**

在 `components/ScreenshotCard.tsx` 中添加敏感内容图标显示：

```typescript
// 在组件 props 中添加敏感标记
interface ScreenshotCardProps {
  // ... 现有 props
  sensitiveFlags?: string;  // JSON string array
}

// 在组件内部解析敏感标记
const sensitiveFlagsList = useMemo(() => {
  if (!sensitiveFlags) return [];
  try {
    return JSON.parse(sensitiveFlags) as string[];
  } catch {
    return [];
  }
}, [sensitiveFlags]);

const hasSensitiveContent = sensitiveFlagsList.length > 0;
```

- [ ] **Step 2: 在卡片上显示敏感图标**

在卡片内容中添加敏感标记指示器（在图片右上角或摘要旁边）：

```typescript
// 在卡片顶部添加敏感标记
{hasSensitiveContent && (
  <View style={styles.sensitiveBadge}>
    <Ionicons name="lock-closed" size={12} color={colors.error} />
    <Text style={styles.sensitiveText}>敏感</Text>
  </View>
)}
```

- [ ] **Step 3: 添加样式**

在 StyleSheet 中添加：

```typescript
sensitiveBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: 'rgba(255, 180, 171, 0.9)',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},
sensitiveText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#fff',
},
```

- [ ] **Step 4: 提交 ScreenshotCard 更新**

```bash
git add components/ScreenshotCard.tsx
git commit -m "feat: display sensitive content badge on screenshot cards"
```

---

## Task 12: 创建隐私设置页面

**Files:**
- Create: `app/(tabs)/settings/privacy.tsx`

- [ ] **Step 1: 创建隐私设置页面完整实现**

创建 `app/(tabs)/settings/privacy.tsx`：

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../../components/GlassCard';
import { useTheme } from '../../../hooks/useTheme';
import { colors as staticColors, borderRadius } from '../../../constants/theme';
import { getAllScreenshots } from '../../../services/database';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showSensitiveMarkers, setShowSensitiveMarkers] = useState(true);
  const [sensitiveCount, setSensitiveCount] = useState(0);

  useEffect(() => {
    loadSensitiveCount();
  }, []);

  const loadSensitiveCount = async () => {
    try {
      const screenshots = await getAllScreenshots();
      const count = screenshots.filter(s => {
        if (!s.sensitive_flags) return false;
        try {
          const flags = JSON.parse(s.sensitive_flags) as string[];
          return flags.length > 0;
        } catch {
          return false;
        }
      }).length;
      setSensitiveCount(count);
    } catch (error) {
      console.error('[Privacy] Failed to load sensitive count:', error);
    }
  };

  const PrivacyOption = ({
    icon,
    label,
    value,
    onValueChange,
  }: {
    icon: string;
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
  }) => (
    <View style={styles.option}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon as any} size={20} color={staticColors.onSurfaceVariant} />
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: staticColors.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={staticColors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>隐私与安全</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>敏感内容提醒</Text>

          <PrivacyOption
            icon="eye"
            label="显示敏感标记"
            value={showSensitiveMarkers}
            onValueChange={setShowSensitiveMarkers}
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>敏感内容统计</Text>

          <View style={styles.statRow}>
            <Ionicons name="lock-closed" size={20} color={staticColors.primary} />
            <Text style={styles.statLabel}>检测到敏感截图</Text>
            <Text style={styles.statValue}>{sensitiveCount} 张</Text>
          </View>

          {sensitiveCount > 0 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/privacy/sensitive')}
            >
              <Text style={styles.viewAllBtnText}>查看所有敏感截图</Text>
              <Ionicons name="chevron-forward" size={18} color={staticColors.primary} />
            </TouchableOpacity>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: staticColors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: staticColors.onSurfaceVariant,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: staticColors.onSurface,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
    color: staticColors.onSurface,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: staticColors.primary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: staticColors.primary,
    borderRadius: borderRadius.full,
  },
  viewAllBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: staticColors.primary,
  },
});
```

- [ ] **Step 2: 提交隐私设置页面**

```bash
git add "app/(tabs)/settings/privacy.tsx"
git commit -m "feat: create privacy settings page with sensitive content controls"
```

---

## Task 13: 更新所有其他组件支持深色主题

**Files:**
- Modify: `components/SearchBar.tsx`
- Modify: `components/CategoryFilter.tsx`
- Modify: `components/TagChip.tsx`
- Modify: `components/ImportModal.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/search.tsx`
- Modify: `app/(tabs)/vault.tsx`
- Modify: `app/detail/[id].tsx`

- [ ] **Step 1: 批量更新组件使用 useTheme**

对每个组件进行相同的更新模式：

```typescript
// 1. 导入 useTheme
import { useTheme } from '../../hooks/useTheme';

// 2. 在组件内获取 colors
const { colors } = useTheme();

// 3. 将硬编码颜色替换为 colors.xxx
// 例如：backgroundColor: '#FFF5ED' -> backgroundColor: colors.background
```

- [ ] **Step 2: 提交组件更新**

```bash
git add components/ app/
git commit -m "feat: update all components to support dark theme"
```

---

## Task 14: 深色模式手动测试

**Files:**
- No file changes (testing only)

- [ ] **Step 1: 启动开发服务器**

```bash
npm start
```

- [ ] **Step 2: 测试主题切换**

在 Expo Go 或模拟器中测试：
1. 打开设置 → 外观与主题
2. 切换到"深色模式"，验证应用立即变为深色
3. 切换到"浅色模式"，验证应用恢复浅色
4. 切换到"跟随系统"，验证应用跟随系统主题

- [ ] **Step 3: 测试所有页面深色显示**

检查以下页面在深色模式下显示正常：
- [ ] 首页（截图网格）
- [ ] 搜索页
- [ ] 智能精选页
- [ ] 设置页
- [ ] 截图详情页
- [ ] 导入弹窗

- [ ] **Step 4: 测试持久化**

1. 选择深色模式
2. 完全关闭应用（不是后台）
3. 重新打开应用
4. 验证深色模式被保留

- [ ] **Step 5: 测试 Web 平台**

在浏览器中运行 `npm run web`，验证深色模式在 Web 上正常工作。

---

## Task 15: 敏感检测功能测试

**Files:**
- No file changes (testing only)

- [ ] **Step 1: 测试敏感内容检测**

导入包含敏感信息的测试图片：
- [ ] 身份证/证件图片 → 应显示 `id_card` 标记
- [ ] 银行卡截图 → 应显示 `bank_card` 标记
- [ ] 聊天记录截图 → 应显示 `chat_record` 标记
- [ ] 普通截图 → 不应显示敏感标记

- [ ] **Step 2: 测试隐私设置页面**

1. 打开设置 → 隐私与安全
2. 验证敏感截图统计数字正确
3. 测试"显示敏感标记"开关（功能预留，目前不实现实际隐藏）

- [ ] **Step 3: 测试老数据兼容性**

验证之前导入的截图（没有 `sensitive_flags` 字段）不会崩溃。

---

## 完成检查清单

- [ ] 深色模式在所有平台（iOS/Android/Web）正常工作
- [ ] 主题切换流畅，无明显卡顿
- [ ] 敏感内容检测准确性可接受（需要实际测试多张图片）
- [ ] 数据库迁移成功，老数据不崩溃
- [ ] 所有提交已完成，代码整洁无 TODO

---

## 备注说明

1. **敏感检测准确性**: GPT-4o-mini 的敏感信息检测准确率需要实测验证，如有误报或漏报情况，可能需要调整提示词。

2. **性能考虑**: 大量截图时计算敏感内容统计可能有性能问题，如遇卡顿可考虑添加缓存或懒加载。

3. **隐私开关**: "显示敏感标记"和"自动隐藏敏感截图"开关目前只实现了 UI，实际的隐藏逻辑需要额外任务实现。

4. **扩展性**: 如需添加更多敏感类型，只需更新 `SensitiveFlag` 类型和 AI 提示词即可。
