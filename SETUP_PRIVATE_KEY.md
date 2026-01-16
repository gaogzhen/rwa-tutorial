# 如何设置部署账户私钥

本文档说明如何安全地设置部署账户私钥，用于将合约部署到 Avalanche Fuji 测试网。

## ⚠️ 安全提示

**永远不要将私钥提交到 Git 仓库！**
- 私钥应该保存在本地
- 使用 `.gitignore` 确保私钥文件不会被提交
- 不要与他人分享您的私钥

## 📍 Keystore 存储位置

Hardhat 3 的 Keystore 文件存储在以下位置：

### macOS
```
~/Library/Preferences/hardhat-nodejs/keystore.json
```
或完整路径：
```
/Users/你的用户名/Library/Preferences/hardhat-nodejs/keystore.json
```

### Linux
```
~/.config/hardhat-nodejs/keystore.json
```
或完整路径：
```
/home/你的用户名/.config/hardhat-nodejs/keystore.json
```

### Windows
```
%APPDATA%\hardhat-nodejs\keystore.json
```
或完整路径：
```
C:\Users\你的用户名\AppData\Roaming\hardhat-nodejs\keystore.json
```

### 查看存储位置

**macOS**:
```bash
# 查看 keystore 文件
ls -la ~/Library/Preferences/hardhat-nodejs/keystore.json

# 查看目录内容
ls -la ~/Library/Preferences/hardhat-nodejs/
```

**Linux**:
```bash
# 查看 keystore 文件
ls -la ~/.config/hardhat-nodejs/keystore.json

# 查看目录内容
ls -la ~/.config/hardhat-nodejs/
```

**Windows (PowerShell)**:
```powershell
# 查看 keystore 文件
dir $env:APPDATA\hardhat-nodejs\keystore.json

# 查看目录内容
dir $env:APPDATA\hardhat-nodejs\
```

### 文件结构

- **所有配置变量都存储在一个 JSON 文件中**：`keystore.json`
- 文件内容是加密的，需要密码才能解密
- 这是一个集中式的存储方式，所有密钥都在同一个文件中

### ⚠️ 重要说明

- Hardhat 3 使用**单个 JSON 文件**存储所有密钥，而不是每个密钥一个文件
- 文件会在您**第一次运行 `npx hardhat keystore set` 时自动创建**
- 如果您还没有设置过任何 keystore，文件就不会存在

## 方法 1: 使用 Hardhat Keystore（推荐）

Hardhat Keystore 是 Hardhat 3 提供的安全密钥管理工具，它会加密存储您的私钥。

### 步骤 1: 设置私钥

运行以下命令：

```bash
npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
```

系统会提示您：
1. 输入私钥（输入时不会显示，这是正常的）
2. 设置密码来加密存储的私钥
3. 确认密码

### 步骤 2: 验证设置

检查私钥是否已设置：

```bash
npx hardhat keystore list
```

您应该能看到 `AVALANCHE_FUJI_PRIVATE_KEY` 在列表中。

### 步骤 3: 使用私钥

设置完成后，Hardhat 会自动读取并使用该私钥进行部署，无需额外配置。

### 管理 Keystore

- **查看所有存储的密钥**：
  ```bash
  npx hardhat keystore list
  ```

- **删除密钥**：
  ```bash
  npx hardhat keystore delete AVALANCHE_FUJI_PRIVATE_KEY
  ```

- **更新密钥**：
  ```bash
  npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
  ```

## 方法 2: 使用环境变量

如果您不想使用 Keystore，可以使用环境变量。

### 步骤 1: 创建 `.env` 文件（如果还没有）

在项目根目录创建 `.env` 文件：

```bash
touch .env
```

### 步骤 2: 添加私钥到 `.env` 文件

在 `.env` 文件中添加：

```bash
AVALANCHE_FUJI_PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**注意**：
- 私钥可以带或不带 `0x` 前缀
- 确保没有引号（除非私钥本身包含特殊字符）

### 步骤 3: 确保 `.env` 在 `.gitignore` 中

检查 `.gitignore` 文件是否包含 `.env`：

```bash
echo ".env" >> .gitignore
```

### 步骤 4: 安装 dotenv 包（如果需要）

如果 Hardhat 配置需要加载环境变量，可能需要安装 `dotenv`：

```bash
npm install --save-dev dotenv
```

然后在 `hardhat.config.ts` 顶部添加：

```typescript
import "dotenv/config";
```

**注意**：Hardhat 3 的 `configVariable` 函数会自动从环境变量中读取，所以可能不需要 `dotenv`。

### 步骤 5: 使用环境变量

设置环境变量后，Hardhat 会自动读取。您也可以手动设置：

**Linux/macOS**:
```bash
export AVALANCHE_FUJI_PRIVATE_KEY="your_private_key_here"
```

**Windows (PowerShell)**:
```powershell
$env:AVALANCHE_FUJI_PRIVATE_KEY="your_private_key_here"
```

**Windows (CMD)**:
```cmd
set AVALANCHE_FUJI_PRIVATE_KEY=your_private_key_here
```

## 方法 3: 直接在配置文件中设置（不推荐）

⚠️ **不推荐此方法**，因为会将私钥暴露在代码中。

如果必须使用，可以在 `hardhat.config.ts` 中直接设置：

```typescript
accounts: ["your_private_key_here"]
```

**强烈建议不要这样做**，特别是如果代码会被提交到版本控制系统。

## 获取测试账户私钥

### 方式 1: 使用 MetaMask

1. 打开 MetaMask 扩展
2. 选择或创建测试账户
3. 点击账户名称 → "账户详情"
4. 点击 "导出私钥"
5. 输入密码确认
6. 复制私钥

### 方式 2: 使用 Hardhat 生成

```bash
npx hardhat node
```

这会启动本地节点并显示一些测试账户及其私钥。

### 方式 3: 使用在线工具（仅用于测试）

⚠️ **仅用于测试网，不要用于主网！**

可以使用在线工具生成测试账户，但请确保：
- 仅用于测试网
- 不要存储任何有价值的资产
- 使用后立即丢弃

## 验证设置

设置私钥后，可以通过以下方式验证：

### 1. 检查账户余额

```bash
npx hardhat run scripts/check-balance.ts --network avalancheFuji
```

（需要创建检查余额的脚本）

### 2. 尝试部署

```bash
npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
```

如果私钥设置正确，部署应该能够进行（假设账户有足够的 AVAX）。

## 常见问题

### Q: 私钥格式是什么？

A: 私钥是一个 64 字符的十六进制字符串，可以带或不带 `0x` 前缀：
- 正确：`0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- 正确：`1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### Q: 如何获取测试网 AVAX？

A: 从 Avalanche Faucet 获取：
- [Avalanche Faucet](https://faucet.avalanche.org/)
- 或使用其他测试网水龙头

### Q: Keystore 文件存储在哪里？

A: Hardhat 3 的 Keystore 文件存储在以下位置：

- **macOS**: `~/Library/Preferences/hardhat-nodejs/keystore.json`
- **Linux**: `~/.config/hardhat-nodejs/keystore.json`
- **Windows**: `%APPDATA%\hardhat-nodejs\keystore.json`

**重要**：Hardhat 3 使用**单个 JSON 文件**存储所有密钥，而不是每个密钥一个文件。

**查看存储位置的方法**：

在终端中运行：
```bash
# macOS - 查看文件
ls -la ~/Library/Preferences/hardhat-nodejs/keystore.json

# Linux - 查看文件
ls -la ~/.config/hardhat-nodejs/keystore.json

# Windows (PowerShell) - 查看文件
dir $env:APPDATA\hardhat-nodejs\keystore.json
```

**文件结构**：
- 所有配置变量都存储在一个加密的 JSON 文件中：`keystore.json`
- 文件内容是加密的，需要密码才能解密
- 这是一个集中式的存储方式

**安全提示**：
- 文件已加密，即使被访问也需要密码
- 建议定期备份 keystore.json 文件（但要安全存储备份）
- 不要将 keystore.json 文件提交到 Git 仓库

### Q: 忘记 Keystore 密码怎么办？

A: 无法恢复。您需要：
1. 删除旧的密钥：`npx hardhat keystore delete AVALANCHE_FUJI_PRIVATE_KEY`
2. 重新设置密钥：`npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY`

### Q: 环境变量和 Keystore 哪个更安全？

A: Keystore 更安全，因为：
- 私钥被加密存储
- 需要密码才能访问
- 不会意外暴露在环境变量中

## 下一步

设置好私钥后，您可以：

1. **编译合约**：
   ```bash
   npx hardhat compile
   ```

2. **部署合约**：
   ```bash
   npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
   ```

3. **查看部署文档**：
   参考 `DEPLOY_FUJI.md` 获取详细部署说明

## 参考

- [Hardhat Keystore 文档](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-keystore)
- [Hardhat 配置变量文档](https://hardhat.org/hardhat-runner/docs/config#configuration-variables)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
