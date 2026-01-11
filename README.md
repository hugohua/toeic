# TOEIC 托业背单词 (TOEIC Learning)

一个基于 React 的全功能背单词 H5 应用，专为英语学习者设计。支持多场景词库、艾宾浩斯智能复习、AI 语音随身听以及文章阅读学习功能。

## ✨ 核心特性

- 📚 **多场景词库**: 内置 20+ 个专业场景分类，涵盖职场、商务、营销、物流、财务等高频领域。
- 🎯 **智能记忆算法**: 基于**艾宾浩斯遗忘曲线**，自动计算并安排最佳复习时间点。
- 🎧 **AI 随身听 (Walkman)**: 
  - 支持单词自动播放，可后台运行。
  - 自定义播放模式：单词+释义、单词+例句、仅单词等。
  - 支持倍速播放、循环次数及间隔时间设置。
- � **超拟真 AI 语音**: 
  - 集成**阿里云 DashScope (Qwen3-TTS)** 大模型，提供媲美真人的语音合成。
  - 采用 **Stream-and-Save** 策略，支持流式播放并自动缓存音频，节省流量且响应迅速。
- � **沉浸式阅读**: 
  - 支持导入英文文章，阅读中即点（选）即查。
  - 自动高亮文中的生词，实现语境记忆。
- � **笔记与构词法**: 
  - 支持为文章添加富文本笔记。
  - **AI 智能构词分析**: 自动生成词根词缀解析，辅助深度记忆。
- 📊 **数据可视化**: 个人中心提供详细的学习进度和记忆状态统计。
- � **隐私优先**: 采用 SQLite + LocalStorage 本地存储方案，数据完全掌控在用户手中。

## 🛠️ 技术栈

### 前端 (Client)
- **核心框架**: React 18.2.0
- **路由管理**: React Router DOM 6.20.0 (SPA)
- **构建工具**: Webpack 5 (Babel, CSS Loader)
- **UI 样式**: Vanilla CSS + CSS Modules
- **Markdown 渲染**: react-markdown + remark-gfm

### 后端 (Server)
- **运行时**: Node.js
- **Web 框架**: Express 4.18.2
- **数据库**: SQLite 3 (`better-sqlite3`)
- **AI 接入**: OpenAI SDK (对接阿里云 DashScope)
- **实时通信**: WebSocket (`ws`)

### TTS 语音微服务
- **语言**: Python 3.8+
- **框架**: FastAPI + Uvicorn
- **模型**: Aliyun Qwen3-TTS (Flash Model)
- **通信**: WebSocket (流式传输)

## 🚀 快速开始

### 环境依赖
- Node.js >= 16.0.0
- npm >= 8.0.0
- Python >= 3.8 (用于 TTS 服务)

### 安装
```bash
# 1. 安装 Node.js 依赖
npm install

# 2. 准备 Python 环境 (推荐使用 venv)
cd python_tts_service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 环境变量
在项目根目录创建 `.env` 文件，配置以下内容：
```env
OPENAI_API_KEY=sk-xxxxxx  # 阿里云 DashScope API Key
PORT=3001                 # 后端端口
```

### 启动开发环境
```bash
# 同时启动前端、后端 API 和 Python TTS 服务
npm run dev
```
应用将在 `http://localhost:3000` 启动。

### 生产构建
```bash
npm run build       # 构建前端静态资源
npm start           # 启动生产服务器
```

## 📁 目录结构

```
tuoye/
├── public/                 # 静态资源 (音频缓存 audio/ 位于此处)
├── src/
│   ├── components/         # React 组件 (Header, AudioPlayer, BottomSheet 等)
│   ├── pages/              # 页面组件
│   │   ├── HomePage.js         # 场景选择首页
│   │   ├── PlaylistPage.js     # 随身听播放页
│   │   ├── WordStudyPage.js    # 沉浸学习页
│   │   ├── WordDetailPage.js   # 单词详情页
│   │   ├── Article*.js         # 文章阅读相关页面
│   │   └── ...
│   ├── hooks/              # Custom Hooks (usePlaylistAudio, useAliyunAudio 等)
│   ├── services/           # API 服务 (TTS, OpenAI, Storage)
│   ├── utils/              # 工具函数 (Ebbinghaus 算法, 文本处理)
│   ├── db/                 # 前端数据库适配
│   ├── styles/             # 全局样式
│   └── App.js              # 路由配置
├── server.js               # Node.js 后端服务器 (API + 静态资源托管)
├── python_tts_service/     # TTS 独立微服务
│   ├── main.py             # FastAPI WebSocket 服务端
│   └── requirements.txt    # Python 依赖
├── data/                   # SQLite 数据库文件 (words.db)
└── webpack.config.js       # Webpack 配置
```

## 🎓 学习场景示例
应用内置 20+ 个场景，包括但不限于：
-  市场营销与推广
- � 商务沟通与会议
-  产品与技术
- ⚖️ 法律法规与政策
- 🏥 医疗与健康
- � 财务与会计

## 📄 许可证
MIT License
