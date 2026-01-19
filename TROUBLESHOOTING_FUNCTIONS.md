# Chainlink Functions 故障排除指南

## 常见错误

### 1. Computation Error: "Exec Error: syntax error, RAM exceeded, or other error"

**原因**：
- JavaScript 代码语法错误
- 内存使用超限
- API 请求失败或超时（**在中国大陆可能需要代理**）
- 导入的包有问题
- API 响应格式不符合预期

**解决方案**：

#### 方案 1: API 请求失败 - 中国大陆访问问题

**重要**：Chainlink Functions 的节点服务器在海外，如果 API 服务器也在海外，**不需要代理**。但如果 API 服务器在中国大陆无法直接访问，可能需要：

1. **使用可访问的 API**：
   - 优先使用全球可访问的 API
   - 避免使用仅限中国大陆的 API

2. **API 超时处理**：
   - 代码已添加 `timeout: 5000` 设置
   - 如果 API 响应慢，可以增加超时时间（但会增加执行时间）

3. **错误处理**：
   - 代码已添加 try-catch 错误处理
   - 会抛出明确的错误信息

#### 方案 2: 检查 JavaScript 代码

检查 `FunctionsSource.sol` 中的 JavaScript 代码：
- ✅ 已添加错误处理（try-catch）
- ✅ 已添加 API 响应验证
- ✅ 已添加默认值处理（避免 undefined）
- 确保所有字符串正确闭合
- 检查 API URL 和访问令牌是否有效
- 验证数据访问路径（`apiResponse.data.xxx`）

#### 方案 3: 简化代码以减少内存使用

如果内存超限，可以：
- 减少导入的包（当前使用 ethers 和 ipfs-only-hash）
- 简化数据处理逻辑
- 移除不必要的变量
- 使用更轻量的库

#### 方案 4: 优化 Gas Limit（注意限制）

**重要**：Chainlink Functions 有最大 Gas Limit 限制（通常 250,000），不要设置过高。

```json
{
  "issue": {
    "gasLimit": 250000  // 不要超过 250,000
  }
}
```

### 2. GasLimitTooBig 错误 (错误签名: 0x1d70f87a)

**原因**：
- Gas Limit 超过了 Chainlink Functions 允许的最大值
- 不同网络可能有不同的 Gas Limit 限制

**解决方案**：

#### 方案 1: 降低 Gas Limit

Chainlink Functions 通常限制 Gas Limit 在 250,000 或更低：

```json
{
  "issue": {
    "gasLimit": 250000  // 降低到 250,000 或更低
  }
}
```

**注意**：如果 250,000 仍然太大，可以尝试：
- 200,000
- 150,000
- 100,000

#### 方案 2: 检查网络特定的限制

不同网络可能有不同的限制：
- Avalanche Fuji: 通常 250,000 或更低
- 其他网络: 请查看 Chainlink Functions 文档

### 3. Callback Error: "The on-chain consumer callback failed"

**原因**：
- Gas 不足（但 Gas Limit 不能超过最大值 250,000）
- 回调函数执行失败
- 合约状态问题
- 回调函数中的操作消耗过多 Gas

**解决方案**：

#### 方案 1: 优化回调函数

减少回调函数中的操作，降低 Gas 消耗：
- 减少存储操作
- 简化数据处理
- 避免循环操作

#### 方案 2: 检查合约状态

确保：
- Issuer 合约已正确部署
- RealEstateToken 合约已正确部署
- Issuer 已设置为 RealEstateToken 的发行者
- 合约有足够的权限执行操作

#### 方案 3: 检查 Gas Limit 设置

**重要**：Callback 的 Gas 消耗受限于你设置的 `gasLimit`，但 Chainlink Functions 有最大限制（通常 250,000）。

```json
{
  "issue": {
    "gasLimit": 250000  // 最大限制，不要超过
  }
}
```

如果回调函数需要更多 Gas，需要优化合约代码。

### 3. 请求卡住（LatestIssueInProcess 错误）

**原因**：
- 之前的请求还在处理中
- 请求失败但状态未重置

**解决方案**：

```bash
# 取消待处理的请求
npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji
```

## 诊断步骤

### 步骤 1: 检查请求状态

访问 Chainlink Functions 界面查看请求详情：
- 查看 Request ID
- 检查错误信息
- 查看 Gas 使用情况

### 步骤 2: 检查合约状态

```bash
# 检查 Issuer 状态
npx hardhat run scripts/check-issuer-status.ts --network avalancheFuji
```

### 步骤 3: 检查配置

```bash
# 查看配置文件
cat config/test-issuer.config.json
```

确保：
- `subscriptionId` 正确
- `gasLimit` 足够（建议 500000+）
- `donId` 正确

### 步骤 4: 取消并重试

```bash
# 1. 取消待处理的请求
npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji

# 2. 增加 gasLimit 后重新尝试
# 编辑 config/test-issuer.config.json，将 gasLimit 改为 500000

# 3. 重新调用 issue
npx hardhat run scripts/test-issuer.ts --network avalancheFuji
```

## 推荐的 Gas Limit 设置

**重要**：Chainlink Functions 有最大 Gas Limit 限制，通常为 250,000 或更低。

根据操作复杂度（在限制范围内）：

| 操作 | 推荐 Gas Limit | 注意 |
|------|---------------|------|
| 简单 API 请求 | 100,000 - 150,000 | 安全范围 |
| 中等复杂度 | 150,000 - 200,000 | 需要更多操作 |
| 复杂操作 | 200,000 - 250,000 | 接近最大值 |
| 超过限制 | ❌ 不允许 | 会触发 GasLimitTooBig 错误 |

**警告**：不要设置超过 250,000，否则会收到 `GasLimitTooBig` 错误（错误签名: `0x1d70f87a`）。

## 测试 JavaScript 代码

在部署前，可以在本地测试 JavaScript 逻辑：

```javascript
// 测试代码逻辑
const apiResponse = {
  data: {
    UnparsedAddress: "123 Main St",
    YearBuilt: 2020,
    LotSizeSquareFeet: 5000,
    LivingArea: 2000,
    BedroomsTotal: 3
  }
};

// 测试数据处理
const metadata = {
  name: "Real Estate Token",
  attributes: [
    { trait_type: "realEstateAddress", value: apiResponse.data.UnparsedAddress },
    { trait_type: "yearBuilt", value: apiResponse.data.YearBuilt },
    // ...
  ]
};

console.log(JSON.stringify(metadata));
```

## 常见问题

### Q: 如何查看详细的错误信息？

A: 在 Chainlink Functions 界面查看请求详情，会显示具体的错误信息。

### Q: Gas Limit 设置多少合适？

A: 建议从 500,000 开始，如果还是失败，逐步增加到 800,000 或更高。

### Q: 如何知道请求是否成功？

A: 
1. 检查 Chainlink Functions 界面
2. 运行 `check-token-balance.ts` 查看代币是否已铸造
3. 检查 `RequestSent` 和 `RequestFulfilled` 事件

### Q: API 请求失败怎么办？

A: 
- **检查 API URL 是否可访问**：
  - 在中国大陆，某些海外 API 可能无法直接访问
  - Chainlink Functions 节点在海外，可以访问海外 API
  - **不需要为 Chainlink Functions 配置代理**（节点本身在海外）
  
- **验证访问令牌是否有效**：
  - 检查 access_token 是否过期
  - 确认 API 密钥权限是否正确
  
- **检查 API 响应格式**：
  - 代码已添加响应验证（`if (!apiResponse || !apiResponse.data)`)
  - 添加了默认值处理，避免 undefined 错误
  
- **错误处理**：
  - 代码已添加 try-catch 错误处理
  - 会抛出明确的错误信息，便于调试

### Q: 在中国大陆使用 Chainlink Functions 调用 API 是否需要代理？

A: **不需要**。原因：
1. Chainlink Functions 的节点服务器部署在海外
2. 节点服务器可以直接访问海外 API
3. 你只需要确保：
   - API 服务器可以被海外服务器访问
   - API 访问令牌有效
   - API 响应格式正确

**注意**：如果你使用的 API 服务器仅限中国大陆访问，那么 Chainlink Functions 节点可能无法访问，建议使用全球可访问的 API。

## 参考

- [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions)
- [Chainlink Functions 错误处理](https://docs.chain.link/chainlink-functions/troubleshooting)
