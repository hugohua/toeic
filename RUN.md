# 镜像使用和运行指南

## 一、导入镜像

如果是从 tar 文件导入镜像：

```bash
# 导入镜像
docker load -i tuoye-word-learning-latest.tar

# 验证镜像是否导入成功
docker images baofen14787/tuoye-word-learning:latest
```

如果是从 Docker Hub 拉取：

```bash
docker pull baofen14787/tuoye-word-learning:latest
```

## 二、运行方式

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
      - OPENAI_API_KEY=${OPENAI_API_KEY:-your_api_key_here}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1}
      - OPENAI_MODEL=${OPENAI_MODEL:-qwen3-max}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

2. **创建数据目录**：

```bash
mkdir -p data
```

3. **设置环境变量（可选）**：

创建 `.env` 文件：

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3-max
```

4. **启动容器**：

```bash
docker-compose up -d
```

5. **查看日志**：

```bash
docker-compose logs -f
```

6. **停止容器**：

```bash
docker-compose down
```

### 方式二：使用 Docker Run 命令

#### 基本运行

```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  baofen14787/tuoye-word-learning:latest
```

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

#### 使用环境变量文件

1. 创建 `.env` 文件：

```bash
cat > .env << EOF
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3-max
EOF
```

2. 运行容器：

```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  baofen14787/tuoye-word-learning:latest
```

## 三、环境变量说明

| 变量名 | 说明 | 默认值 | 是否必需 |
|--------|------|--------|----------|
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `PORT` | 服务端口 | `3000` | 否 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | **是** |
| `OPENAI_BASE_URL` | API 基础 URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 否 |
| `OPENAI_MODEL` | 使用的模型 | `qwen3-max` | 否 |

## 四、数据持久化

数据库文件存储在容器的 `/app/data` 目录，通过 volume 挂载到主机的 `./data` 目录：

```bash
# 确保数据目录存在
mkdir -p data

# 运行容器时挂载数据目录
-v $(pwd)/data:/app/data
```

**重要**：首次运行前，确保 `data` 目录存在且包含 `words.db` 数据库文件，或者容器会自动创建。

## 五、常用操作

### 查看运行状态

```bash
# 查看容器状态
docker ps | grep tuoye-word-learning

# 查看容器详细信息
docker inspect tuoye-word-learning
```

### 查看日志

```bash
# 查看实时日志
docker logs -f tuoye-word-learning

# 查看最近 100 行日志
docker logs --tail 100 tuoye-word-learning
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it tuoye-word-learning sh
```

### 停止和启动

```bash
# 停止容器
docker stop tuoye-word-learning

# 启动容器
docker start tuoye-word-learning

# 重启容器
docker restart tuoye-word-learning

# 删除容器（注意：不会删除数据卷）
docker rm tuoye-word-learning
```

### 更新镜像

```bash
# 停止并删除旧容器
docker stop tuoye-word-learning
docker rm tuoye-word-learning

# 拉取新镜像（或导入新镜像）
docker load -i tuoye-word-learning-latest.tar

# 重新运行容器
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  baofen14787/tuoye-word-learning:latest
```

## 六、访问应用

容器启动后，访问：

- **本地访问**：http://localhost:3000
- **网络访问**：http://your-server-ip:3000

### 健康检查

检查服务是否正常运行：

```bash
# 检查 API 是否响应
curl http://localhost:3000/api/categories

# 或使用浏览器访问
open http://localhost:3000
```

## 七、故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs tuoye-word-learning

# 查看容器状态
docker ps -a | grep tuoye-word-learning
```

### 2. 端口被占用

```bash
# 检查端口占用
lsof -i :3000

# 或使用其他端口
docker run -d \
  --name tuoye-word-learning \
  -p 8080:3000 \
  -v $(pwd)/data:/app/data \
  baofen14787/tuoye-word-learning:latest
```

### 3. 数据库权限问题

```bash
# 检查数据目录权限
ls -la data/

# 修复权限（如果需要）
chmod -R 755 data/
```

### 4. 环境变量未生效

```bash
# 检查容器的环境变量
docker exec tuoye-word-learning env | grep OPENAI
```

## 八、生产环境部署建议

1. **使用 Docker Compose**：便于管理和配置
2. **配置反向代理**：使用 Nginx 或 Traefik 作为反向代理
3. **设置资源限制**：限制容器的 CPU 和内存使用
4. **配置日志轮转**：避免日志文件过大
5. **定期备份数据**：备份 `data` 目录
6. **使用 HTTPS**：通过反向代理配置 SSL 证书

### 示例：带资源限制的运行

```bash
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  --memory="512m" \
  --cpus="1.0" \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  baofen14787/tuoye-word-learning:latest
```

## 九、快速开始脚本

创建 `start.sh` 脚本：

```bash
#!/bin/bash

# 创建数据目录
mkdir -p data

# 检查镜像是否存在
if ! docker images | grep -q "baofen14787/tuoye-word-learning"; then
    echo "镜像不存在，正在导入..."
    docker load -i tuoye-word-learning-latest.tar
fi

# 停止并删除旧容器（如果存在）
docker stop tuoye-word-learning 2>/dev/null
docker rm tuoye-word-learning 2>/dev/null

# 运行容器
docker run -d \
  --name tuoye-word-learning \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  baofen14787/tuoye-word-learning:latest

echo "容器已启动，访问 http://localhost:3000"
```

使用：

```bash
chmod +x start.sh
./start.sh
```

