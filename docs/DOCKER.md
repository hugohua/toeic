# Docker 部署指南

## 使用

### 方式一：使用 Docker Compose（推荐）

1. **准备 docker-compose.yml 文件**（使用已有镜像）：

```yaml
services:
  tuoye:
    image: baofen14787/tuoye-word-learning:latest
    container_name: tuoye-word-learning
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PYTHON_TTS_HOST=localhost
      - PYTHON_TTS_PORT=8000
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY:-your_dashscope_key_here}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-your_api_key_here}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1}
      - OPENAI_MODEL=${OPENAI_MODEL:-qwen-plus}
    volumes:
      # 挂载数据库目录,确保数据持久化
      - ./data:/app/data
      # 挂载音频缓存目录
      - ./public/audio:/app/public/audio
    restart: unless-stopped
```

### 方式二：使用 Docker Run 命令


#### 完整配置运行

```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e OPENAI_API_KEY=your_api_key_here \
  -e OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  -e OPENAI_MODEL=qwen3-max \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  baofen14787/tuoye-word-learning:latest
```

## 三、环境变量说明

| 变量名 | 说明 | 默认值 | 是否必需 |
|--------|------|--------|----------|
| `PORT` | 服务端口 | `3000` | 否 |
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `PYTHON_TTS_HOST` | TTS 服务主机 | `localhost` | 否 |
| `PYTHON_TTS_PORT` | TTS 服务端口 | `8000` | 否 |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API 密钥 | - | **是** |
| `OPENAI_API_KEY` | OpenAI API 密钥(兼容模式) | - | 否 |
| `OPENAI_BASE_URL` | API 基础 URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 否 |
| `OPENAI_MODEL` | 使用的模型 | `qwen-plus` | 否 |

> [!IMPORTANT]
> `DASHSCOPE_API_KEY` 是必需的,用于 AI 功能(构词法生成、文章生成等)和 TTS 语音服务。


## 四、数据持久化

应用需要持久化以下目录:

### 数据库目录
数据库文件存储在容器的 `/app/data` 目录,通过 volume 挂载到主机的 `./data` 目录:

```bash
# 确保数据目录存在
mkdir -p data

# 运行容器时挂载数据目录
-v $(pwd)/data:/app/data
```

### 音频缓存目录
TTS 生成的音频文件存储在 `/app/public/audio` 目录,建议挂载以避免重复生成:

```bash
# 确保音频目录存在
mkdir -p public/audio

# 运行容器时挂载音频目录
-v $(pwd)/public/audio:/app/public/audio
```

**重要**:首次运行前,确保 `data` 目录存在且包含 `words.db` 数据库文件,或者容器会自动创建。

## 构建和运行

### 使用 Docker 命令

1. **构建镜像**(使用 BuildKit 优化):
```bash
DOCKER_BUILDKIT=1 docker build -t baofen14787/tuoye-word-learning:latest .
```

> [!TIP]
> 项目使用优化版 Dockerfile (多阶段构建 + BuildKit 缓存),详见 [DOCKER_CACHE_OPTIMIZATION.md](DOCKER_CACHE_OPTIMIZATION.md)

2. **运行容器**:
```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DASHSCOPE_API_KEY=your_dashscope_key \
  -e OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  -e OPENAI_MODEL=qwen-plus \
  -e PYTHON_TTS_HOST=localhost \
  -e PYTHON_TTS_PORT=8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/audio:/app/public/audio \
  baofen14787/tuoye-word-learning:latest
```

## 推送到 Docker Hub

1. **登录 Docker Hub**：
```bash
docker login
# 输入用户名：baofen14787
# 输入密码
```

2. **推送镜像**：
```bash
docker push baofen14787/tuoye-word-learning:latest
```

3. **打标签并推送特定版本**：
```bash
docker tag baofen14787/tuoye-word-learning:latest baofen14787/tuoye-word-learning:v1.0.0
docker push baofen14787/tuoye-word-learning:v1.0.0
```

## 导出和导入镜像

### 导出镜像为 tar 文件

将镜像导出为 tar 文件，方便离线传输或备份：

```bash
docker save baofen14787/tuoye-word-learning:latest -o tuoye-word-learning-latest.tar
```

### 导入镜像

从 tar 文件导入镜像：

```bash
docker load -i tuoye-word-learning-latest.tar
```

## 环境变量

可以通过环境变量配置以下参数:

- `NODE_ENV`: 运行环境(默认:production)
- `PORT`: 服务端口(默认:3000)
- `PYTHON_TTS_HOST`: TTS 服务主机(默认:localhost)
- `PYTHON_TTS_PORT`: TTS 服务端口(默认:8000)
- `DASHSCOPE_API_KEY`: 阿里云 DashScope API 密钥(**必需**)
- `OPENAI_API_KEY`: OpenAI API 密钥(兼容模式,可选)
- `OPENAI_BASE_URL`: API 基础 URL(默认:https://dashscope.aliyuncs.com/compatible-mode/v1)
- `OPENAI_MODEL`: 使用的模型(默认:qwen-plus)
