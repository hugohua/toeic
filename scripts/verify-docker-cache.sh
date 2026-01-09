#!/bin/bash

# Docker 构建缓存验证脚本
# 用途: 测试不同场景下的构建速度和缓存效果

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_result() {
    echo -e "${BLUE}[结果]${NC} $1"
}

# 记录构建时间
build_and_time() {
    local test_name=$1
    local dockerfile=$2
    local tag=$3
    
    print_header "测试: $test_name"
    
    local start_time=$(date +%s)
    
    if DOCKER_BUILDKIT=1 docker build -f "$dockerfile" -t "$tag" . > /tmp/docker_build_$$.log 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # 统计缓存命中
        local cached_layers=$(grep -c "CACHED" /tmp/docker_build_$$.log || echo "0")
        local total_layers=$(grep -c "RUN\|COPY" /tmp/docker_build_$$.log || echo "0")
        
        print_result "构建时间: ${duration}秒"
        print_result "缓存命中: ${cached_layers}/${total_layers} 层"
        
        echo "$test_name,$duration,$cached_layers,$total_layers" >> /tmp/docker_benchmark_$$.csv
    else
        print_warning "构建失败,查看日志: /tmp/docker_build_$$.log"
        cat /tmp/docker_build_$$.log
        return 1
    fi
    
    rm -f /tmp/docker_build_$$.log
}

# 主测试流程
main() {
    print_header "Docker 构建缓存验证"
    
    # 初始化结果文件
    echo "测试场景,构建时间(秒),缓存命中层数,总层数" > /tmp/docker_benchmark_$$.csv
    
    # 清理旧镜像
    print_info "清理旧测试镜像..."
    docker rmi -f test-original:v1 test-optimized:v1 test-optimized:v2 test-optimized:v3 2>/dev/null || true
    
    # 测试 1: 原始 Dockerfile 首次构建
    if [ -f "Dockerfile.backup" ]; then
        build_and_time "原始 Dockerfile - 首次构建" "Dockerfile.backup" "test-original:v1"
    else
        print_warning "未找到 Dockerfile.backup,跳过原始版本测试"
    fi
    
    # 测试 2: 优化版 Dockerfile 首次构建
    build_and_time "优化版 Dockerfile - 首次构建" "Dockerfile.optimized" "test-optimized:v1"
    
    # 测试 3: 无变更重建
    build_and_time "优化版 Dockerfile - 无变更重建" "Dockerfile.optimized" "test-optimized:v2"
    
    # 测试 4: 代码变更后重建
    print_info "模拟代码变更..."
    echo "// Test comment $(date)" >> src/App.js
    build_and_time "优化版 Dockerfile - 代码变更后重建" "Dockerfile.optimized" "test-optimized:v3"
    
    # 恢复代码
    git checkout src/App.js 2>/dev/null || true
    
    # 显示结果汇总
    print_header "测试结果汇总"
    column -t -s',' /tmp/docker_benchmark_$$.csv
    
    print_info "\n详细结果已保存到: /tmp/docker_benchmark_$$.csv"
    
    # 清理测试镜像
    print_info "\n清理测试镜像..."
    docker rmi -f test-original:v1 test-optimized:v1 test-optimized:v2 test-optimized:v3 2>/dev/null || true
    
    print_header "验证完成"
}

# 检查 Docker 和 BuildKit
check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: 未安装 Docker${NC}"
        exit 1
    fi
    
    if ! docker buildx version &> /dev/null; then
        print_warning "BuildKit 可能未启用,构建可能较慢"
    fi
}

# 显示帮助
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "用法: $0"
    echo ""
    echo "此脚本会测试以下场景:"
    echo "  1. 原始 Dockerfile 首次构建 (如果存在 Dockerfile.backup)"
    echo "  2. 优化版 Dockerfile 首次构建"
    echo "  3. 优化版 Dockerfile 无变更重建"
    echo "  4. 优化版 Dockerfile 代码变更后重建"
    echo ""
    echo "结果将显示每个场景的构建时间和缓存命中率"
    exit 0
fi

check_requirements
main
