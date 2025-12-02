#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================"
echo "   Xi Print Server 重启"
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

# 步骤 1: 停止容器
echo -e "${BLUE}[1/3]${NC} 停止现有容器..."
if docker ps -a | grep -q xi-print-server; then
    $DOCKER_COMPOSE down > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "      ${GREEN}✓ 容器已停止${NC}"
    else
        echo -e "      ${RED}✗ 停止失败${NC}"
        exit 1
    fi
else
    echo -e "      ${YELLOW}(无运行中的容器)${NC}"
fi

echo ""

# 步骤 2: 重新构建镜像
echo -e "${BLUE}[2/3]${NC} 重新构建镜像..."
$DOCKER_COMPOSE build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "      ${GREEN}✓ 镜像构建完成${NC}"
else
    echo -e "      ${RED}✗ 构建失败${NC}"
    exit 1
fi

echo ""

# 步骤 3: 启动容器
echo -e "${BLUE}[3/3]${NC} 启动容器..."
$DOCKER_COMPOSE up -d > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "      ${GREEN}✓ 容器已启动${NC}"

    # 等待服务启动
    sleep 3

    # 检查健康状态
    echo ""
    echo -n "检查服务健康状态... "

    if docker ps | grep xi-print-server | grep -q "Up"; then
        echo -e "${GREEN}✓${NC}"

        # 显示容器信息
        echo ""
        echo "容器状态:"
        docker ps | grep xi-print-server | awk '{print "  端口: "$NF"\n  状态: "$5" "$6" "$7}'

        # 测试健康检查端点
        echo ""
        echo -n "测试 API 连接... "
        if curl -s http://localhost:3344/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            echo ""
            echo -e "${GREEN}Xi Print Server 重启成功！${NC}"
            echo "访问地址: http://localhost:3344"
        else
            echo -e "${YELLOW}⚠ 服务可能还在启动中${NC}"
        fi
    else
        echo -e "${RED}✗ 容器未正常启动${NC}"
        echo ""
        echo "查看日志:"
        docker logs xi-print-server --tail 20
        exit 1
    fi
else
    echo -e "      ${RED}✗ 启动失败${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "   重启完成！"
echo "======================================"
echo ""
