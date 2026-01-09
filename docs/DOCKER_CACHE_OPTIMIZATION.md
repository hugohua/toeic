# Docker 构建缓存优化指南

## 优化概述

本项目已实施 Docker 构建缓存优化,通过多阶段构建和 BuildKit 缓存挂载,显著提升重复构建速度。

## 优化效果

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首次构建 | ~5-8 分钟 | ~5-8 分钟 | - |
| 代码变更 | ~5-8 分钟 | ~30-60 秒 | **90%+** |
| 依赖变更 | ~5-8 分钟 | ~2-3 分钟 | ~50% |
| 无变更重建 | ~5-8 分钟 | ~5-10 秒 | **99%** |

## 使用方法

### 方式 1: 直接构建 (推荐)

```bash
# Dockerfile 已经是优化版本,直接构建即可
DOCKER_BUILDKIT=1 docker build -t baofen14787/tuoye-word-learning:latest .
```

### 方式 2: 使用构建脚本

```bash
# 脚本已自动启用 BuildKit
./build-and-export.sh latest
```

> [!NOTE]
> 项目的 `Dockerfile` 已经采用优化版本 (多阶段构建 + BuildKit 缓存),原始版本已备份为 `Dockerfile.backup`。

## 全局启用 BuildKit (推荐)

### macOS / Windows (Docker Desktop)

1. 打开 Docker Desktop 设置
2. 进入 "Docker Engine"
3. 添加配置:
```json
{
  "features": {
    "buildkit": true
  }
}
```
4. 点击 "Apply & Restart"

### Linux

```bash
# 编辑 daemon.json
sudo nano /etc/docker/daemon.json

# 添加配置
{
  "features": {
    "buildkit": true
  }
}

# 重启 Docker
sudo systemctl restart docker
```

### 临时启用 (单次构建)

```bash
DOCKER_BUILDKIT=1 docker build -t myimage .
```

## 技术细节

### 多阶段构建架构

```
┌─────────────────────────────────────────┐
│  阶段 1: dependencies                    │
│  - 安装 Node.js 依赖 (npm ci)            │
│  - 安装 Python 依赖 (pip install)        │
│  - 使用缓存挂载持久化包管理器缓存          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  阶段 2: builder                         │
│  - 复制源代码                            │
│  - 执行前端构建 (npm run build)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  阶段 3: production                      │
│  - 仅复制运行时必需文件                   │
│  - 从前两个阶段复制依赖和构建产物          │
│  - 最小化镜像体积                        │
└─────────────────────────────────────────┘
```

### BuildKit 缓存挂载

```dockerfile
# npm 缓存挂载
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# pip 缓存挂载
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install -r requirements.txt
```

**优势**:
- 缓存在构建之间持久化
- 即使镜像层失效,包管理器缓存仍可复用
- 显著减少网络下载时间

### 层缓存优化

**原则**: 变更频率低的层放在前面

```dockerfile
# ✅ 正确: 先复制依赖文件
COPY package*.json ./
RUN npm ci

# 后复制源代码
COPY . .
RUN npm run build

# ❌ 错误: 先复制所有代码
COPY . .
RUN npm ci  # 任何代码变更都会使此层失效
```

## 验证缓存效果

### 查看构建日志

```bash
# 使用 --progress=plain 查看详细日志
DOCKER_BUILDKIT=1 docker build --progress=plain -t myimage .
```

**缓存命中示例**:
```
#8 [dependencies 3/5] COPY package*.json ./
#8 CACHED
```

**缓存未命中示例**:
```
#8 [dependencies 3/5] COPY package*.json ./
#8 0.123s
```

### 测试不同场景

```bash
# 1. 首次构建 (建立缓存)
DOCKER_BUILDKIT=1 docker build -t test:v1 .

# 2. 无变更重建 (应该全部缓存命中)
DOCKER_BUILDKIT=1 docker build -t test:v2 .

# 3. 修改代码后重建 (仅构建阶段重新执行)
echo "// test" >> src/App.js
DOCKER_BUILDKIT=1 docker build -t test:v3 .

# 4. 修改依赖后重建 (依赖和构建阶段重新执行)
npm install lodash
DOCKER_BUILDKIT=1 docker build -t test:v4 .
```

## 故障排查

### 问题: BuildKit 缓存未生效

**检查**:
```bash
# 确认 BuildKit 已启用
docker buildx version

# 查看 Docker 版本 (需要 18.09+)
docker version
```

**解决**:
```bash
# 显式启用 BuildKit
export DOCKER_BUILDKIT=1
```

### 问题: 依赖安装仍然很慢

**原因**: 可能是网络问题或镜像源不稳定

**解决**:
```bash
# 检查镜像源配置
# npm: registry.npmmirror.com
# pip: mirrors.aliyun.com/pypi/simple/

# 或使用代理
docker build --build-arg http_proxy=http://proxy:port -t myimage .
```

### 问题: 缓存占用磁盘空间过大

**清理缓存**:
```bash
# 清理构建缓存
docker builder prune

# 清理所有未使用的数据
docker system prune -a
```

## 最佳实践

1. **始终启用 BuildKit**: 全局配置或使用 `DOCKER_BUILDKIT=1`
2. **合理组织 Dockerfile**: 变更频率低的层放前面
3. **使用 .dockerignore**: 排除不必要的文件,减少构建上下文
4. **定期清理缓存**: 避免磁盘空间耗尽
5. **监控构建时间**: 使用 `--progress=plain` 分析瓶颈

## 参考资料

- [Docker BuildKit 官方文档](https://docs.docker.com/build/buildkit/)
- [多阶段构建最佳实践](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile 缓存优化](https://docs.docker.com/build/cache/)
