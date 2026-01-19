# 部署 RealEstateToken 到 Avalanche Fuji 测试网

## 前置要求

1. **安装依赖**
   ```bash
   npm install
   ```

2. **获取测试网 AVAX**
   - 从 [Avalanche Faucet](https://faucet.avalanche.org/) 获取测试网 AVAX

3. **配置环境变量**
   使用 Hardhat Keystore 或环境变量设置以下配置：

## 配置步骤

### 1. 设置 RPC URL（可选，有默认值）
```bash
npx hardhat keystore set AVALANCHE_FUJI_RPC_URL
```
或使用环境变量：
```bash
export AVALANCHE_FUJI_RPC_URL="https://api.avax-test.network/ext/bc/C/rpc"
```

### 2. 设置部署账户私钥

**推荐方式：使用 Hardhat Keystore**
```bash
npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
```

**或使用环境变量：**
```bash
export AVALANCHE_FUJI_PRIVATE_KEY="your_private_key_here"
```

📖 **详细说明请参考**：[SETUP_PRIVATE_KEY.md](./SETUP_PRIVATE_KEY.md) - 包含完整的私钥设置指南、安全提示和常见问题解答

## Chainlink 地址配置

部署 RealEstateToken 需要以下 Chainlink 合约地址：

### Avalanche Fuji 测试网地址

1. **Link Token**: `0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846`
   - 这是 Avalanche Fuji 测试网的标准 Link Token 地址

2. **CCIP Router**: 需要从 [Chainlink CCIP 文档](https://docs.chain.link/ccip/supported-networks) 获取最新地址
   - 测试网地址可能会更新，请查看官方文档

3. **Functions Router**: 需要从 [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions/supported-networks) 获取最新地址
   - 测试网地址可能会更新，请查看官方文档

4. **Chain Selector**: `14767482510784806043`
   - 这是 Avalanche Fuji 的链选择器

## 部署方式

### 方式 1: 一键部署所有合约（推荐）

如果您想同时部署 RealEstateToken 和 Issuer，可以使用组合部署模块：

```bash
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network avalancheFuji
```

这会自动：
1. 部署 RealEstateToken
2. 部署 Issuer
3. 设置 RealEstateToken 的 Issuer

详细说明请参考 [DEPLOY_ISSUER.md](./DEPLOY_ISSUER.md)

### 方式 2: 仅部署 RealEstateToken

如果您只想部署 RealEstateToken，稍后再部署 Issuer：

```bash
npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
```

### 方式 3: 使用自定义参数部署

在部署时可以通过参数覆盖默认值：

```bash
npx hardhat ignition deploy ignition/modules/RealEstateToken.ts \
  --network avalancheFuji \
  --parameters '{"RealEstateTokenModule":{"ccipRouterAddress":"0x..."}}'
```

或在模块文件中直接修改参数。

## 验证部署

部署成功后，您将看到：
- 合约地址
- 交易哈希
- Gas 使用量

## 后续步骤

1. **验证合约**（可选）
   - 在 Avalanche Snowtrace (Fuji) 上验证合约源代码

2. **设置 Issuer**
   - 部署 Issuer 合约并设置其为 RealEstateToken 的发行者

3. **配置跨链**
   - 使用 `enableChain` 函数配置其他链的跨链功能

## 故障排除

### 错误：合约代码太大
- 确保已启用优化器（已在 hardhat.config.ts 中配置）

### 错误：余额不足
- 确保账户有足够的 AVAX 支付 gas 费用

### 错误：地址无效
- 验证所有 Chainlink 地址是否正确
- 检查地址是否适用于 Avalanche Fuji 测试网

## 参考链接

- [Chainlink CCIP 文档](https://docs.chain.link/ccip)
- [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [Hardhat Ignition 文档](https://hardhat.org/ignition)
