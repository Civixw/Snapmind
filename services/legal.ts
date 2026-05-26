import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { storageAdapter } from '../store/persist';

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
  PRIVACY_POLICY: 'snapmind_legal_privacy',
  TERMS_OF_SERVICE: 'snapmind_legal_terms',
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
  // 直接嵌入 markdown 内容（避免 Metro 解析 .md 文件的问题）
  const privacyContent = `# 隐私政策

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

本隐私政策可能会不时更新。重大变更会通过应用内通知告知用户。

---

如有任何疑问，请联系：support@snapmind.app`;

  const termsContent = `# 服务条款

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

感谢您使用 SnapMind！`;

  if (docType === 'privacy_policy') {
    return { content: privacyContent, version: '2026-05-26-v1' };
  } else {
    return { content: termsContent, version: '2026-05-26-v1' };
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
    const raw = await storageAdapter.getItem(key);

    if (!raw) return null;

    const cached: CachedDocument = JSON.parse(raw);

    // 检查缓存是否过期
    const now = Date.now();
    const lastFetched = new Date(cached.lastFetched).getTime();
    const isExpired = now - lastFetched > LEGAL_CONFIG.cacheMaxAge;

    if (isExpired) {
      await storageAdapter.removeItem(key);
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
    await storageAdapter.setItem(key, JSON.stringify(cached));
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
    await storageAdapter.removeItem(getCacheKey(docType));
  } else {
    await storageAdapter.removeItem(CACHE_KEYS.PRIVACY_POLICY);
    await storageAdapter.removeItem(CACHE_KEYS.TERMS_OF_SERVICE);
  }
}
