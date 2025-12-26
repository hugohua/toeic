# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的构建工具（better-sqlite3 和 webpack 构建需要）
RUN apk add --no-cache --virtual .build-deps python3 make g++

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 配置 npm 使用淘宝镜像源并安装依赖（包括开发依赖，用于构建）
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    (npm ci || (npm cache clean --force && npm ci))

# 复制应用代码
COPY . .

# 构建前端应用
RUN npm run build

# 清理开发依赖和构建工具
RUN npm prune --production && \
    npm cache clean --force && \
    apk del .build-deps

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/images && \
    chmod +x /app/data /app/images

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=300s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/categories', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "server.js"]

