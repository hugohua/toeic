# 开发环境配置说明

## 概述

项目现在支持同时调试服务端和前端，开发环境配置如下：

- **前端开发服务器**: `http://localhost:3000` (webpack-dev-server)
- **后端 API 服务器**: `http://localhost:3001` (Express)
- **API 请求**: 前端通过相对路径 `/api` 访问，webpack-dev-server 会自动代理到后端

## 启动开发环境

### 方式一：一键启动（推荐）

```bash
npm run dev
```

这会同时启动：
- 后端 API 服务器（端口 3001）
- 前端开发服务器（端口 3000）

### 方式二：分别启动

如果需要分别启动或调试：

```bash
# 终端 1: 启动后端 API 服务器
npm run dev:server

# 终端 2: 启动前端开发服务器
npm run dev:client
```

## 端口说明

- **3000**: 前端开发服务器（webpack-dev-server）
  - 提供前端页面和热更新
  - 代理 `/api/*` 请求到后端服务器

- **3001**: 后端 API 服务器（Express）
  - 仅提供 API 接口
  - 不提供静态文件服务（开发模式下）

## 生产环境

生产环境使用单一服务器：

```bash
# 构建前端
npm run build

# 启动生产服务器（端口 3000）
npm start
```

生产模式下，Express 服务器会：
- 提供 API 接口（`/api/*`）
- 提供静态文件服务（`dist` 目录）
- 处理 React Router 路由

## API 配置

### 开发模式
- API 基础 URL: `/api`（相对路径）
- webpack-dev-server 自动代理到 `http://localhost:3001/api`

### 生产模式
- API 基础 URL: `http://localhost:3000/api`（完整 URL）

### 自定义配置

可以通过环境变量或运行时配置：

```bash
# 通过环境变量
REACT_APP_API_URL=http://your-api.com/api npm run dev

# 或在 HTML 中设置
<script>
  window.API_BASE_URL = 'http://your-api.com/api';
</script>
```

## 工作流程

1. **开发时**:
   ```bash
   npm run dev
   ```
   - 访问 `http://localhost:3000` 查看前端
   - API 请求自动代理到后端
   - 支持热更新，修改代码自动刷新

2. **生产部署**:
   ```bash
   npm run build
   npm start
   ```
   - 访问 `http://localhost:3000` 查看完整应用
   - 所有请求（API + 静态文件）都由同一服务器处理

## 故障排查

### 端口冲突

如果端口被占用，可以修改：

- **后端端口**: 设置环境变量 `PORT=3002 npm run dev:server`
- **前端端口**: 修改 `webpack.config.js` 中的 `devServer.port`

### API 请求失败

1. 确保后端服务器已启动（`npm run dev:server`）
2. 检查 webpack-dev-server 的代理配置
3. 查看浏览器控制台的网络请求

### 热更新不工作

1. 确保使用 `npm run dev` 而不是 `npm start`
2. 检查 webpack-dev-server 是否正常运行
3. 清除浏览器缓存

