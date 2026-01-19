# 部署 RwaLending 合约到 Avalanche Fuji 测试网

本文档说明如何在 Avalanche Fuji 测试网上部署 RwaLending 合约，并测试其功能。

## 前置要求

1. **RealEstateToken 已部署**
   - RealEstateToken 合约必须已部署到 Avalanche Fuji 测试网
   - 记录部署后的 RealEstateToken 合约地址

2. **配置变量已设置**
   - `AVALANCHE_FUJI_RPC_URL`: Avalanche Fuji 测试网 RPC URL
   - `AVALANCHE_FUJI_PRIVATE_KEY`: 部署账户的私钥
   - 详细设置方法请参考 [SETUP_PRIVATE_KEY.md](./SETUP_PRIVATE_KEY.md)

3. **账户有足够的 AVAX**
   - 确保部署账户有足够的 AVAX 支付 gas 费用

## 部署步骤

### 步骤 1: 编译合约

```bash
npx hardhat compile
```

### 步骤 2: 部署 RwaLending 合约

#### 方式 1: 使用命令行参数（推荐）

```bash
npx hardhat ignition deploy ignition/modules/RwaLending.ts \
  --network avalancheFuji \
  --parameters '{"RwaLendingModule":{"realEstateTokenAddress":"0x你的RealEstateToken地址"}}'
```

将 `0x你的RealEstateToken地址` 替换为实际部署的 RealEstateToken 合约地址。

#### 方式 2: 使用参数文件

创建 `ignition/modules/parameters.json` 文件：

```json
{
  "RwaLendingModule": {
    "realEstateTokenAddress": "0x你的RealEstateToken地址",
    "usdcAddress": "0x5425890298aed601595a70AB815c96711a31Bc65",
    "usdcUsdAggregatorAddress": "0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad",
    "usdcUsdFeedHeartbeat": 86400
  }
}
```

然后运行：

```bash
npx hardhat ignition deploy ignition/modules/RwaLending.ts \
  --network avalancheFuji \
  --parameters ignition/modules/parameters.json
```

### 步骤 3: 验证部署

部署成功后，您将看到：
- RwaLending 合约地址
- 交易哈希
- Gas 使用量

## 参数说明

### 必需参数

- **realEstateTokenAddress**: 已部署的 RealEstateToken 合约地址
  - 格式：`0x` 开头的 42 字符地址
  - 如果未提供或使用默认值，部署会失败

### 可选参数

- **usdcAddress**: USDC 测试代币地址
  - 默认值：`0x5425890298aed601595a70AB815c96711a31Bc65`（Avalanche Fuji 测试网）
  - 如果使用不同的 USDC 测试代币，请更新此地址

- **usdcUsdAggregatorAddress**: Chainlink USDC/USD 价格聚合器地址
  - 默认值：`0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad`（Avalanche Fuji 测试网）
  - 如果 Chainlink 更新了地址，请从[官方文档](https://docs.chain.link/data-feeds/price-feeds/addresses)获取最新地址

- **usdcUsdFeedHeartbeat**: 价格源心跳时间（秒）
  - 默认值：`86400`（24 小时）
  - 这是价格数据被认为有效的最大时间间隔

## 测试合约功能

### 快速测试

```bash
# 设置合约地址
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export RWA_LENDING_ADDRESS=0x你的RwaLending地址

# 运行测试
npx hardhat run scripts/test-rwa-lending.ts --network avalancheFuji
```

### 测试内容

测试脚本会验证：

1. **合约地址有效性**：检查合约是否已部署
2. **基本信息**：验证 owner 和配置
3. **价格聚合器**：测试 USDC/USD 价格获取
4. **账户余额**：检查测试账户 AVAX 余额
5. **合约权限**：验证 owner 权限
6. **只读函数**：测试接口和估值函数
7. **RealEstateToken 集成**：验证与 RealEstateToken 的连接
8. **借贷功能接口**：验证函数接口可用性

## 完整功能测试流程

要进行完整的借贷功能测试，需要以下步骤：

### 1. 准备测试环境

```bash
# 确保已部署所有合约
# - RealEstateToken
# - Issuer
# - RwaLending
```

### 2. 发行房地产代币

使用 Issuer 合约发行代币（需要 Chainlink Functions 订阅）：

```typescript
// 使用 Hardhat console
npx hardhat console --network avalancheFuji

const issuer = await ethers.getContractAt("Issuer", "0x你的Issuer地址");
await issuer.issue(
  "0x接收者地址",
  1000,              // 发行数量
  订阅ID,            // Chainlink Functions 订阅 ID
  300000,            // Gas 限制
  "0x" + "0".repeat(64) // DON ID
);
```

### 3. 设置代币价格数据

使用 RealEstatePriceDetails 设置价格（需要 Chainlink Functions 订阅）：

```typescript
const realEstateToken = await ethers.getContractAt("RealEstateToken", "0x...");
await realEstateToken.updatePriceDetails(
  "0",               // tokenId（字符串格式）
  订阅ID,            // Chainlink Functions 订阅 ID
  300000,            // Gas 限制
  "0x" + "0".repeat(64) // DON ID
);
```

### 4. 向 RwaLending 充值 USDC

```typescript
const usdc = await ethers.getContractAt("IERC20", "0x5425890298aed601595a70AB815c96711a31Bc65");
const rwaLending = await ethers.getContractAt("RwaLending", "0x...");

// 授权 RwaLending 使用 USDC
await usdc.approve(rwaLending.address, ethers.parseUnits("1000000", 6)); // 100万 USDC

// 注意：RwaLending 合约需要实现接收 USDC 的功能
// 或者通过其他方式向合约充值 USDC
```

### 5. 用户授权代币

```typescript
const realEstateToken = await ethers.getContractAt("RealEstateToken", "0x...");
const rwaLending = await ethers.getContractAt("RwaLending", "0x...");

// 授权 RwaLending 管理用户的代币
await realEstateToken.setApprovalForAll(rwaLending.address, true);
```

### 6. 执行借贷

```typescript
const rwaLending = await ethers.getContractAt("RwaLending", "0x...");

// 借贷 USDC
await rwaLending.borrow(
  0,                 // tokenId
  100,               // 代币数量
  "0x",              // data
  ethers.parseUnits("1000", 6),  // 最小贷款金额（USDC，6位小数）
  ethers.parseUnits("2000", 6)   // 最大清算阈值（USDC，6位小数）
);
```

### 7. 还款

```typescript
// 还款
await rwaLending.repay(0); // tokenId
```

### 8. 清算（如果需要）

```typescript
// 清算贷款（当价格下跌导致抵押品价值不足时）
await rwaLending.liquidate(0, "0x借款人地址");
```

## 故障排除

### 错误：RealEstateToken 地址无效

**问题**：提供的 RealEstateToken 地址不存在或格式错误

**解决方案**：
- 确认 RealEstateToken 已成功部署
- 检查地址格式是否正确（42 字符，以 `0x` 开头）
- 确认地址属于 Avalanche Fuji 测试网

### 错误：价格聚合器不可用

**问题**：USDC/USD 价格聚合器返回错误或数据过期

**解决方案**：
- 检查 Chainlink 价格聚合器地址是否正确
- 确认价格源心跳时间设置合理
- 检查网络连接和 Chainlink 服务状态

### 错误：估值无效

**问题**：无法获取代币估值

**解决方案**：
- 确保代币价格数据已通过 RealEstatePriceDetails 设置
- 检查价格数据是否完整（listPrice, originalListPrice, taxAssessedValue）
- 验证价格数据是否在有效期内

### 错误：USDC 余额不足

**问题**：合约或用户 USDC 余额不足

**解决方案**：
- 向 RwaLending 合约充值足够的 USDC
- 确保用户有足够的 USDC 进行还款
- 从 Avalanche Fuji 测试网获取 USDC 测试代币

## 参考链接

- [部署 RealEstateToken](./DEPLOY_FUJI.md)
- [部署 Issuer](./DEPLOY_ISSUER.md)
- [测试已部署合约](./TEST_DEPLOYED.md)
- [Chainlink Price Feeds 文档](https://docs.chain.link/data-feeds/price-feeds)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [Hardhat Ignition 文档](https://hardhat.org/ignition)

## 下一步

部署完成后，您可以：

1. **运行基础测试**
   ```bash
   npx hardhat run scripts/test-rwa-lending.ts --network avalancheFuji
   ```

2. **准备测试数据**
   - 发行房地产代币
   - 设置价格数据
   - 充值 USDC

3. **测试完整借贷流程**
   - 执行借贷操作
   - 测试还款功能
   - 验证清算机制

4. **集成到应用**
   - 在前端应用中集成 RwaLending 合约
   - 实现借贷界面
   - 添加风险提示和用户教育
