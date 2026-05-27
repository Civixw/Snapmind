# SnapMind

一款基于 AI 的智能截图管理应用，帮助您快速保存、搜索和组织截图内容。

## 功能特点

- 📸 **智能导入** - 批量导入截图，支持多图选择
- 🔍 **双重搜索** - 关键词搜索 + 语义搜索，快速找到目标内容
- 🤖 **AI 分析** - 自动识别文字、分类、生成摘要和标签
- 💾 **本地存储** - 所有数据存储在本地，保护隐私
- 🏷️ **智能分类** - 自动归类：美食、购物、旅行、聊天、学习、健身、灵感、待办
- 🎨 **现代 UI** - 玻璃态设计，流畅的交互体验

## 技术栈

- **框架**: React Native 0.76.9 + Expo SDK 52
- **路由**: expo-router (文件路由)
- **数据库**: expo-sqlite (支持 FTS5 全文搜索)
- **状态管理**: Zustand
- **AI 服务**: OpenAI API (gpt-4o-mini, text-embedding-3-small)
- **语言**: TypeScript

## 前置要求

- Node.js 18+
- npm 或 yarn
- Expo Go app (用于测试)
- OpenAI API Key

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd snapmind

# 安装依赖
npm install

# 启动开发服务器
npm start
```

## 开发命令

```bash
# 启动开发服务器
npm start

# 在 Android 设备上运行
npm run android

# 在 iOS 设备上运行
npm run ios

# 在浏览器中运行
npm run web
```

## 配置 API Key

1. 在应用中进入「设置」页面
2. 输入您的 OpenAI API Key
3. API Key 将安全存储在本地

## 项目结构

```
snapmind/
├── app/                    # 文件路由页面
│   ├── (tabs)/            # 标签页导航
│   │   ├── index.tsx      # 首页时间线
│   │   ├── search.tsx     # 搜索页面
│   │   ├── vault.tsx      # 保险库
│   │   └── settings.tsx   # 设置页面
│   ├── detail/[id].tsx    # 详情页
│   └── _layout.tsx        # 根布局
├── services/              # 服务层
│   ├── database.native.ts # SQLite 数据库操作
│   ├── ai.ts             # OpenAI API 集成
│   └── image.ts          # 图片文件操作
├── store/                # 状态管理
│   ├── index.ts          # 导出 useStore
│   ├── useStore.ts       # Zustand store
│   └── persist.ts        # 持久化适配器
└── components/           # 可复用组件
    ├── ImportModal.tsx   # 导入模态框
    ├── ScreenshotCard.tsx # 截图卡片
    ├── CategoryFilter.tsx # 分类筛选
    └── ...
```

## 数据结构

```typescript
interface Screenshot {
  id: string;
  image_path: string;   // 本地图片路径
  raw_text: string;     // OCR 识别的文字
  summary: string;      // AI 生成的摘要
  category: string;     // 分类
  tags: string;         // JSON 数组格式的标签
  embedding: string;    // JSON 数组格式的向量
  created_at: string;   // 创建时间
}
```

## 支持的分类

- 🍔 美食
- 🛍️ 购物
- ✈️ 旅行
- 💬 聊天
- 📚 学习
- 💪 健身
- 💡 灵感
- ✅ 待办

## 隐私说明

- 所有截图和数据均存储在本地设备
- 仅在分析时调用 OpenAI API
- API Key 安全存储在本地，不会上传
- 不收集任何用户数据

## License

MIT

---

Made with ❤️ using Expo
