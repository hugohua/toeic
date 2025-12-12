# 背单词应用 - React版本

基于React + Webpack构建的背单词H5应用。

## 功能特性

- 📚 多场景单词学习
- 🔍 单词搜索功能（支持模糊匹配）
- 📊 学习统计和进度追踪
- 🧠 艾宾浩斯记忆曲线复习
- 📱 响应式设计，支持移动端
- 👆 手势翻页（快速浏览模式）

## 技术栈

- React 18
- React Router 6
- Webpack 5
- Babel

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

构建文件将输出到 `dist/` 目录

## 项目结构

```
tuoye/
├── src/
│   ├── components/      # React组件
│   │   ├── Header.js    # 头部组件（包含搜索功能）
│   │   └── Header.css
│   ├── pages/           # 页面组件
│   │   ├── HomePage.js          # 首页
│   │   ├── WordStudyPage.js     # 学习页面
│   │   ├── WordDetailPage.js    # 单词详情页
│   │   ├── WordBrowsePage.js    # 快速浏览页
│   │   └── ProfilePage.js       # 个人中心
│   ├── utils/           # 工具函数
│   │   ├── app.js       # 应用工具函数
│   │   ├── storage.js   # 数据存储
│   │   └── ebbinghaus.js # 艾宾浩斯算法
│   ├── data.js          # 单词数据
│   ├── index.js         # 入口文件
│   └── index.css         # 样式文件
├── public/              # 静态资源
│   └── index.html
├── webpack.config.js    # Webpack配置
├── .babelrc             # Babel配置
└── package.json
```

## 使用说明

1. 选择学习场景：在首页选择想要学习的单词分类
2. 开始学习：点击"开始学习"进入学习模式
3. 快速浏览：点击"快速浏览"可以快速查看单词详情，支持手势翻页
4. 搜索单词：点击头部搜索图标，输入单词或词义进行搜索
5. 查看统计：在个人中心查看学习进度和统计信息

## 注意事项

- 数据存储在浏览器localStorage中
- 支持离线使用
- 建议使用现代浏览器（Chrome、Firefox、Safari、Edge）
