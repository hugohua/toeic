#!/bin/bash

# 背单词应用快速启动脚本

echo "==================================="
echo "背单词应用启动脚本"
echo "==================================="

# 创建数据目录
if [ ! -d "data" ]; then
    echo "创建数据目录..."
    mkdir -p data
fi

# 检查镜像是否存在
if ! docker images | grep -q "baofen14787/tuoye-word-learning"; then
    echo "镜像不存在，正在检查 tar 文件..."
    if [ -f "tuoye-word-learning-latest.tar" ]; then
        echo "正在导入镜像..."
        docker load -i tuoye-word-learning-latest.tar
    else
        echo "错误: 找不到镜像文件 tuoye-word-learning-latest.tar"
        echo "请先导入镜像或从 Docker Hub 拉取"
        exit 1
    fi
fi

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q "tuoye-word-learning"; then
    echo "停止并删除旧容器..."
    docker stop tuoye-word-learning 2>/dev/null
    docker rm tuoye-word-learning 2>/dev/null
fi

# 检查是否有 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到 .env 文件，将使用默认配置"
    echo "建议创建 .env 文件并设置 OPENAI_API_KEY"
fi

# 运行容器
echo "正在启动容器..."
if [ -f "docker-compose.run.yml" ]; then
    docker-compose -f docker-compose.run.yml up -d
else
    # 使用 docker run 命令
    docker run -d \
      --name tuoye-word-learning \
      -p 3000:3000 \
      --env-file .env 2>/dev/null || \
    docker run -d \
      --name tuoye-word-learning \
      -p 3000:3000 \
      -e OPENAI_API_KEY=${OPENAI_API_KEY:-sk-27bc50f0b4f646b98e3862c81a49101e} \
      -e OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1} \
      -e OPENAI_MODEL=${OPENAI_MODEL:-qwen3-max} \
      -v $(pwd)/data:/app/data \
      --restart unless-stopped \
      baofen14787/tuoye-word-learning:latest
fi

# 等待容器启动
echo "等待容器启动..."
sleep 3

# 检查容器状态
if docker ps | grep -q "tuoye-word-learning"; then
    echo "==================================="
    echo "✅ 容器启动成功！"
    echo "==================================="
    echo "访问地址: http://localhost:3000"
    echo "查看日志: docker logs -f tuoye-word-learning"
    echo "停止容器: docker stop tuoye-word-learning"
    echo "==================================="
else
    echo "==================================="
    echo "❌ 容器启动失败"
    echo "==================================="
    echo "查看日志: docker logs tuoye-word-learning"
    exit 1
fi

