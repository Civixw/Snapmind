# 设置页面功能设计文档

**日期:** 2026-05-26
**状态:** 设计阶段
**相关文件:** `app/(tabs)/settings.tsx`

## 概述

为 SnapMind 应用实现设置页面的占位符功能，包括深色模式切换和敏感内容检测提醒。

## 功能范围

### 包含功能
1. **外观与主题** - 深色模式切换（浅色/深色/跟随系统）
2. **隐私与安全** - AI 敏感内容检测和提醒

### 暂不实现
- ~~通知设置~~ - 留待后续迭代

## 架构设计

### 深色模式架构

#### 文件结构
```
constants/
  theme.ts          # 扩展为 light/dark 两套主题
contexts/
  ThemeContext.tsx  # 主题上下文和 Provider
hooks/
  useTheme.ts       # 便捷 hook
```

#### 主题上下文

```typescript
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}
```

#### 持久化
- 存储: `@react-native-async-storage/async-storage`
- Key: `snapmind_theme_mode`
- 默认值: `'system'`

### 敏感内容检测架构

#### 数据类型

```typescript
type SensitiveFlag =
  | 'id_card'        // 身份证
  | 'bank_card'      // 银行卡
  | 'phone'          // 电话号码
  | 'chat_record'    // 聊天记录
  | 'password'       // 密码类
  | 'private_photo'; // 私密照片

interface AnalysisResult {
  // ... 现有字段
  sensitiveFlags?: SensitiveFlag[];
}
```

#### 数据库变更

```sql
ALTER TABLE screenshots ADD COLUMN sensitive_flags TEXT;
-- 存储 JSON 数组格式：["id_card", "phone"]
```

## UI 设计

### 深色模式 UI

#### 设置页面更新

在 `settings.tsx` 中更新"外观与主题"行：

```typescript
// 点击后跳转到主题设置子页面或展开面板
<TouchableOpacity onPress={() => router.push('/settings/appearance')}>
  <SettingRow icon="color-palette-outline" label="外观与主题" />
</TouchableOpacity>
```

#### 主题选择器

```typescript
<View style={styles.segmentedControl}>
  <ThemeModeButton mode="light" icon="sunny" label="浅色" />
  <ThemeModeButton mode="dark" icon="moon" label="深色" />
  <ThemeModeButton mode="system" icon="phone-portrait" label="跟随系统" />
</View>

<Text style={styles.previewHint}>
  当前：{activeTheme === 'dark' ? '深色模式' : '浅色模式'}
</Text>
```

### 敏感内容 UI

#### 截图卡片更新

- 有敏感标记的卡片显示 🔒 或 ⚠️ 图标
- 可折叠显示具体敏感类型

#### 隐私设置页面

```
隐私与安全
├── 敏感内容提醒
│   ├── 显示敏感标记 [开关]
│   ├── 自动隐藏敏感截图 [开关]
│   └── 查看所有敏感截图 [按钮]
└── 敏感内容统计
    └── 检测到 X 张敏感截图
```

## 主题配色方案

### Light Theme (现有)
```typescript
export const lightTheme = {
  background: '#FFF5ED',
  primary: '#AB3500',
  onSurface: '#2D1F1A',
  // ... 其他颜色
};
```

### Dark Theme (新增)
```typescript
export const darkTheme = {
  background: '#1A1A1A',
  primary: '#FF6B35',
  onSurface: '#F5E6D3',
  surfaceContainerLow: 'rgba(255,255,255,0.05)',
  // ... 对应的深色配色
};
```

## 数据流

### 深色模式流程

```
用户选择模式
    ↓
存储到 AsyncStorage
    ↓
ThemeProvider 读取 + 监听系统主题
    ↓
更新 Context activeTheme
    ↓
组件通过 useTheme() 获取并重渲染
```

### 敏感检测流程

```
导入图片
    ↓
analyzeScreenshot() 调用 GPT
    ↓
返回分析结果 + sensitiveFlags
    ↓
插入数据库 (包含 sensitive_flags)
    ↓
ScreenshotCard 读取并显示图标
    ↓
隐私设置控制可见性
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| AsyncStorage 读写失败 | 使用默认值 `system`，记录警告日志 |
| 数据库迁移失败 | 捕获异常，显示错误提示，允许重试 |
| AI 敏感检测超时 | 保存截图但 `sensitive_flags` 为 `null` |
| 主题切换卡顿 | 添加加载状态，使用防抖 |
| 老数据兼容 | `sensitive_flags` 为 `NULL` 视为无敏感信息 |

## 组件适配清单

需要适配深色模式的组件：
- [ ] `GlassCard` - 背景透明度和边框颜色
- [ ] `ScreenshotCard` - 卡片背景和文字颜色
- [ ] `SearchBar` - 输入框背景和文字颜色
- [ ] `ImportModal` - 模态框背景
- [ ] `CategoryFilter` - 分类按钮样式
- [ ] `TagChip` - 标签样式

**适配策略：**
- 所有颜色从 `colors` 常量读取（不硬编码）
- 在 `app/_layout.tsx` 根节点包裹 `ThemeProvider`
- 现有组件无需大改，只需确保使用正确的颜色键

## AI 提示词更新

在 `ai.ts` 的 `analyzeScreenshot()` 函数中更新提示词，添加敏感信息检测：

```typescript
const prompt = `
请分析这张截图并提供以下信息：
1. OCR 文字识别
2. 内容摘要
3. 分类
4. 敏感信息检测

如果检测到以下敏感信息类型，请在 sensitive_flags 中返回：
- id_card: 身份证、护照等证件
- bank_card: 银行卡、信用卡
- phone: 电话号码
- chat_record: 聊天记录、对话内容
- password: 密码、验证码
- private_photo: 私密照片、不雅内容

...
`;
```

## 测试计划

### 深色模式测试

**手动测试清单：**
- [ ] 三种模式切换（浅色/深色/系统）都能正确生效
- [ ] 跟随系统时，系统切换主题能响应
- [ ] 所有页面在不同主题下显示正常
- [ ] 重启应用后用户选择被保留
- [ ] Web 平台深色模式正常工作

**关键测试页面：**
- 首页（截图网格）
- 搜索页
- 详情页
- 设置页
- 导入弹窗

### 敏感检测测试

**功能测试：**
- [ ] 导入包含身份证/银行卡的图片能正确标记
- [ ] 导入普通图片不产生误报
- [ ] 隐私开关能正确控制敏感内容显示
- [ ] "查看所有敏感截图"筛选功能正常

**测试数据准备：**
- 准备测试图片（身份证、银行卡截图）
- 准备普通截图作为对照组

### 兼容性测试
- [ ] iOS 平台
- [ ] Android 平台
- [ ] Web 平台
- [ ] 老数据升级后不崩溃

## 实现顺序

1. **阶段一：深色模式基础**
   - 创建 `ThemeContext.tsx`
   - 扩展 `theme.ts` 添加 darkTheme
   - 更新 `_layout.tsx` 包裹 Provider

2. **阶段二：设置页面 UI**
   - 创建主题设置子页面/组件
   - 创建隐私设置子页面/组件

3. **阶段三：敏感检测后端**
   - 更新 `ai.ts` 提示词
   - 数据库迁移添加 `sensitive_flags`

4. **阶段四：敏感检测 UI**
   - 更新 `ScreenshotCard` 显示敏感图标
   - 实现隐私设置开关功能

## 依赖项

需要安装的包（如果没有）：
- `@react-native-async-storage/async-storage` - 用于持久化主题模式

## 备注

- 用户要求不自动提交代码，所有 git 操作由用户手动处理
- 敏感检测准确性依赖于 GPT-4o-mini，可能需要多次调优提示词
- 深色模式切换应添加平滑过渡动画提升体验
