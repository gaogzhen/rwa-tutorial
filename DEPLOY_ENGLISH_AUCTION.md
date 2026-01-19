# 部署 EnglishAuction 合约到 Avalanche Fuji 测试网

本文档说明如何在 Avalanche Fuji 测试网上部署 EnglishAuction 合约，并测试其功能。

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
   - 如果测试拍卖功能，需要额外的 AVAX 用于出价

## 部署步骤

### 步骤 1: 编译合约

```bash
npx hardhat compile
```

### 步骤 2: 部署 EnglishAuction 合约

#### 方式 1: 使用命令行参数（推荐）

```bash
npx hardhat ignition deploy ignition/modules/EnglishAuction.ts \
  --network avalancheFuji \
  --parameters '{"EnglishAuctionModule":{"realEstateTokenAddress":"0x你的RealEstateToken地址"}}'
```

将 `0x你的RealEstateToken地址` 替换为实际部署的 RealEstateToken 合约地址。

#### 方式 2: 使用参数文件

创建 `ignition/modules/parameters.json` 文件：

```json
{
  "EnglishAuctionModule": {
    "realEstateTokenAddress": "0x你的RealEstateToken地址"
  }
}
```

然后运行：

```bash
npx hardhat ignition deploy ignition/modules/EnglishAuction.ts \
  --network avalancheFuji \
  --parameters ignition/modules/parameters.json
```

### 步骤 3: 验证部署

部署成功后，您将看到：
- EnglishAuction 合约地址
- 交易哈希
- Gas 使用量

**重要**：部署账户会自动成为 seller（卖家），只有 seller 可以开始拍卖。

## 测试合约功能

### 快速测试

```bash
# 设置合约地址
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export ENGLISH_AUCTION_ADDRESS=0x你的EnglishAuction地址

# 运行测试
npx hardhat run scripts/test-english-auction.ts --network avalancheFuji
```

### 测试内容

测试脚本会验证：

1. **合约地址有效性**：检查合约是否已部署
2. **基本信息**：验证当前拍卖状态
3. **账户余额**：检查测试账户 AVAX 余额
4. **RealEstateToken 集成**：验证与 RealEstateToken 的连接
5. **接口支持**：验证 ERC1155Receiver 和 IERC165 接口
6. **历史事件**：查找历史拍卖、出价和结束事件
7. **权限控制**：验证只有 seller 可以开始拍卖
8. **只读函数**：测试 getTokenIdOnAuction 函数
9. **合约余额**：检查合约中的 AVAX 余额
10. **完整流程接口**：验证所有函数接口可用性

## 完整功能测试流程

要进行完整的拍卖功能测试，需要以下步骤：

### 1. 准备测试环境

```bash
# 确保已部署所有合约
# - RealEstateToken
# - Issuer
# - EnglishAuction
```

### 2. 发行房地产代币给 Seller

使用 Issuer 合约发行代币给 seller：

```typescript
// 使用 Hardhat console
npx hardhat console --network avalancheFuji

const issuer = await ethers.getContractAt("Issuer", "0x你的Issuer地址");
const sellerAddress = "0x你的Seller地址";

// 发行代币（需要 Chainlink Functions 订阅）
await issuer.issue(
  sellerAddress,     // 接收者地址（seller）
  1000,              // 发行数量
  订阅ID,            // Chainlink Functions 订阅 ID
  300000,            // Gas 限制
  "0x" + "0".repeat(64) // DON ID
);
```

### 3. Seller 授权 EnglishAuction

```typescript
const realEstateToken = await ethers.getContractAt("RealEstateToken", "0x...");
const englishAuction = await ethers.getContractAt("EnglishAuction", "0x...");

// Seller 授权 EnglishAuction 管理代币
await realEstateToken.setApprovalForAll(englishAuction.address, true);
```

### 4. 开始拍卖

```typescript
const englishAuction = await ethers.getContractAt("EnglishAuction", "0x...");

// 开始拍卖
await englishAuction.startAuction(
  0,                 // tokenId
  100,               // 代币数量
  "0x",              // data
  ethers.parseEther("1") // 起始出价（1 AVAX）
);
```

### 5. Bidder 出价

```typescript
// Bidder 1 出价 2 AVAX
await englishAuction.bid({
  value: ethers.parseEther("2")
});

// Bidder 2 出价 3 AVAX（必须高于当前最高出价）
await englishAuction.bid({
  value: ethers.parseEther("3")
});
```

### 6. 撤回出价（可选）

```typescript
// 非最高出价者可以撤回出价
await englishAuction.withdrawBid();
```

### 7. 结束拍卖

有两种方式结束拍卖：

#### 方式 1: 手动结束（测试用）

```typescript
// 等待拍卖时间结束（7天）或手动结束
// 注意：只能在实际时间到达后才能结束
await englishAuction.endAuction();
```

#### 方式 2: 自动结束（推荐 - 使用 Chainlink Automation）

EnglishAuction 合约已集成 Chainlink Automation，可以在拍卖到期时自动结束。需要注册 Chainlink Automation Upkeep：

1. **访问 Chainlink Automation 界面**
   - 主网：https://automation.chain.link/
   - Avalanche Fuji 测试网：https://automation.chain.link/fuji

2. **注册新的 Upkeep**
   - 选择 "Custom Logic"
   - 输入 EnglishAuction 合约地址
   - 设置检查间隔（建议：1 小时或更短）
   - 设置 Gas 限制（建议：500,000）
   - 充值 LINK 代币用于支付 Automation 费用

3. **配置 checkData**
   - 当前版本不需要 checkData，可以留空或使用 `0x`

4. **验证 Upkeep**
   - 注册后，Chainlink Automation 会定期调用 `checkUpkeep`
   - 当拍卖到期时，会自动调用 `performUpkeep` 结束拍卖

**注意**：
- 需要确保 Upkeep 账户有足够的 LINK 代币
- 建议设置较低的检查间隔以确保及时执行
- 可以在 Chainlink Automation 界面监控 Upkeep 状态

## 参数说明

### 必需参数

- **realEstateTokenAddress**: 已部署的 RealEstateToken 合约地址
  - 格式：`0x` 开头的 42 字符地址
  - 如果未提供或使用默认值，部署会失败

## 故障排除

### 错误：RealEstateToken 地址无效

**问题**：提供的 RealEstateToken 地址不存在或格式错误

**解决方案**：
- 确认 RealEstateToken 已成功部署
- 检查地址格式是否正确（42 字符，以 `0x` 开头）
- 确认地址属于 Avalanche Fuji 测试网

### 错误：只有 seller 可以开始拍卖

**问题**：非部署账户尝试开始拍卖

**解决方案**：
- 确认使用部署账户（seller）开始拍卖
- 或者部署新的 EnglishAuction 合约，使用正确的 seller 地址

### 错误：出价不够高

**问题**：出价金额低于当前最高出价

**解决方案**：
- 确保出价金额高于当前最高出价
- 检查当前最高出价金额

### 错误：无法撤回最高出价

**问题**：最高出价者尝试撤回出价

**解决方案**：
- 只有非最高出价者可以撤回出价
- 最高出价者需要等待拍卖结束或被其他人超过

### 错误：拍卖时间未到

**问题**：尝试在拍卖时间结束前结束拍卖

**解决方案**：
- 等待拍卖时间结束（7天）
- 或者等待其他 bidder 出价超过当前最高出价

## Chainlink Automation 集成

EnglishAuction 合约已集成 Chainlink Automation，支持在拍卖到期时自动结束拍卖。

### 功能说明

- **checkUpkeep**: 检查拍卖是否已到期且需要结束
- **performUpkeep**: 自动调用 `endAuction` 结束拍卖

### 注册 Chainlink Automation Upkeep

1. **访问 Chainlink Automation 界面**
   - Avalanche Fuji 测试网：https://automation.chain.link/fuji
   - 主网：https://automation.chain.link/

2. **创建新的 Upkeep**
   - 点击 "Register new Upkeep"
   - 选择 "Custom Logic"
   - 输入 EnglishAuction 合约地址
   - 设置以下参数：
     - **Target contract**: EnglishAuction 合约地址
     - **Admin address**: 管理 Upkeep 的地址（建议使用部署账户）
     - **Check data**: `0x`（当前版本不需要）
     - **Gas limit**: 500,000（建议值）
     - **Starting balance (LINK)**: 至少 5 LINK（用于支付 Automation 费用）

3. **配置检查间隔**
   - 建议设置较短的检查间隔（如 1 小时）以确保及时执行
   - 可以在 Upkeep 详情页面调整

4. **监控 Upkeep 状态**
   - 在 Chainlink Automation 界面可以查看：
     - Upkeep 状态（Active/Inactive）
     - 最后检查时间
     - 执行历史
     - LINK 余额

### Automation 工作流程

1. **拍卖开始后**
   - Chainlink Automation 定期调用 `checkUpkeep`
   - 如果拍卖未到期，返回 `upkeepNeeded = false`

2. **拍卖到期时**
   - `checkUpkeep` 检测到 `block.timestamp >= s_endTimestamp`
   - 返回 `upkeepNeeded = true`
   - Chainlink Automation 调用 `performUpkeep`

3. **自动结束拍卖**
   - `performUpkeep` 调用内部 `_endAuction` 函数
   - 代币转移给最高出价者
   - ETH 发送给卖家
   - 触发 `AuctionEnded` 事件

### 注意事项

- **LINK 代币余额**：确保 Upkeep 账户有足够的 LINK 代币支付 Automation 费用
- **Gas 限制**：设置足够的 Gas 限制以确保 `performUpkeep` 能够成功执行
- **检查间隔**：较短的检查间隔可以更快响应，但会增加 LINK 消耗
- **手动结束**：即使注册了 Automation，仍然可以手动调用 `endAuction` 结束拍卖

## 参考链接

- [部署 RealEstateToken](./DEPLOY_FUJI.md)
- [部署 Issuer](./DEPLOY_ISSUER.md)
- [测试已部署合约](./TEST_DEPLOYED.md)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [Hardhat Ignition 文档](https://hardhat.org/ignition)
- [Chainlink Automation 文档](https://docs.chain.link/chainlink-automation)

## 下一步

部署完成后，您可以：

1. **运行基础测试**
   ```bash
   npx hardhat run scripts/test-english-auction.ts --network avalancheFuji
   ```

2. **准备测试数据**
   - 发行房地产代币给 seller
   - 授权 EnglishAuction 管理代币

3. **测试完整拍卖流程**
   - 开始拍卖
   - 多个 bidder 出价
   - 结束拍卖并验证结果

4. **集成到应用**
   - 在前端应用中集成 EnglishAuction 合约
   - 实现拍卖界面
   - 添加出价和撤回功能
