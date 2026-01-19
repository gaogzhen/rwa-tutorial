# 部署 Issuer 合约到 Avalanche Fuji 测试网

本文档说明如何在 Avalanche Fuji 测试网上部署 Issuer 合约，并设置 RealEstateToken 的 Issuer。

## 部署方式

### 方式 1: 一键部署（推荐）

如果您还没有部署 RealEstateToken，可以使用组合部署模块一次性部署所有合约：

```bash
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network avalancheFuji
```

这会自动：
1. 部署 RealEstateToken
2. 部署 Issuer
3. 设置 RealEstateToken 的 Issuer

### 方式 2: 分步部署

如果您已经部署了 RealEstateToken，可以单独部署 Issuer。

## 前置要求

1. **RealEstateToken 已部署**（仅方式 2 需要）
   - 如果还未部署，请使用方式 1 或参考 [DEPLOY_FUJI.md](./DEPLOY_FUJI.md) 部署 RealEstateToken
   - 记录部署后的 RealEstateToken 合约地址

2. **配置变量已设置**
   - `AVALANCHE_FUJI_RPC_URL`: Avalanche Fuji 测试网 RPC URL
   - `AVALANCHE_FUJI_PRIVATE_KEY`: 部署账户的私钥
   - 详细设置方法请参考 [SETUP_PRIVATE_KEY.md](./SETUP_PRIVATE_KEY.md)

3. **账户有足够的 AVAX**
   - 确保部署账户有足够的 AVAX 支付 gas 费用

## 部署步骤

### 方式 1: 一键部署（推荐）

#### 步骤 1: 编译合约

```bash
npx hardhat compile
```

#### 步骤 2: 一键部署所有合约

```bash
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network avalancheFuji
```

部署完成后，您将看到：
- RealEstateToken 合约地址
- Issuer 合约地址
- setIssuer 调用已执行

### 方式 2: 分步部署

#### 步骤 1: 编译合约

```bash
npx hardhat compile
```

#### 步骤 2: 部署 RealEstateToken（如果还未部署）

```bash
npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
```

记录部署后的 RealEstateToken 合约地址。

#### 步骤 3: 部署 Issuer 合约

#### 方式 1: 使用命令行参数（推荐）

```bash
npx hardhat ignition deploy ignition/modules/Issuer.ts \
  --network avalancheFuji \
  --parameters '{"IssuerModule":{"realEstateTokenAddress":"0x你的RealEstateToken地址"}}'
```

将 `0x你的RealEstateToken地址` 替换为实际部署的 RealEstateToken 合约地址。

#### 方式 2: 使用参数文件

创建 `ignition/modules/parameters.json` 文件：

```json
{
  "IssuerModule": {
    "realEstateTokenAddress": "0x你的RealEstateToken地址",
    "functionsRouterAddress": "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0"
  }
}
```

然后运行：

```bash
npx hardhat ignition deploy ignition/modules/Issuer.ts \
  --network avalancheFuji \
  --parameters ignition/modules/parameters.json
```

#### 步骤 4: 验证部署

部署成功后，您将看到：

- Issuer 合约地址
- 交易哈希
- Gas 使用量
- setIssuer 调用已执行（RealEstateToken 的 Issuer 已设置）

## 测试合约功能

### 快速测试

```bash
# 设置合约地址
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export ISSUER_ADDRESS=0x你的Issuer地址

# 运行测试
npx hardhat run scripts/test-issuer.ts --network avalancheFuji
```

### 测试内容

测试脚本会验证：

1. **合约地址有效性**：检查合约是否已部署
2. **基本信息**：验证 owner 和配置
3. **RealEstateToken 集成**：验证与 RealEstateToken 的连接
4. **Issuer 设置**：通过事件验证 Issuer 是否已正确设置
5. **账户余额**：检查测试账户 AVAX 余额
6. **cancelPendingRequest**：测试取消待处理请求功能
7. **issue 函数接口**：验证函数接口可用性
8. **权限控制**：验证只有 owner 可以调用关键函数
9. **Chainlink Functions 配置**：检查 getNftMetadata 脚本配置
10. **事件检查**：查找历史发行事件

## 部署后操作

### 验证 Issuer 设置

部署完成后，Issuer 会自动设置为 RealEstateToken 的发行者。您可以通过以下方式验证：

1. **运行测试脚本**
   ```bash
   npx hardhat run scripts/test-issuer.ts --network avalancheFuji
   ```

2. **查看交易日志**
   - 在部署输出中查找 `setIssuer` 调用的交易哈希
   - 在 Avalanche Snowtrace (Fuji) 上查看交易详情

3. **调用合约函数验证**
   - 使用 Hardhat console 或前端应用调用 RealEstateToken 的相关函数
   - 验证 Issuer 地址是否正确设置

### 使用 Issuer 发行代币

设置完成后，您可以使用 Issuer 合约发行新的房地产代币：

```typescript
// 使用 Hardhat console
npx hardhat console --network avalancheFuji

const issuer = await ethers.getContractAt("Issuer", "0x你的Issuer地址");

// 发行代币（需要 Chainlink Functions 订阅 ID 和 DON ID）
await issuer.issue(
  "0x接收者地址",     // 接收者地址
  1000,              // 发行数量
  订阅ID,             // Chainlink Functions 订阅 ID
  300000,             // Gas 限制
  "0x" + "0".repeat(64) // DON ID
);
```

**注意**：
- 需要先创建 Chainlink Functions 订阅并充值 LINK
- 获取订阅 ID 和 DON ID
- 等待 Chainlink Functions 返回元数据后，代币才会被铸造

## 参数说明

### 必需参数

- **realEstateTokenAddress**: 已部署的 RealEstateToken 合约地址
  - 格式：`0x` 开头的 42 字符地址
  - 如果未提供或使用默认值，部署会失败

### 可选参数

- **functionsRouterAddress**: Chainlink Functions Router 地址
  - 默认值：`0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0`（Avalanche Fuji）
  - 如果 Chainlink 更新了地址，请从[官方文档](https://docs.chain.link/chainlink-functions/supported-networks)获取最新地址

## 故障排除

### 错误：RealEstateToken 地址无效

**问题**：提供的 RealEstateToken 地址不存在或格式错误

**解决方案**：
- 确认 RealEstateToken 已成功部署
- 检查地址格式是否正确（42 字符，以 `0x` 开头）
- 确认地址属于 Avalanche Fuji 测试网

### 错误：setIssuer 调用失败

**问题**：无法设置 Issuer，可能是权限问题

**解决方案**：
- 确认部署账户是 RealEstateToken 的 owner
- 检查 RealEstateToken 合约的 owner 地址
- 如果 owner 不同，需要先转移 ownership 或使用正确的账户部署

### 错误：Gas 不足

**问题**：账户 AVAX 余额不足

**解决方案**：
- 从 [Avalanche Faucet](https://faucet.avalanche.org/) 获取测试网 AVAX
- 检查账户余额是否足够支付 gas 费用

### 错误：Functions Router 地址无效

**问题**：提供的 Functions Router 地址不正确

**解决方案**：
- 从 [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions/supported-networks) 获取最新地址
- 确认地址适用于 Avalanche Fuji 测试网

## 部署流程总结

### 方式 1: 一键部署流程

```
1. 运行 DeployAll 模块
   ↓
2. 自动部署 RealEstateToken
   ↓
3. 自动部署 Issuer
   ↓
4. 自动设置 RealEstateToken 的 Issuer
   ↓
5. 验证部署和设置
   ↓
6. 使用 Issuer 发行代币
```

### 方式 2: 分步部署流程

```
1. 部署 RealEstateToken
   ↓
2. 获取 RealEstateToken 地址
   ↓
3. 部署 Issuer（使用 RealEstateToken 地址）
   ↓
4. 自动设置 RealEstateToken 的 Issuer
   ↓
5. 验证部署和设置
   ↓
6. 使用 Issuer 发行代币
```

## 参考链接

- [部署 RealEstateToken](./DEPLOY_FUJI.md)
- [设置私钥指南](./SETUP_PRIVATE_KEY.md)
- [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [Hardhat Ignition 文档](https://hardhat.org/ignition)

## 下一步

部署完成后，您可以：

1. **配置 Chainlink Functions 订阅**
   - 创建 Chainlink Functions 订阅
   - 为订阅充值 LINK 代币
   - 获取订阅 ID 和 DON ID

2. **发行第一个代币**
   - 使用 Issuer 合约的 `issue` 函数
   - 等待 Chainlink Functions 返回元数据
   - 验证代币已成功铸造

3. **集成到应用**
   - 在前端应用中集成 Issuer 合约
   - 实现代币发行界面
   - 添加代币查看和管理功能
