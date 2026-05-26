# 隐私政策与服务条款功能设计文档

**日期：** 2026-05-26
**项目：** SnapMind
**功能：** 应用内隐私政策和服务条款展示（支持远程更新）

---

## 1. 概述

### 1.1 目标
为 SnapMind 应用添加完整的隐私政策和服务条款展示功能，满足法律合规要求，同时通过远程配置机制实现内容的灵活更新。

### 1.2 核心需求
- 应用内页面展示（保持体验一致性）
- 强调本地存储、敏感内容保护、数据删除权
- 明确 AI 功能免责声明
- 支持远程更新（无需发版）
- 离线可用（缓存机制）

---

## 2. 架构设计

### 2.1 文件结构

```
app/legal/
├── _layout.tsx          # 法律文档共用布局
├── privacy.tsx          # 隐私政策页面
└── terms.tsx            # 服务条款页面

services/
└── legal.ts             # 法律文档服务（获取 + 缓存）

GitHub 仓库 /docs/legal/
├── privacy-policy.md    # 隐私政策 Markdown 源文件
├── terms-of-service.md  # 服务条款 Markdown 源文件
└── version.json         # 版本号配置
```

### 2.2 技术栈
- **路由：** expo-router（已有）
- **Markdown 渲染：** react-native-markdown-display（新增）
- **缓存：** @react-native-async-storage/async-storage（已有）
- **主题：** 现有的 ThemeContext

### 2.3 远程存储方案
使用 GitHub Raw 内容托管，无需额外服务器：

**配置说明：** 需要在 `services/legal.ts` 中配置实际的仓库信息：
```typescript
const LEGAL_CONFIG = {
  githubOwner: 'your-username',      // 替换为实际的 GitHub 用户名
  githubRepo: 'snapmind',            // 替换为实际的仓库名
  branch: 'main',                    // 默认分支
  docsPath: 'docs/legal'             // 文档路径
};
```

**实际 URLs：**
- 隐私政策：`https://raw.githubusercontent.com/{配置的githubOwner}/{配置的githubRepo}/main/docs/legal/privacy-policy.md`
- 服务条款：`https://raw.githubusercontent.com/{配置的githubOwner}/{配置的githubRepo}/main/docs/legal/terms-of-service.md`
- 版本配置：`https://raw.githubusercontent.com/{配置的githubOwner}/{配置的githubRepo}/main/docs/legal/version.json`

---

## 3. 数据流与缓存策略

### 3.1 缓存数据结构

```typescript
interface CachedDocument {
  content: string;        // Markdown 内容
  version: string;        // 版本号
  lastFetched: string;    // 最后获取时间（ISO 8601）
  lastModified: string;   // 文档最后修改时间
}

// AsyncStorage 键名
const CACHE_KEYS = {
  PRIVACY_POLICY: '@snapmind/legal/privacy',
  TERMS_OF_SERVICE: '@snapmind/legal/terms',
};
```

### 3.2 加载流程

1. **页面挂载**
2. **检查本地缓存** → 如果存在，立即显示
3. **发起网络请求** → 后台获取最新版本
4. **比对版本号**
5. **如果版本更新** → 更新缓存并刷新显示
6. **如果网络失败** → 继续使用缓存版本

### 3.2.1 缓存有效期策略

- **版本驱动：** 主要通过版本号判断是否需要更新
- **时间兜底：** 缓存最多保留 30 天，超期后强制重新获取
- **手动刷新：** 用户可通过下拉刷新强制更新
- **优先级：** 版本号 > 时间兜底 > 缓存存在

### 3.3 版本检测机制

```typescript
// version.json 格式
{
  "privacy_policy": "2026-05-26-v1",
  "terms_of_service": "2026-05-26-v1"
}
```

---

## 4. 组件设计

### 4.1 共用布局 (app/legal/_layout.tsx)

提供统一的导航栏和容器样式：
- 返回按钮
- 标题
- 最后更新时间显示
- 与设置页一致的视觉风格

### 4.2 主页面组件

**功能：**
- 顶部导航栏
- 下拉刷新
- 加载状态指示器
- 错误状态处理
- Markdown 内容渲染
- 深色/浅色主题适配

**状态管理：**
```typescript
interface LegalDocumentState {
  loading: boolean;
  refreshing: boolean;
  content: string | null;
  error: string | null;
  lastModified: string | null;
  usingCached: boolean;
}
```

### 4.3 错误状态组件

**场景处理：**
- 首次加载无网络且无缓存
- 网络超时（10秒）
- GitHub 请求失败（404/403/500）
- 内容解析失败

**UI 元素：**
- 错误图标
- 错误描述
- 重试按钮
- 缓存版本提示（如果可用）

---

## 5. 内容要点

### 5.1 隐私政策核心内容

**必须包含：**
1. **本地存储强调**
   - 所有截图数据存储在用户设备本地
   - 不上传到任何云端服务器
   - 用户完全控制自己的数据

2. **敏感内容保护**
   - 敏感内容检测机制说明
   - 标记和存储方式
   - 用户可控制显示/隐藏

3. **AI 处理透明化**
   - OpenAI API 用于图像分析
   - 图片发送到 OpenAI 服务器进行处理
   - OpenAI 不存储用户数据（参考其隐私政策）
   - API Key 由用户自行管理

4. **数据删除权**
   - 用户可随时删除所有数据
   - 删除操作不可逆
   - 清空数据的功能位置

5. **第三方服务**
   - OpenAI API 的使用
   - 不涉及其他数据共享

6. **政策更新**
   - 远程更新机制说明
   - 重大变更会通知用户

### 5.2 服务条款核心内容

**必须包含：**
1. **服务描述**
   - SnapMind 是一个本地截图管理工具
   - 提供 AI 驱动的分析和搜索功能

2. **免责声明**
   - AI 分析结果不保证 100% 准确
   - 用户需自行判断和使用分析结果
   - 开发者不对 AI 错误造成的损失负责

3. **用户责任**
   - 妥善保管 API Key
   - 遵守 OpenAI 使用条款
   - 不得用于非法目的

4. **服务变更**
   - 功能可能随时调整
   - 不保证服务的持续可用性

5. **责任限制**
   - 按现状提供服务
   - 间接损失免责

---

## 6. 错误处理

### 6.1 网络错误

| 场景 | 处理方式 |
|------|---------|
| 无网络 + 无缓存 | 显示错误，提供重试按钮 |
| 无网络 + 有缓存 | 显示缓存，提示"旧版本" |
| 网络超时（10s） | 使用缓存或显示错误 |
| 404/403/500 | 使用缓存，记录错误 |

### 6.2 内容错误

| 场景 | 处理方式 |
|------|---------|
| Markdown 格式错误 | 降级显示纯文本 |
| 空内容 | 显示"暂无内容"提示 |
| 版本号缺失 | 假设需要更新 |

---

## 7. 导航集成

### 7.1 设置页面修改

在 `app/(tabs)/settings.tsx` 中，更新现有的法律链接按钮：

```typescript
// 第 229-236 行
<TouchableOpacity 
  style={[styles.aboutLink, { borderColor: colors.primary }]}
  onPress={() => router.push('/legal/privacy')}
>
  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
  <Text style={[styles.aboutLinkText, { color: colors.primary }]}>服务条款</Text>
</TouchableOpacity>
<TouchableOpacity 
  style={[styles.aboutLink, { borderColor: colors.primary }]}
  onPress={() => router.push('/legal/terms')}
>
  <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
  <Text style={[styles.aboutLinkText, { color: colors.primary }]}>隐私政策</Text>
</TouchableOpacity>
```

---

## 8. 依赖清单

### 8.1 新增依赖

```bash
npm install react-native-markdown-display@7.0.2
```

**注意：** 使用 7.x 版本以兼容 Expo SDK 52 和 React Native 0.76.9

### 8.2 已有依赖
- expo-router
- @react-native-async-storage/async-storage
- @expo/vector-icons

---

## 9. 测试计划

### 9.1 功能测试
- [ ] 首次加载（无缓存）
- [ ] 有缓存加载
- [ ] 版本更新检测
- [ ] 下拉刷新
- [ ] 离线模式
- [ ] 网络超时处理

### 9.2 UI 测试
- [ ] 加载状态显示
- [ ] 错误状态显示
- [ ] Markdown 渲染正确
- [ ] 深色/浅色主题适配
- [ ] 返回导航

### 9.3 边界测试
- [ ] GitHub 返回空内容
- [ ] Markdown 格式异常
- [ ] 缓存数据损坏
- [ ] 版本号格式错误

---

## 10. 实施优先级

### Phase 1（核心功能）
1. 创建 `services/legal.ts` 服务
2. 创建 `app/legal/_layout.tsx` 布局
3. 实现 `app/legal/privacy.tsx` 页面
4. 实现 `app/legal/terms.tsx` 页面
5. 连接设置页面的导航

### Phase 2（增强功能）
1. 添加下拉刷新
2. 优化错误处理
3. 添加版本更新提示

### Phase 3（内容完善）
1. 编写完整的隐私政策内容
2. 编写完整的服务条款内容
3. 创建 GitHub 仓库文件

---

## 11. 风险与限制

### 11.1 已知风险
- **GitHub Raw 访问限制：** 国内用户可能访问缓慢或失败
  - 缓解方案：缓存机制，离线可用
- **Markdown 渲染性能：** 长文档可能影响性能
  - 缓解方案：内容保持简洁，必要时分页

### 11.2 功能限制
- 不支持实时协作编辑
- 版本更新需要用户刷新页面或下次打开
- 无法推送重大更新通知（可后续添加）

---

## 12. 未来扩展

### 12.1 可能的增强
- 添加版本历史记录
- 支持多语言切换
- 添加重大变更弹窗提示
- 集成版本检查到应用启动流程

### 12.2 可选优化
- 使用 CDN 加速 GitHub Raw 访问
- 添加政策变更接受确认机制
- 支持政策搜索功能

---

**文档版本：** 1.0
**最后更新：** 2026-05-26
