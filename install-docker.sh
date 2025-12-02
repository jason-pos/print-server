#!/bin/bash

# XiPOS Print Server - Docker 安装脚本
# 此脚本会自动安装 Docker 和 Docker Compose，并配置 xi-print-server
#
# 用法: sudo ./install-docker.sh
#
# 支持系统: Ubuntu/Debian, CentOS/RHEL/Fedora, Arch Linux

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以 root 权限运行
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        echo "用法: sudo ./install-docker.sh"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
    else
        OS="unknown"
    fi
    log_info "检测到操作系统: $OS $VERSION"
}

# 检查 Docker 是否已安装
check_docker_installed() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
        log_success "Docker 已安装: $DOCKER_VERSION"
        return 0
    fi
    return 1
}

# 检查 Docker Compose 是否已安装
check_docker_compose_installed() {
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
        log_success "Docker Compose (Plugin) 已安装: $COMPOSE_VERSION"
        return 0
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | tr -d ',')
        log_success "Docker Compose (Standalone) 已安装: $COMPOSE_VERSION"
        return 0
    fi
    return 1
}

# 在 Ubuntu/Debian 上安装 Docker
install_docker_debian() {
    log_info "正在 Ubuntu/Debian 上安装 Docker..."

    # 更新软件包索引
    apt-get update

    # 安装依赖包
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # 添加 Docker 的官方 GPG 密钥
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # 设置仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 更新并安装 Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log_success "Docker 安装完成 (Ubuntu/Debian)"
}

# 在 CentOS/RHEL/Fedora 上安装 Docker
install_docker_rhel() {
    log_info "正在 CentOS/RHEL/Fedora 上安装 Docker..."

    # 安装依赖
    if [ "$OS" = "fedora" ]; then
        dnf -y install dnf-plugins-core
        dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi

    log_success "Docker 安装完成 (RHEL/CentOS/Fedora)"
}

# 在 Arch Linux 上安装 Docker
install_docker_arch() {
    log_info "正在 Arch Linux 上安装 Docker..."

    pacman -Sy --noconfirm docker docker-compose

    log_success "Docker 安装完成 (Arch Linux)"
}

# 安装 Docker
install_docker() {
    case $OS in
        ubuntu|debian|linuxmint|pop)
            install_docker_debian
            ;;
        centos|rhel|fedora|rocky|almalinux)
            install_docker_rhel
            ;;
        arch|manjaro)
            install_docker_arch
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            log_info "请手动安装 Docker: https://docs.docker.com/get-docker/"
            exit 1
            ;;
    esac
}

# 配置 Docker 服务
configure_docker() {
    log_info "配置 Docker 服务..."

    # 启动并启用 Docker 服务
    systemctl start docker
    systemctl enable docker

    log_success "Docker 服务已启动并设置为开机自启"
}

# 将当前用户添加到 docker 组
add_user_to_docker_group() {
    # 获取实际运行脚本的用户（非 root）
    ACTUAL_USER=${SUDO_USER:-$USER}

    if [ "$ACTUAL_USER" != "root" ]; then
        log_info "将用户 '$ACTUAL_USER' 添加到 docker 组..."
        usermod -aG docker "$ACTUAL_USER"
        log_success "用户 '$ACTUAL_USER' 已添加到 docker 组"
        log_warn "请注销并重新登录以使更改生效"
    fi
}

# 将用户添加到 lp 组（用于 USB 打印机访问）
add_user_to_lp_group() {
    ACTUAL_USER=${SUDO_USER:-$USER}

    if [ "$ACTUAL_USER" != "root" ]; then
        log_info "将用户 '$ACTUAL_USER' 添加到 lp 组（USB 打印机访问）..."
        usermod -aG lp "$ACTUAL_USER"
        log_success "用户 '$ACTUAL_USER' 已添加到 lp 组"
    fi
}

# 配置 USB 设备权限（用于热敏打印机）
configure_usb_permissions() {
    log_info "配置 USB 打印机权限..."

    # 创建 udev 规则
    UDEV_RULES="/etc/udev/rules.d/99-usb-printer.rules"

    cat > "$UDEV_RULES" << 'EOF'
# USB 热敏打印机权限规则
# 允许 plugdev 和 lp 组用户访问常见的热敏打印机

# Epson 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666", GROUP="lp"

# Citizen 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="1d90", MODE="0666", GROUP="lp"

# Star Micronics 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="0519", MODE="0666", GROUP="lp"

# Bixolon 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="1504", MODE="0666", GROUP="lp"

# Xprinter 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="0416", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="0483", MODE="0666", GROUP="lp"

# HPRT 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="0456", MODE="0666", GROUP="lp"

# Generic POS 打印机
SUBSYSTEM=="usb", ATTR{idVendor}=="6868", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fe6", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="1fc9", MODE="0666", GROUP="lp"
EOF

    # 重新加载 udev 规则
    udevadm control --reload-rules
    udevadm trigger

    log_success "USB 打印机权限配置完成"
}

# 配置 .env 文件
configure_env() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            log_info "创建 .env 配置文件..."
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"

            # 修改文件所有者为实际用户
            ACTUAL_USER=${SUDO_USER:-$USER}
            if [ "$ACTUAL_USER" != "root" ]; then
                chown "$ACTUAL_USER:$ACTUAL_USER" "$SCRIPT_DIR/.env"
            fi

            log_success ".env 文件已创建"
            log_warn "请编辑 .env 文件配置打印机设置"
        else
            log_warn ".env.example 文件不存在，跳过 .env 配置"
        fi
    else
        log_info ".env 文件已存在，跳过"
    fi
}

# 创建必要的目录
create_directories() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    log_info "创建必要的目录..."

    mkdir -p "$SCRIPT_DIR/logs"

    # 修改目录所有者
    ACTUAL_USER=${SUDO_USER:-$USER}
    if [ "$ACTUAL_USER" != "root" ]; then
        chown -R "$ACTUAL_USER:$ACTUAL_USER" "$SCRIPT_DIR/logs"
    fi

    log_success "目录创建完成"
}

# 构建 Docker 镜像
build_docker_image() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    log_info "构建 Docker 镜像..."

    cd "$SCRIPT_DIR"

    if docker compose build; then
        log_success "Docker 镜像构建完成"
    else
        log_error "Docker 镜像构建失败"
        exit 1
    fi
}

# 验证安装
verify_installation() {
    log_info "验证安装..."

    echo ""
    echo "======================================================"
    echo "安装验证"
    echo "======================================================"

    # 验证 Docker
    if docker --version &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker: $(docker --version)"
    else
        echo -e "${RED}✗${NC} Docker 未安装"
    fi

    # 验证 Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker Compose: $(docker compose version --short)"
    elif docker-compose --version &> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker Compose: $(docker-compose --version)"
    else
        echo -e "${RED}✗${NC} Docker Compose 未安装"
    fi

    # 验证 Docker 服务状态
    if systemctl is-active --quiet docker; then
        echo -e "${GREEN}✓${NC} Docker 服务运行中"
    else
        echo -e "${YELLOW}⚠${NC} Docker 服务未运行"
    fi

    # 检查 .env 文件
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo -e "${GREEN}✓${NC} .env 配置文件存在"
    else
        echo -e "${YELLOW}⚠${NC} .env 配置文件不存在"
    fi

    echo "======================================================"
}

# 显示使用说明
show_usage() {
    echo ""
    echo "======================================================"
    echo "XiPOS Print Server - Docker 安装完成"
    echo "======================================================"
    echo ""
    echo "下一步操作:"
    echo ""
    echo "1. 注销并重新登录（使用户组更改生效）"
    echo ""
    echo "2. 配置打印机（编辑 .env 文件）:"
    echo "   nano .env"
    echo ""
    echo "3. 启动服务:"
    echo "   ./start.sh"
    echo ""
    echo "4. 验证服务:"
    echo "   curl http://localhost:3344/health"
    echo ""
    echo "常用命令:"
    echo "  启动服务:    ./start.sh"
    echo "  停止服务:    ./stop.sh"
    echo "  重启服务:    ./restart.sh"
    echo "  查看日志:    docker compose logs -f"
    echo "  测试打印:    curl -X POST http://localhost:3344/test-receipt"
    echo ""
    echo "======================================================"
}

# 主函数
main() {
    echo ""
    echo "======================================================"
    echo "XiPOS Print Server - Docker 安装脚本"
    echo "======================================================"
    echo ""

    # 检查 root 权限
    check_root

    # 检测操作系统
    detect_os

    # 检查并安装 Docker
    if ! check_docker_installed; then
        log_info "Docker 未安装，开始安装..."
        install_docker
        configure_docker
    else
        log_info "Docker 已安装，跳过安装步骤"
        # 确保 Docker 服务运行
        if ! systemctl is-active --quiet docker; then
            configure_docker
        fi
    fi

    # 检查 Docker Compose
    if ! check_docker_compose_installed; then
        log_warn "Docker Compose 未找到"
        log_info "Docker Compose 应该已随 Docker 一起安装"
        log_info "如果问题持续，请手动安装: https://docs.docker.com/compose/install/"
    fi

    # 配置用户权限
    add_user_to_docker_group
    add_user_to_lp_group

    # 配置 USB 权限
    configure_usb_permissions

    # 配置环境
    configure_env
    create_directories

    # 构建 Docker 镜像
    read -p "是否现在构建 Docker 镜像? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_docker_image
    else
        log_info "跳过镜像构建。稍后可使用 'docker compose build' 手动构建"
    fi

    # 验证安装
    verify_installation

    # 显示使用说明
    show_usage
}

# 运行主函数
main "$@"
