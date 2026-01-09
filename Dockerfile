# ============================================
# 阶段 1: 依赖安装 (最大化缓存利用)
# ============================================
FROM --platform=linux/amd64 node:20-alpine AS dependencies

WORKDIR /app

# 安装 Python 和构建工具
RUN apk add --no-cache python3 py3-pip make g++

# 先复制依赖配置文件 (变更频率低,缓存命中率高)
COPY package*.json ./
COPY python_tts_service/requirements.txt ./python_tts_service/

# 使用 BuildKit 缓存挂载安装 Node.js 依赖
# --mount=type=cache 会持久化 npm 缓存,即使镜像重建也能复用
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# 使用 BuildKit 缓存挂载安装 Python 依赖
RUN --mount=type=cache,target=/root/.cache/pip \
    cd python_tts_service && \
    pip3 install --no-cache-dir --break-system-packages -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# ============================================
# 阶段 2: 前端构建 (仅在代码变更时执行)
# ============================================
FROM dependencies AS builder

# 复制源代码 (放在依赖安装之后,代码变更不影响依赖层缓存)
COPY . .

# 执行前端构建
RUN npm run build

# ============================================
# 阶段 3: 生产镜像 (最小化,仅包含运行时)
# ============================================
FROM --platform=linux/amd64 node:20-alpine AS production

WORKDIR /app

# 安装生产环境运行时依赖
RUN apk add --no-cache python3 py3-pip

# 从 dependencies 阶段复制 node_modules (已安装的依赖)
COPY --from=dependencies /app/node_modules ./node_modules

# 从 dependencies 阶段复制 Python 依赖
COPY --from=dependencies /usr/lib/python3.12/site-packages /usr/lib/python3.12/site-packages

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# 复制运行时必需文件
COPY package*.json ./
COPY server.js ./
COPY src/db ./src/db
COPY python_tts_service ./python_tts_service
COPY data ./data

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/public/audio && \
    chmod +x /app/data /app/public/audio

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_TTS_HOST=localhost
ENV PYTHON_TTS_PORT=8000

# 健康检查
HEALTHCHECK --interval=300s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/categories', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD sh -c "cd /app/python_tts_service && python3 main.py & sleep 2 && cd /app && node server.js"
