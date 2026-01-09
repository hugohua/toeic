# 拓业背单词 H5 应用

一个基于 React 的背单词 H5 应用，支持多种学习场景，采用艾宾浩斯遗忘曲线算法进行智能复习安排。

## ✨ 功能特性

- 📚 **多场景学习**:20+ 个单词分类,涵盖职场、商务、营销、物流、财务等多个场景
- 🎯 **智能复习**:基于艾宾浩斯遗忘曲线算法,自动安排复习时间
- 🔊 **AI 语音朗读**:集成阿里云 TTS 服务,支持中英文语音播放
- 📖 **多种学习模式**:
  - 学习模式:系统化学习单词
  - 快速浏览:快速查看单词列表
  - 单词列表:查看分类下的所有单词
- 📝 **文章阅读**:导入英文文章,支持选词查询和笔记功能
- 📌 **笔记管理**:为文章添加笔记,记录学习心得
- 🧬 **构词法解析**:AI 生成单词构词法,深入理解词源
- ⭐ **收藏功能**:收藏重要单词,方便复习
- 📊 **学习统计**:记录学习进度和记忆状态
- 📥 **单词导入**:支持批量导入自定义单词
- 🏷️ **分类管理**:自定义创建和管理单词分类
- 💾 **本地存储**:使用 SQLite 数据库和 localStorage,无需登录

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- Python >= 3.8 (用于 TTS 语音服务)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动，支持热更新。

### 生产构建

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 启动生产服务器

```bash
npm start
```

或者使用一键构建并启动：

```bash
npm run serve
```

## 📁 项目结构

```
tuoye/
├── public/              # 静态资源
│   ├── index.html      # HTML 模板
│   ├── favicon.svg     # 网站图标
│   └── audio/          # 音频缓存目录
├── src/
│   ├── components/     # 组件
│   │   ├── Header.js              # 头部组件
│   │   ├── AudioPlayer.js         # 音频播放器
│   │   ├── BottomSheet.js         # 底部弹窗
│   │   ├── EtymologyBottomSheet.js # 构词法弹窗
│   │   ├── WordDetailBottomSheet.js # 单词详情弹窗
│   │   ├── TextSelection.js       # 文本选择组件
│   │   ├── Popup.js               # 提示弹窗
│   │   ├── Loading.js             # 加载组件
│   │   ├── ExampleSentence.js     # 例句组件
│   │   ├── PhraseCell.js          # 短语单元格
│   │   └── ...                    # 其他组件
│   ├── pages/          # 页面
│   │   ├── HomePage.js              # 首页
│   │   ├── WordStudyPage.js         # 学习页面
│   │   ├── WordDetailPage.js        # 单词详情页
│   │   ├── WordBrowsePage.js        # 浏览页面
│   │   ├── WordListPage.js          # 单词列表页
│   │   ├── SpecialWordListPage.js   # 特殊单词列表(收藏/不认识/模糊)
│   │   ├── ArticleListPage.js       # 文章列表页
│   │   ├── ArticleDetailPage.js     # 文章详情页
│   │   ├── WordArticlePage.js       # 单词文章页
│   │   ├── NoteListPage.js          # 笔记列表页
│   │   ├── NoteDetailPage.js        # 笔记详情页
│   │   ├── WordImportPage.js        # 单词导入页
│   │   ├── CategoryAddPage.js       # 分类添加页
│   │   ├── ProfilePage.js           # 个人资料页
│   │   └── TestSpeechPage.js        # 语音测试页
│   ├── hooks/          # 自定义 Hooks
│   │   ├── useAliyunAudio.js      # 阿里云音频 Hook
│   │   ├── useWordList.js         # 单词列表 Hook
│   │   ├── useMemoryStatus.js     # 记忆状态 Hook
│   │   ├── useStudyProgress.js    # 学习进度 Hook
│   │   └── useTextSelection.js    # 文本选择 Hook
│   ├── services/       # 服务层
│   │   ├── openai.js   # OpenAI 服务
│   │   └── tts.js      # TTS 服务
│   ├── utils/          # 工具函数
│   │   ├── app.js      # 应用配置(分类等)
│   │   ├── api.js      # API 请求工具
│   │   ├── storage.js  # 存储工具
│   │   ├── ebbinghaus.js # 艾宾浩斯算法
│   │   └── ...         # 其他工具
│   ├── db/             # 数据库模块
│   │   └── database.js # SQLite 数据库操作
│   ├── styles/         # 样式文件
│   ├── App.js          # 主应用组件
│   ├── index.js        # 入口文件
│   └── index.css       # 全局样式
├── python_tts_service/ # Python TTS 服务
│   ├── main.py         # TTS 服务主程序
│   ├── requirements.txt # Python 依赖
│   └── venv/           # Python 虚拟环境
├── data/               # 数据目录
│   └── words.db        # SQLite 数据库
├── docs/               # 文档目录
├── scripts/            # 脚本目录
├── build/              # 前端构建输出
├── server.js           # Express 服务器
├── webpack.config.js   # Webpack 配置
├── Dockerfile          # Docker 配置
└── package.json        # 项目配置
```

## 🎓 学习场景

应用包含以下 20 个学习场景：

1. 📢 米小勒 - 小红书米小勒博主推荐单词
2. 👔 职场招聘与人才发展
3. 💼 商务沟通与会议
4. 🤝 商务交易与合同
5. 📢 市场营销与推广
6. 🚚 物流与运输
7. 💰 财务与会计
8. 📋 办公行政与文书
9. 💻 产品与技术
10. ⚖️ 法律法规与政策
11. ✈️ 旅行与接待
12. 📚 教育与培训
13. 🏥 医疗与健康
14. 🏗️ 建筑与设施
15. 🍽️ 餐饮与食品
16. 🎨 艺术与文化
17. 🌳 自然与环境
18. 🏛️ 社会与政府
19. 🧠 心理与情感
20. 🔢 数字与科技
21. 📅 时间与日期

## 🧠 艾宾浩斯遗忘曲线

应用采用艾宾浩斯遗忘曲线算法，根据记忆状态自动安排复习时间：

- **认识**：1天、3天、7天、15天、30天、60天
- **模糊**：0.5天、1天、3天、7天、15天、30天
- **不认识**：立即、0.5天、1天、3天、7天、15天

系统会根据你的记忆状态和复习次数，智能安排下次复习时间。

## 📝 可用脚本

- `npm start` - 启动生产服务器
- `npm run dev` - 启动开发环境(同时启动前端、后端和 TTS 服务)
- `npm run dev:server` - 仅启动后端 API 服务器
- `npm run dev:client` - 仅启动前端开发服务器
- `npm run dev:tts` - 仅启动 Python TTS 服务
- `npm run build` - 构建生产版本
- `npm run build:dev` - 构建开发版本
- `npm run serve` - 构建并启动生产服务器
- `npm run format` - 格式化代码
- `npm run format:check` - 检查代码格式
- `npm run import-data` - 导入单词数据到数据库
- `npm run import-categories` - 导入分类数据

## 🛠️ 技术栈

### 前端
- **框架**:React 18.2.0
- **路由**:React Router DOM 6.20.0
- **构建工具**:Webpack 5
- **Markdown 渲染**:react-markdown + remark-gfm
- **代码格式化**:Prettier 3.7.4

### 后端
- **服务器**:Express 4.18.2
- **数据库**:SQLite (better-sqlite3)
- **AI 服务**:OpenAI SDK (阿里云 DashScope)
- **WebSocket**:ws 8.19.0

### TTS 语音服务
- **Python**:3.8+
- **TTS 引擎**:阿里云语音合成服务
- **Web 框架**:FastAPI

## 📱 使用说明

### 单词学习
1. **选择学习场景**:在首页选择你想要学习的单词分类
2. **开始学习**:点击"开始学习"进入学习模式
3. **标记记忆状态**:学习时标记单词为"认识"、"模糊"或"不认识"
4. **查看详情**:点击单词查看详细释义、例句和构词法
5. **收藏单词**:收藏重要单词,方便后续复习
6. **查看统计**:在个人资料页查看学习统计

### 文章阅读
1. **导入文章**:在文章列表页导入英文文章
2. **选词查询**:阅读时选中单词即可查看释义
3. **添加笔记**:为文章添加笔记,记录学习心得
4. **查看笔记**:在笔记列表查看所有笔记

### 单词导入
1. **准备数据**:按照指定格式准备单词数据(JSON)
2. **选择分类**:选择或创建目标分类
3. **批量导入**:一键导入所有单词

### 构词法学习
1. **查看构词法**:在单词详情页点击构词法图标
2. **AI 生成**:系统自动使用 AI 生成构词法解析
3. **深入理解**:通过词根词缀理解单词含义

## 💾 数据存储

应用使用以下方式存储数据:

### SQLite 数据库 (`data/words.db`)
- 单词数据(words, categories, key_collocations, example_sentences, confusing_words)
- 文章数据(articles)
- 笔记数据(notes)
- 构词法数据(etymologies)
- 单词列表(word_lists)
- 音频缓存(audio_cache)

### localStorage
- 学习进度
- 单词记忆状态
- 复习安排

所有数据存储在本地,不会上传到服务器。

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
