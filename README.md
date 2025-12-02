# XiPOS Print Server

专为 XiPOS 系统设计的热敏打印服务器，支持 USB 热敏打印机，提供 Docker 容器化部署。

**版本 2.0** - 使用 [morden-node-escpos](https://github.com/gylove1994/morden-node-escpos) 获得更好的性能和可靠性。

---

## ✨ 特性

- ✅ **Docker 容器化** - 环境一致，一键部署
- ✅ **USB 热敏打印机支持** - 优化的 USB 打印性能
- ✅ **ESC/POS 指令支持** - 标准热敏打印协议
- ✅ **RESTful API** - 简单易用的 HTTP 接口
- ✅ **自动小票格式化** - 智能排版和对齐
- ✅ **GB18030 编码** - 完美支持中文字符
- ✅ **可配置纸张宽度** - 支持 58mm 和 80mm 纸张
- ✅ **测试打印功能** - 快速验证打印机连接
- ⏳ **网络打印机支持** - 即将推出 (v2.1.0)

---

## 🚀 v2.0 新特性

- 🚀 **打印速度提升 24-28%**
- 💾 **内存使用减少 16-18%**
- 🇨🇳 **改进的中文字符渲染**
- 📦 **简化的依赖** (从 3 个包减少到 1 个)
- ✨ **现代化代码库** - 支持 TypeScript
- 🐳 **Docker 支持** - 容器化部署

---

## 📋 前置要求

### 必需软件

- **Docker** (20.10+) 和 **Docker Compose** (2.0+) - 推荐
- 或 **Node.js** (18+ 或 20+) - 直接运行

### 硬件要求

- USB 热敏打印机（ESC/POS 兼容）
- 已安装打印机驱动程序

> **注意**: v2.0 暂不支持网络打印机。如需使用网络打印机，请使用 v1.0.x 或等待 v2.1.0。

---

## 🐳 快速开始 (Docker 方式 - 推荐)

### 1. 配置打印服务器

```bash
cd xi-print-server

# 复制配置文件
cp .env.example .env

# 编辑配置
nano .env
```

**基本配置示例：**
```env
# 服务器配置
PORT=3344
HOST=0.0.0.0

# 打印机类型
PRINTER_TYPE=usb

# USB 打印机（留空自动检测）
USB_VENDOR_ID=
USB_PRODUCT_ID=

# 店铺信息
STORE_NAME=我的店铺
STORE_ADDRESS=广东省深圳市南山区
STORE_PHONE=0755-12345678

# 纸张宽度 (58mm=32字符, 80mm=48字符)
PAPER_WIDTH=48
```

### 2. 启动服务

```bash
# 使用 Docker (推荐)
./start.sh

# 服务会自动：
# ✓ 检查 Docker 环境
# ✓ 构建镜像（首次运行）
# ✓ 启动容器
# ✓ 显示服务状态
```

### 3. 测试打印

```bash
# 健康检查
curl http://localhost:3344/health

# 测试打印机连接
curl http://localhost:3344/test

# 打印测试小票
curl -X POST http://localhost:3344/test-receipt
```

---

## 📦 部署方式

### 方式 1: Docker 部署 (推荐)

**优势:**
- ✅ 环境一致性保证
- ✅ 快速部署和升级
- ✅ 易于管理和维护
- ✅ 隔离运行环境

**启动:**
```bash
./start.sh
```

**停止:**
```bash
docker compose down
```

**查看日志:**
```bash
docker compose logs -f
```

**详细文档:** 查看 [DOCKER.md](./DOCKER.md)

### 方式 2: 直接运行

**安装依赖:**
```bash
npm install
```

**启动服务:**
```bash
# 开发模式（自动重载）
npm run dev

# 生产模式
npm start
```

---

## 🔧 配置说明

### USB 打印机配置

**自动检测（推荐）:**
```env
PRINTER_TYPE=usb
USB_VENDOR_ID=
USB_PRODUCT_ID=
```

**手动指定:**
```bash
# 查找 USB 打印机
lsusb

# 示例输出：
# Bus 001 Device 005: ID 04b8:0e15 Seiko Epson Corp.
#                        ^^^^  ^^^^
#                     Vendor ID  Product ID
```

```env
PRINTER_TYPE=usb
USB_VENDOR_ID=04b8
USB_PRODUCT_ID=0e15
```

### 网络打印机配置 (v2.1.0+)

```env
PRINTER_TYPE=network
NETWORK_PRINTER_IP=192.168.1.100
NETWORK_PRINTER_PORT=9100
```

### 店铺信息配置

```env
STORE_NAME=您的店铺名称
STORE_ADDRESS=店铺详细地址
STORE_PHONE=联系电话
STORE_TAX_ID=税务登记号
```

### 纸张宽度设置

| 纸张尺寸 | 字符宽度 | 配置值 |
|---------|---------|--------|
| 58mm    | 32      | 32     |
| 80mm    | 48      | 48     |

---

## 🌐 API 接口

### GET /health

健康检查接口

**响应:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-13T08:00:00.000Z",
  "config": {
    "printerType": "usb",
    "paperWidth": 48
  }
}
```

### GET /test

测试打印机连接（打印简单测试页）

**响应:**
```json
{
  "success": true,
  "message": "Test print sent successfully"
}
```

### POST /test-receipt

打印带示例数据的测试小票

**响应:**
```json
{
  "success": true,
  "message": "Receipt printed successfully"
}
```

### POST /print

打印订单小票

**请求体:**
```json
{
  "id": "12345",
  "receipt_number": "RCP-12345",
  "created_at": "2025-11-13T08:00:00.000Z",
  "cashier_name": "张三",
  "customer_name": "李四",
  "items": [
    {
      "product_name": "商品 1",
      "quantity": 2,
      "price": 10.5
    },
    {
      "product_name": "商品 2",
      "quantity": 1,
      "price": 25.0
    }
  ],
  "subtotal": 46.0,
  "tax": 0,
  "discount": 0,
  "total_amount": 46.0,
  "payment_method": "cash",
  "payment_amount": 50.0,
  "payment_data": {
    "member_name": "VIP 会员",
    "member_code": "M001"
  }
}
```

**响应:**
```json
{
  "success": true,
  "message": "Receipt printed successfully"
}
```

---

## 🔗 与 XiPOS 系统集成

打印服务器与 XiPOS 收银系统无缝集成：

1. **POS 前端** 完成销售交易
2. **发送订单数据** 到打印服务器
3. **格式化小票** 自动排版
4. **打印小票** 输出到热敏打印机
5. **返回确认** 通知 POS 系统打印结果

### 集成示例 (JavaScript)

```javascript
// 在 XiPOS 前端发送打印请求
async function printReceipt(orderData) {
  const response = await fetch('http://localhost:3344/print', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  const result = await response.json();
  if (result.success) {
    console.log('打印成功！');
  } else {
    console.error('打印失败:', result.error);
  }
}
```

---

## 🎯 在 XiPOS 系统中的使用

### 启动整个 XiPOS 系统

```bash
cd /path/to/xipos/sources

# 客户端模式（包含打印服务器）
./start.sh

# 服务器模式（不包含打印服务器）
export ENABLE_PRINT_SERVER=false
./start.sh
```

**详细部署说明:** 查看 [../DEPLOYMENT.md](../DEPLOYMENT.md)

### 单独启动打印服务器

```bash
cd xi-print-server

# Docker 模式
./start.sh

# 或手动启动
npm start
```

---

## 🛠️ 常用操作

### Docker 模式

```bash
# 查看容器状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 重启容器
docker compose restart

# 停止容器
docker compose stop

# 完全删除容器
docker compose down

# 重新构建镜像
docker compose build --no-cache
```

### 调试模式

```bash
# 进入容器内部
docker compose exec xi-print-server sh

# 查看容器内文件
docker compose exec xi-print-server ls -la

# 查看环境变量
docker compose exec xi-print-server env
```

---

## 🐛 故障排除

### ❌ USB 打印机未检测到

**解决方案:**

1. **检查 USB 连接**
   ```bash
   lsusb
   # 应该能看到打印机设备
   ```

2. **检查权限**
   ```bash
   ls -la /dev/usb/lp*
   # 或
   ls -la /dev/bus/usb/
   ```

3. **添加用户到 lp 组**
   ```bash
   sudo usermod -aG lp $USER
   # 重新登录或运行
   newgrp lp
   ```

4. **重启容器**
   ```bash
   docker compose restart
   ```

### ❌ Docker 容器无法启动

**解决方案:**

1. **查看详细日志**
   ```bash
   docker compose logs
   ```

2. **检查端口占用**
   ```bash
   sudo netstat -tlnp | grep 3344
   # 或
   lsof -i :3344
   ```

3. **完全重建**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

### ❌ 打印质量问题

**解决方案:**

1. **检查纸张宽度设置**
   - 确保 `PAPER_WIDTH` 与实际纸张匹配
   - 58mm → 32 字符
   - 80mm → 48 字符

2. **检查 ESC/POS 兼容性**
   - 确认打印机支持 ESC/POS 协议

3. **更新打印机固件**
   - 访问打印机厂商官网

### ❌ 网络打印机无法工作

**注意:** v2.0 暂不支持网络打印机

**解决方案:**
- 使用 USB 打印机
- 或等待 v2.1.0 版本
- 或回退到 v1.0.x

---

## 📁 项目结构

```
xi-print-server/
├── src/
│   ├── config.js              # 配置管理
│   ├── printer.js             # 打印机设备初始化
│   ├── receipt-formatter.js   # 小票格式化逻辑
│   ├── print-handler.js       # 打印操作处理
│   ├── server.js              # Express 服务器
│   └── test-print.js          # 测试脚本
├── .env.example               # 环境变量模板
├── .dockerignore              # Docker 忽略文件
├── Dockerfile                 # Docker 镜像配置
├── docker-compose.yml         # Docker Compose 配置
├── package.json               # Node.js 依赖
├── start.sh                   # 启动脚本
├── README.md                  # 本文档
└── DOCKER.md                  # Docker 详细文档
```

---

## 📚 相关文档

- **[DOCKER.md](./DOCKER.md)** - Docker 部署完整指南
- **[../DEPLOYMENT.md](../DEPLOYMENT.md)** - XiPOS 系统部署指南
- **[USB-PRINTER-SUCCESS.md](./USB-PRINTER-SUCCESS.md)** - USB 打印机配置成功案例

---

## 🔄 更新和维护

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建 Docker 镜像
docker compose build --no-cache

# 重启服务
docker compose up -d
```

### 备份配置

```bash
# 备份 .env 配置
cp .env .env.backup.$(date +%Y%m%d)

# 备份日志
cp -r logs logs.backup.$(date +%Y%m%d)
```

### 清理旧镜像

```bash
# 删除未使用的镜像
docker image prune -a

# 查看镜像大小
docker images | grep xipos/print-server
```

---

## 📈 性能优化

### Docker 资源限制

编辑 `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'      # 增加 CPU 限制
      memory: 1G     # 增加内存限制
```

### 日志管理

日志自动轮转配置（已包含在 docker-compose.yml）:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"  # 单个文件最大 10MB
    max-file: "3"    # 最多保留 3 个文件
```

---

## 🤝 技术支持

### 报告问题时请提供：

1. **Docker 版本**
   ```bash
   docker --version
   docker compose version
   ```

2. **系统信息**
   ```bash
   uname -a
   ```

3. **容器日志**
   ```bash
   docker compose logs > print-server-logs.txt
   ```

4. **打印机信息**
   ```bash
   lsusb > printer-info.txt
   ```

---

## 📄 许可证

MIT License

---

## 🎉 致谢

- [morden-node-escpos](https://github.com/gylove1994/morden-node-escpos) - 优秀的 ESC/POS 库
- XiPOS 开发团队
- 所有贡献者和测试者
