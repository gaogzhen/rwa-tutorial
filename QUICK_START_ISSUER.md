# Issuer 合约快速部署和测试指南

本文档提供在 Avalanche Fuji 测试网上部署和测试 Issuer 合约的快速指南。

## 🚀 快速部署

### 方式 1: 一键部署（推荐）

如果您还没有部署 RealEstateToken，可以使用组合部署模块：

```bash
# 1. 编译合约
npx hardhat compile

# 2. 一键部署所有合约
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network avalancheFuji
```

### 方式 2: 分步部署

如果 RealEstateToken 已部署：

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署 Issuer（替换为实际的 RealEstateToken 地址）
npx hardhat ignition deploy ignition/modules/Issuer.ts \
  --network avalancheFuji \
  --parameters '{"IssuerModule":{"realEstateTokenAddress":"0x你的RealEstateToken地址"}}'
```

## 🧪 快速测试

### 设置环境变量

```bash
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export ISSUER_ADDRESS=0x你的Issuer地址
```

### 运行测试

```bash
npx hardhat run scripts/test-issuer.ts --network avalancheFuji
```

## 📋 测试内容

测试脚本会验证：

✅ **基础验证**
- 合约地址有效性
- 基本信息（owner 等）
- 账户余额

✅ **集成验证**
- RealEstateToken 连接
- Issuer 设置状态（通过事件）
- Chainlink Functions 配置

✅ **功能验证**
- cancelPendingRequest 函数
- issue 函数接口
- 权限控制

✅ **历史记录**
- 查找历史发行事件

## 📝 部署检查清单

部署前请确认：

- [ ] 已设置 `AVALANCHE_FUJI_RPC_URL`
- [ ] 已设置 `AVALANCHE_FUJI_PRIVATE_KEY`
- [ ] 账户有足够的 AVAX
- [ ] RealEstateToken 已部署（如果使用分步部署）
- [ ] 合约已编译（`npx hardhat compile`）

## 🔗 相关文档

- [详细部署说明](./DEPLOY_ISSUER.md)
- [设置私钥指南](./SETUP_PRIVATE_KEY.md)
- [测试已部署合约](./TEST_DEPLOYED.md)

## 💡 下一步

部署和测试通过后：

1. **配置 Chainlink Functions 订阅**
   - 创建订阅并充值 LINK
   - 获取订阅 ID 和 DON ID

2. **发行第一个代币**
   - 使用 Issuer 合约的 `issue` 函数
   - 等待 Chainlink Functions 返回元数据

3. **验证代币**
   - 检查代币是否成功铸造
   - 验证代币元数据和余额
