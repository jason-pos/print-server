#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   Xi Print Server 关闭"
echo "======================================"
echo ""

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker 未安装${NC}"
    exit 1
fi

# 使用 docker compose 或 docker-compose
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
fi

echo -n "停止 xi-print-server 容器... "

# 检查容器是否存在
if docker ps -a | grep -q xi-print-server; then
    $DOCKER_COMPOSE down > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ 停止失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}容器未运行${NC}"
fi

echo ""
echo "======================================"
echo "   Xi Print Server 已关闭"
echo "======================================"
echo ""
