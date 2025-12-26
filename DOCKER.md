# Docker 部署指南

## 构建和运行

### 方式一：使用 Docker Compose（推荐）

1. **构建并启动容器**：
```bash
docker-compose up -d --build
```

2. **查看日志**：
```bash
docker-compose logs -f
```

3. **停止容器**：
```bash
docker-compose down
```

### 方式二：使用 Docker 命令

1. **构建镜像**：
```bash
docker build -t baofen14787/tuoye-word-learning:latest .
```

2. **运行容器**：
```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your_api_key \
  -e OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  -e OPENAI_MODEL=qwen3-max \
  -v $(pwd)/data:/app/data \
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

或者使用 gzip 压缩以减小文件大小：

```bash
docker save baofen14787/tuoye-word-learning:latest | gzip > tuoye-word-learning-latest.tar.gz
```

### 导入镜像

从 tar 文件导入镜像：

```bash
docker load -i tuoye-word-learning-latest.tar
```

如果使用压缩文件：

```bash
gunzip -c tuoye-word-learning-latest.tar.gz | docker load
```

导入后，可以使用以下命令验证：

```bash
docker images baofen14787/tuoye-word-learning:latest
```

## 环境变量

可以通过环境变量配置以下参数：

- `OPENAI_API_KEY`: OpenAI API 密钥（必需）
- `OPENAI_BASE_URL`: API 基础 URL（默认：https://dashscope.aliyuncs.com/compatible-mode/v1）
- `OPENAI_MODEL`: 使用的模型（默认：qwen3-max）
- `PORT`: 服务端口（默认：3000）
- `NODE_ENV`: 运行环境（默认：production）

## 数据持久化

数据库文件存储在 `./data/words.db`，通过 volume 挂载确保数据持久化。

## 访问应用

容器启动后，访问：http://localhost:3000

## 健康检查

容器包含健康检查，可以通过以下命令查看状态：
```bash
docker ps
```

## 故障排查

1. **查看容器日志**：
```bash
docker logs tuoye-word-learning
```

2. **进入容器调试**：
```bash
docker exec -it tuoye-word-learning sh
```

3. **检查端口占用**：
```bash
lsof -i :3000
```

