# 测试部署在 Avalanche Fuji 测试网上的合约

本文档说明如何测试已部署在 Avalanche Fuji 测试网上的 Issuer 和 RealEstateToken 合约。

## 前置要求

1. **合约已部署**
   - RealEstateToken 和 Issuer 合约已部署到 Avalanche Fuji 测试网
   - 记录部署后的合约地址

2. **配置变量已设置**
   - `AVALANCHE_FUJI_RPC_URL`: Avalanche Fuji 测试网 RPC URL
   - `AVALANCHE_FUJI_PRIVATE_KEY`: 测试账户的私钥（需要是合约 owner）
   - 详细设置方法请参考 [SETUP_PRIVATE_KEY.md](./SETUP_PRIVATE_KEY.md)

3. **账户有足够的 AVAX**
   - 确保测试账户有足够的 AVAX 支付 gas 费用

## 快速开始

### 方式 1: 使用环境变量（推荐）

```bash
# 设置合约地址
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export ISSUER_ADDRESS=0x你的Issuer地址

# 运行测试
npx hardhat run scripts/test-deployed-contracts.ts --network avalancheFuji
```

### 方式 2: 在脚本中直接设置

编辑 `scripts/test-deployed-contracts.ts` 文件，在脚本开头直接设置地址：

```typescript
const realEstateTokenAddress = "0x你的RealEstateToken地址" as `0x${string}`;
const issuerAddress = "0x你的Issuer地址` as `0x${string}`;
```

然后运行：

```bash
npx hardhat run scripts/test-deployed-contracts.ts --network avalancheFuji
```

## 测试内容

测试脚本会执行以下测试：

### 1. 验证合约地址
- 检查合约地址格式是否正确
- 验证合约是否已部署（检查合约代码）

### 2. 验证 RealEstateToken 基本信息
- 获取合约 owner
- 检查 URI 配置

### 3. 验证 Issuer 基本信息
- 获取合约 owner
- 验证合约配置

### 4. 验证 Issuer 是否已设置
- 通过检查 `IssuerSet` 事件验证 Issuer 是否已正确设置
- 比较事件中的地址与提供的 Issuer 地址

### 5. 验证账户余额
- 检查测试账户的 AVAX 余额
- 确保有足够的余额进行测试

### 6. 验证合约权限
- 检查测试账户是否是合约 owner
- 验证权限配置

### 7. 验证 Chainlink 集成
- 检查 Chainlink Functions Router 配置
- 验证 Chainlink 服务可用性

### 8. 测试合约只读操作
- 测试读取代币总供应量
- 测试读取账户余额
- 验证合约基本功能

## 测试输出示例

```
🚀 开始测试部署在 Avalanche Fuji 测试网上的合约...

📋 测试配置：
   RealEstateToken: 0x...
   Issuer: 0x...
   测试账户: 0x...
   网络: avalancheFuji

🧪 测试: 验证合约地址
   ✅ 通过

🧪 测试: 验证 RealEstateToken 基本信息
   Owner: 0x...
   URI: https://...
   ✅ 通过

🧪 测试: 验证 Issuer 基本信息
   Owner: 0x...
   ✅ 通过

🧪 测试: 验证 Issuer 是否已设置为 RealEstateToken 的发行者
   ✅ Issuer 已正确设置: 0x...
   ✅ 通过

...

============================================================
📊 测试总结
============================================================
✅ 通过: 8
❌ 失败: 0
📈 总计: 8
============================================================

🎉 所有测试通过！
```

## 故障排除

### 错误：合约地址无效

**问题**：提供的合约地址不存在或格式错误

**解决方案**：
- 确认合约已成功部署
- 检查地址格式是否正确（42 字符，以 `0x` 开头）
- 确认地址属于 Avalanche Fuji 测试网

### 错误：Issuer 未设置

**问题**：测试显示 Issuer 未正确设置

**解决方案**：
```bash
# 使用 Hardhat console 设置 Issuer
npx hardhat console --network avalancheFuji

# 在 console 中执行
const realEstateToken = await ethers.getContractAt("RealEstateToken", "0x你的RealEstateToken地址");
const issuerAddress = "0x你的Issuer地址";
await realEstateToken.setIssuer(issuerAddress);
```

### 错误：权限不足

**问题**：测试账户不是合约 owner

**解决方案**：
- 确认测试账户是合约的 owner
- 如果使用不同的账户部署，需要使用部署账户进行测试
- 或者将合约 ownership 转移给测试账户

### 错误：余额不足

**问题**：账户 AVAX 余额不足

**解决方案**：
- 从 [Avalanche Faucet](https://faucet.avalanche.org/) 获取测试网 AVAX
- 检查账户余额是否足够支付 gas 费用

## 高级测试

### 测试代币发行

如果 Issuer 已正确配置，可以测试代币发行功能：

```typescript
// 使用 Hardhat console
npx hardhat console --network avalancheFuji

const issuer = await ethers.getContractAt("Issuer", "0x你的Issuer地址");

// 发行代币（需要 Chainlink Functions 订阅 ID）
await issuer.issue(
  "0x接收者地址",
  1000,              // 发行数量
  1,                 // Chainlink Functions 订阅 ID
  300000,            // Gas 限制
  "0x" + "0".repeat(64) // DON ID
);
```

### 测试跨链功能

测试 RealEstateToken 的跨链功能：

```typescript
// 确保已配置目标链
const realEstateToken = await ethers.getContractAt("RealEstateToken", "0x...");

// 启用目标链
await realEstateToken.enableChain(
  目标链选择器,
  目标链上的合约地址,
  "0x" // CCIP 额外参数
);

// 执行跨链转移
await realEstateToken.crossChainTransferFrom(
  "0x发送者地址",
  "0x接收者地址",
  tokenId,
  amount,
  "0x",
  目标链选择器,
  0 // PayFeesIn.NATIVE
);
```

## 参考链接

- [部署 RealEstateToken](./DEPLOY_FUJI.md)
- [部署 Issuer](./DEPLOY_ISSUER.md)
- [设置私钥指南](./SETUP_PRIVATE_KEY.md)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [Hardhat 文档](https://hardhat.org/docs)

## 下一步

测试通过后，您可以：

1. **配置 Chainlink Functions 订阅**
   - 创建订阅并充值 LINK
   - 获取订阅 ID 和 DON ID

2. **发行第一个代币**
   - 使用 Issuer 合约发行代币
   - 验证代币元数据和余额

3. **集成到应用**
   - 在前端应用中集成合约
   - 实现用户界面和交互功能
