# 隐私政策与服务条款功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SnapMind 添加应用内隐私政策和服务条款展示页面，支持从 GitHub 远程获取内容和本地缓存。

**Architecture:** 使用服务层处理网络请求和缓存，页面组件通过 expo-router 路由展示 Markdown 内容。

**Tech Stack:** expo-router, react-native-markdown-display, AsyncStorage, GitHub Raw API

---

## File Structure

```
app/legal/
├── _layout.tsx          # 法律文档共用布局（导航栏样式）
├── privacy.tsx          # 隐私政策页面
└── terms.tsx            # 服务条款页面

services/
└── legal.ts             # 法律文档服务（获取 + 缓存逻辑）

docs/legal/              # 本地 Markdown 文档（临时占位，最终迁移到 GitHub）
├── privacy-policy.md
├── terms-of-service.md
└── version.json
```

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 react-native-markdown-display**

```bash
npm install react-native-markdown-display@7.0.2
```

- [ ] **Step 2: 验证安装成功**

Run: `cat package.json | grep react-native-markdown-display`
Expected: `"react-native-markdown-display": "^7.0.2"`

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "feat: 添加 react-native-markdown-display 依赖"
```

---

## Task 2: 创建本地 Markdown 文档（临时占位）

**Files:**
- Create: `docs/legal/privacy-policy.md`
- Create: `docs/legal/terms-of-service.md`
- Create: `docs/legal/version.json`

- [ ] **Step 1: 创建 docs/legal 目录**

```bash
mkdir -p docs/legal
```

- [ ] **Step 2: 创建隐私政策 Markdown 文件**

创建 `docs/legal/privacy-policy.md`：

```markdown
# 隐私政策

**最后更新：** 2026年5月26日

## 1. 数据存储

### 1.1 本地存储
SnapMind 将您的所有截图数据存储在您设备的本地存储中。我们不会将您的截图上传到任何云端服务器，您完全控制自己的数据。

### 1.2 敏感内容保护
SnapMind 提供 AI 驱动的敏感内容检测功能。检测到的敏感内容会被标记，您可以在设置中控制是否显示这些标记。

## 2. AI 处理

### 2.1 OpenAI API 使用
为了提供截图分析和搜索功能，SnapMind 使用 OpenAI API：
- 截图图片会发送到 OpenAI 服务器进行 OCR 和语义分析
- OpenAI 不存储用户发送的图片数据
- 分析结果（文本、标签、摘要）仅存储在您的设备本地

### 2.2 API Key 管理
- 您需要自行提供 OpenAI API Key
- API Key 安全存储在您的设备本地
- SnapMind 不会将您的 API Key 发送到任何第三方服务器

## 3. 数据删除权

您有权随时删除所有数据：
- 在设置页面点击"清空所有数据"
- 此操作将删除所有截图和图片文件，且不可恢复

## 4. 第三方服务

SnapMind 使用以下第三方服务：
- **OpenAI API**：用于图像分析和语义搜索

我们不与任何第三方共享您的数据。

## 5. 政策更新

本隐私政策可能会不时更新。重大变更会通过应用内通知告知您。

---

如有任何疑问，请联系：support@snapmind.app
```

- [ ] **Step 3: 创建服务条款 Markdown 文件**

创建 `docs/legal/terms-of-service.md`：

```markdown
# 服务条款

**最后更新：** 2026年5月26日

## 1. 服务描述

SnapMind 是一个本地截图管理工具，提供以下功能：
- 截图导入和管理
- AI 驱动的 OCR 文字识别
- 智能分类和标签
- 语义搜索

## 2. 免责声明

### 2.1 AI 分析准确性
- AI 分析结果不保证 100% 准确
- 您应自行判断和使用分析结果
- 开发者不对 AI 错误造成的任何损失负责

### 2.2 按现状提供
SnapMind 按"现状"提供服务，不提供任何明示或暗示的保证。

## 3. 用户责任

使用 SnapMind 时，您同意：
- 妥善保管您的 OpenAI API Key
- 遵守 OpenAI 的使用条款
- 不将本应用用于任何非法目的
- 对您上传的截图内容负责

## 4. 服务变更

我们保留随时修改或终止服务的权利，恕不另行通知。

## 5. 责任限制

在法律允许的最大范围内，SnapMind 开发者不对以下情况负责：
- 使用或无法使用本服务导致的任何间接或附带损失
- AI 分析错误导致的任何损失
- 第三方服务（如 OpenAI API）中断或故障

---

感谢您使用 SnapMind！
```

- [ ] **Step 4: 创建版本配置文件**

创建 `docs/legal/version.json`：

```json
{
  "privacy_policy": "2026-05-26-v1",
  "terms_of_service": "2026-05-26-v1"
}
```

- [ ] **Step 5: 提交**

```bash
git add docs/legal/
git commit -m "feat: 添加隐私政策和服务条款 Markdown 文档"
```

---

## Task 3: 创建法律文档服务（核心逻辑）

**Files:**
- Create: `services/legal.ts`

- [ ] **Step 1: 创建服务文件骨架**

创建 `services/legal.ts`：

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// 类型定义
// ============================================================================

export interface CachedDocument {
  content: string;
  version: string;
  lastFetched: string;
  lastModified: string;
}

export interface LegalDocumentResult {
  content: string;
  lastModified: string;
  usingCached: boolean;
}

export type DocumentType = 'privacy_policy' | 'terms_of_service';

// ============================================================================
// 配置
// ============================================================================

const LEGAL_CONFIG = {
  // 开发阶段使用本地文件，生产环境替换为 GitHub URL
  useLocalFiles: true,

  // GitHub 配置（后续迁移到 GitHub 时使用）
  githubOwner: 'your-username',
  githubRepo: 'snapmind',
  branch: 'main',
  docsPath: 'docs/legal',

  // 缓存配置
  cacheMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
  requestTimeout: 10000, // 10 秒
};

// ============================================================================
// 缓存键名
// ============================================================================

const CACHE_KEYS = {
  PRIVACY_POLICY: '@snapmind/legal/privacy',
  TERMS_OF_SERVICE: '@snapmind/legal/terms',
};

function getCacheKey(docType: DocumentType): string {
  return docType === 'privacy_policy' ? CACHE_KEYS.PRIVACY_POLICY : CACHE_KEYS.TERMS_OF_SERVICE;
}

// ============================================================================
// URL 构建
// ============================================================================

function getGitHubRawUrl(filename: string): string {
  const { githubOwner, githubRepo, branch, docsPath } = LEGAL_CONFIG;
  return `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${branch}/${docsPath}/${filename}`;
}

// ============================================================================
// 本地文件导入（开发阶段临时方案）
// ============================================================================

async function loadLocalDocument(docType: DocumentType): Promise<{ content: string; version: string }> {
  if (docType === 'privacy_policy') {
    // 读取本地 markdown 文件
    const fs = await import('expo-file-system');
    const content = await fs.FileSystem.readAsStringAsync(
      fs.FileSystem.documentDirectory + 'docs/legal/privacy-policy.md'
    );
    return { content, version: '2026-05-26-v1' };
  } else {
    const fs = await import('expo-file-system');
    const content = await fs.FileSystem.readAsStringAsync(
      fs.FileSystem.documentDirectory + 'docs/legal/terms-of-service.md'
    );
    return { content, version: '2026-05-26-v1' };
  }
}

// ============================================================================
// 网络请求
// ============================================================================

async function fetchDocumentFromGitHub(docType: DocumentType): Promise<{ content: string; version: string } | null> {
  try {
    const filename = docType === 'privacy_policy' ? 'privacy-policy.md' : 'terms-of-service.md';
    const url = getGitHubRawUrl(filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LEGAL_CONFIG.requestTimeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const content = await response.text();

    // 获取版本号
    const versionUrl = getGitHubRawUrl('version.json');
    const versionResponse = await fetch(versionUrl);
    let version = 'unknown';
    if (versionResponse.ok) {
      const versionData = await versionResponse.json();
      version = docType === 'privacy_policy' ? versionData.privacy_policy : versionData.terms_of_service;
    }

    return { content, version };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[Legal] Request timeout');
    } else {
      console.warn('[Legal] Fetch error:', error);
    }
    return null;
  }
}

// ============================================================================
// 缓存操作
// ============================================================================

async function getCachedDocument(docType: DocumentType): Promise<CachedDocument | null> {
  try {
    const key = getCacheKey(docType);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedDocument = JSON.parse(raw);

    // 检查缓存是否过期
    const now = Date.now();
    const lastFetched = new Date(cached.lastFetched).getTime();
    const isExpired = now - lastFetched > LEGAL_CONFIG.cacheMaxAge;

    if (isExpired) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch (error) {
    console.error('[Legal] Cache read error:', error);
    return null;
  }
}

async function setCachedDocument(docType: DocumentType, content: string, version: string): Promise<void> {
  try {
    const key = getCacheKey(docType);
    const cached: CachedDocument = {
      content,
      version,
      lastFetched: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('[Legal] Cache write error:', error);
  }
}

// ============================================================================
// 主导出函数
// ============================================================================

export async function getLegalDocument(docType: DocumentType): Promise<LegalDocumentResult | null> {
  // 1. 先尝试获取缓存
  const cached = await getCachedDocument(docType);

  // 2. 如果有缓存，立即返回（后台更新在后面处理）
  if (cached) {
    // 后台检查更新（不阻塞 UI）
    fetchDocumentFromGitHub(docType).then(async (result) => {
      if (result && result.version !== cached.version) {
        await setCachedDocument(docType, result.content, result.version);
      }
    });

    return {
      content: cached.content,
      lastModified: cached.lastModified,
      usingCached: true,
    };
  }

  // 3. 无缓存，从网络获取
  const result = LEGAL_CONFIG.useLocalFiles
    ? await loadLocalDocument(docType)
    : await fetchDocumentFromGitHub(docType);

  if (!result) {
    return null;
  }

  // 4. 保存到缓存
  await setCachedDocument(docType, result.content, result.version);

  return {
    content: result.content,
    lastModified: new Date().toISOString(),
    usingCached: false,
  };
}

export async function refreshLegalDocument(docType: DocumentType): Promise<LegalDocumentResult | null> {
  const result = LEGAL_CONFIG.useLocalFiles
    ? await loadLocalDocument(docType)
    : await fetchDocumentFromGitHub(docType);

  if (!result) {
    return null;
  }

  await setCachedDocument(docType, result.content, result.version);

  return {
    content: result.content,
    lastModified: new Date().toISOString(),
    usingCached: false,
  };
}

export async function clearLegalCache(docType?: DocumentType): Promise<void> {
  if (docType) {
    await AsyncStorage.removeItem(getCacheKey(docType));
  } else {
    await AsyncStorage.multiRemove([CACHE_KEYS.PRIVACY_POLICY, CACHE_KEYS.TERMS_OF_SERVICE]);
  }
}
```

- [ ] **Step 2: 修正本地文件导入方案**

由于 expo-file-system 不能直接读取项目源码中的文件，需要修改为使用 `require` 直接导入本地 markdown：

```typescript
// 将 loadLocalDocument 函数替换为：
async function loadLocalDocument(docType: DocumentType): Promise<{ content: string; version: string }> {
  // 使用 require 导入本地 markdown 文件
  if (docType === 'privacy_policy') {
    const content = require('../../docs/legal/privacy-policy.md');
    return { content, version: '2026-05-26-v1' };
  } else {
    const content = require('../../docs/legal/terms-of-service.md');
    return { content, version: '2026-05-26-v1' };
  }
}
```

- [ ] **Step 3: 添加 TypeScript 声明以支持 .md 导入**

创建或更新 `types.d.ts` 在项目根目录：

```typescript
declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const value: any;
  export default value;
}
```

- [ ] **Step 4: 提交**

```bash
git add services/legal.ts types.d.ts
git commit -m "feat: 创建法律文档服务（缓存 + 网络获取）"
```

---

## Task 4: 创建法律文档共用布局

**Files:**
- Create: `app/legal/_layout.tsx`

- [ ] **Step 1: 创建布局文件**

创建 `app/legal/_layout.tsx`：

```typescript
import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

export default function LegalLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        navigationBarHidden: true,
      }}
    >
      <Stack.Screen
        name="privacy"
        options={{
          title: '隐私政策',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: '服务条款',
        }}
      />
    </Stack>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/legal/_layout.tsx
git commit -m "feat: 创建法律文档共用布局"
```

---

## Task 5: 创建隐私政策页面

**Files:**
- Create: `app/legal/privacy.tsx`

- [ ] **Step 1: 创建隐私政策页面**

创建 `app/legal/privacy.tsx`：

```typescript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { getLegalDocument, refreshLegalDocument, clearLegalCache } from '../../services/legal';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';

interface CachedInfo {
  lastModified: string;
  usingCached: boolean;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CachedInfo | null>(null);

  const loadDocument = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const result = await getLegalDocument('privacy_policy');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: result.usingCached,
      });
    } else {
      setError('无法加载内容，请检查网络连接');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    const result = await refreshLegalDocument('privacy_policy');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: false,
      });
    } else {
      setError('刷新失败，请稍后重试');
    }

    setRefreshing(false);
  }, []);

  const handleRetry = useCallback(() => {
    loadDocument();
  }, [loadDocument]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>隐私政策</Text>
        </SafeAreaView>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && !content) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>隐私政策</Text>
        </SafeAreaView>
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={64} color={colors.outlineVariant} />
          <Text style={[styles.errorTitle, { color: colors.onSurface }]}>加载失败</Text>
          <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.primary }]}>隐私政策</Text>
          {cacheInfo?.lastModified && (
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              更新于 {formatDate(cacheInfo.lastModified)}
            </Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {cacheInfo?.usingCached && (
          <View style={[styles.cachedNotice, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.cachedNoticeText, { color: colors.onSurfaceVariant }]}>
              显示的是缓存版本
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {content && (
          <Markdown
            style={{
              body: { color: colors.onSurface, fontSize: 16, lineHeight: 24 },
              heading1: { color: colors.primary, fontSize: 28, fontWeight: '700', marginTop: 16, marginBottom: 8 },
              heading2: { color: colors.primary, fontSize: 22, fontWeight: '600', marginTop: 12, marginBottom: 6 },
              heading3: { color: colors.onSurface, fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 4 },
              paragraph: { marginBottom: 12 },
              list_item: { marginBottom: 4, flexDirection: 'row' },
              bullet_list: { marginLeft: 16, marginBottom: 12 },
              strong: { fontWeight: '700' },
              link: { color: colors.primary, textDecorationLine: 'underline' },
            }}
          >
            {content}
          </Markdown>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  cachedNoticeText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
});
```

- [ ] **Step 2: 提交**

```bash
git add app/legal/privacy.tsx
git commit -m "feat: 创建隐私政策页面（支持刷新和缓存）"
```

---

## Task 6: 创建服务条款页面

**Files:**
- Create: `app/legal/terms.tsx`

- [ ] **Step 1: 创建服务条款页面**

创建 `app/legal/terms.tsx`（与隐私政策页面类似，但针对服务条款）：

```typescript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { getLegalDocument, refreshLegalDocument } from '../../services/legal';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';

interface CachedInfo {
  lastModified: string;
  usingCached: boolean;
}

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CachedInfo | null>(null);

  const loadDocument = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const result = await getLegalDocument('terms_of_service');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: result.usingCached,
      });
    } else {
      setError('无法加载内容，请检查网络连接');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    const result = await refreshLegalDocument('terms_of_service');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: false,
      });
    } else {
      setError('刷新失败，请稍后重试');
    }

    setRefreshing(false);
  }, []);

  const handleRetry = useCallback(() => {
    loadDocument();
  }, [loadDocument]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
        </SafeAreaView>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && !content) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
        </SafeAreaView>
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={64} color={colors.outlineVariant} />
          <Text style={[styles.errorTitle, { color: colors.onSurface }]}>加载失败</Text>
          <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
          {cacheInfo?.lastModified && (
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              更新于 {formatDate(cacheInfo.lastModified)}
            </Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {cacheInfo?.usingCached && (
          <View style={[styles.cachedNotice, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.cachedNoticeText, { color: colors.onSurfaceVariant }]}>
              显示的是缓存版本
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {content && (
          <Markdown
            style={{
              body: { color: colors.onSurface, fontSize: 16, lineHeight: 24 },
              heading1: { color: colors.primary, fontSize: 28, fontWeight: '700', marginTop: 16, marginBottom: 8 },
              heading2: { color: colors.primary, fontSize: 22, fontWeight: '600', marginTop: 12, marginBottom: 6 },
              heading3: { color: colors.onSurface, fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 4 },
              paragraph: { marginBottom: 12 },
              list_item: { marginBottom: 4, flexDirection: 'row' },
              bullet_list: { marginLeft: 16, marginBottom: 12 },
              strong: { fontWeight: '700' },
              link: { color: colors.primary, textDecorationLine: 'underline' },
            }}
          >
            {content}
          </Markdown>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  cachedNoticeText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
});
```

- [ ] **Step 2: 提交**

```bash
git add app/legal/terms.tsx
git commit -m "feat: 创建服务条款页面（支持刷新和缓存）"
```

---

## Task 7: 连接设置页面的导航

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: 更新设置页面的法律链接**

找到 `app/(tabs)/settings.tsx` 第 229-236 行，替换为：

```typescript
<TouchableOpacity
  style={[styles.aboutLink, { borderColor: colors.primary }]}
  onPress={() => router.push('/legal/terms')}
>
  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
  <Text style={[styles.aboutLinkText, { color: colors.primary }]}>服务条款</Text>
</TouchableOpacity>
<TouchableOpacity
  style={[styles.aboutLink, { borderColor: colors.primary }]}
  onPress={() => router.push('/legal/privacy')}
>
  <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
  <Text style={[styles.aboutLinkText, { color: colors.primary }]}>隐私政策</Text>
</TouchableOpacity>
```

- [ ] **Step 2: 提交**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat: 连接设置页面的隐私政策和服务条款导航"
```

---

## Task 8: 修复服务导入（如果需要）

**Files:**
- Modify: `services/index.ts`

- [ ] **Step 1: 添加法律文档导出**

如果项目有 `services/index.ts`，添加：

```typescript
export * from './legal';
```

- [ ] **Step 2: 提交**

```bash
git add services/index.ts
git commit -m "feat: 导出法律文档服务"
```

---

## Task 9: 本地测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm start
```

- [ ] **Step 2: 在 Expo Go 中测试**

1. 扫描二维码打开应用
2. 进入"设置"页面
3. 点击"服务条款"链接 → 应该能正常打开并显示内容
4. 点击"隐私政策"链接 → 应该能正常打开并显示内容
5. 测试返回按钮
6. 测试下拉刷新
7. 测试加载状态显示
8. 测试深色/浅色主题切换

- [ ] **Step 3: 验证缓存功能**

1. 完全关闭应用
2. 重新打开应用
3. 进入法律文档页面 → 应该显示"缓存版本"提示
4. 下拉刷新 → 应该能正常更新

- [ ] **Step 4: 验证错误处理**

1. 开启飞行模式
2. 清除应用缓存
3. 尝试访问法律文档 → 应该显示错误提示和重试按钮

---

## Task 10: 更新 Metro 配置（支持 .md 导入）

**Files:**
- Modify: `metro.config.js`

- [ ] **Step 1: 更新 Metro 配置**

在项目根目录找到或创建 `metro.config.js`，添加对 .md 文件的支持：

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加对 .md 文件的支持
config.resolver.sourceExts = [...config.resolver.sourceExts, 'md'];

module.exports = config;
```

- [ ] **Step 2: 重启开发服务器**

停止并重新启动 `npm start`

- [ ] **Step 3: 提交**

```bash
git add metro.config.js
git commit -m "feat: 支持 .md 文件导入"
```

---

## 完成后的后续步骤

### 1. 迁移到 GitHub（生产环境）

当准备部署到生产环境时：

1. 在项目 GitHub 仓库创建 `docs/legal/` 目录
2. 将 `privacy-policy.md` 和 `terms-of-service.md` 推送到仓库
3. 更新 `services/legal.ts` 中的配置：
   - 设置 `useLocalFiles: false`
   - 填写实际的 `githubOwner` 和 `githubRepo`
4. 测试网络获取功能

### 2. 测试清单

- [ ] 首次加载（无缓存）
- [ ] 有缓存加载
- [ ] 版本更新检测
- [ ] 下拉刷新
- [ ] 离线模式
- [ ] 网络超时处理
- [ ] 加载状态显示
- [ ] 错误状态显示
- [ ] Markdown 渲染正确
- [ ] 深色/浅色主题适配
- [ ] 返回导航

---

**计划完成！** 所有功能已分解为可执行的步骤。
