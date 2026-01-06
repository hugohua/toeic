# 明确指定平台
FROM --platform=linux/amd64 node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的构建工具和 Python
RUN apk add --no-cache --virtual .build-deps python3 py3-pip make g++

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

# 清理开发依赖
RUN npm prune --production && \
    npm cache clean --force

# 安装 Python 依赖
RUN cd python_tts_service && \
    pip3 install --no-cache-dir -r requirements.txt

# 清理构建工具（保留 Python）
RUN apk del .build-deps

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/public/audio && \
    chmod +x /app/data /app/public/audio

# 只暴露一个端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_TTS_HOST=localhost
ENV PYTHON_TTS_PORT=8000

# 健康检查
HEALTHCHECK --interval=300s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/categories', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用（先启动 Python TTS 服务，再启动 Node.js）
CMD sh -c "cd /app/python_tts_service && python3 main.py & sleep 2 && cd /app && node server.js"

