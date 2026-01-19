# 测试配置文件说明

## test-issuer.config.json

此配置文件用于配置 `test-issuer.ts` 脚本中的 `issue` 函数测试参数。

### 配置文件位置

```
config/test-issuer.config.json
```

### 配置结构

```json
{
  "issue": {
    "enabled": false,
    "subscriptionId": "",
    "amount": "100",
    "gasLimit": 300000,
    "donId": "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
    "recipientAddress": "",
    "waitTime": 10000
  }
}
```

### 配置参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `enabled` | boolean | 是 | `false` | 是否启用 issue 测试。设置为 `true` 才会实际调用 issue 函数 |
| `subscriptionId` | string | 是* | `""` | Chainlink Functions 订阅 ID。如果为空，测试会跳过实际调用 |
| `amount` | string | 否 | `"100"` | 铸造的代币数量（字符串格式，例如 "1000"） |
| `gasLimit` | number | 否 | `300000` | Gas 限制 |
| `donId` | string | 否 | 默认值 | DON ID。Avalanche Fuji 测试网的默认值已设置 |
| `recipientAddress` | string | 否 | `""` | 接收代币的地址。如果为空，使用测试脚本中的 recipient 账户 |
| `waitTime` | number | 否 | `10000` | 等待 Chainlink Functions 响应的时间（毫秒） |

*当 `enabled` 为 `true` 时，`subscriptionId` 为必填。

### 使用示例

#### 示例 1: 启用测试并配置参数

```json
{
  "issue": {
    "enabled": true,
    "subscriptionId": "123456",
    "amount": "1000",
    "gasLimit": 300000,
    "donId": "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
    "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "waitTime": 15000
  }
}
```

#### 示例 2: 禁用测试（默认）

```json
{
  "issue": {
    "enabled": false,
    "subscriptionId": "",
    "amount": "100",
    "gasLimit": 300000,
    "donId": "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
    "recipientAddress": "",
    "waitTime": 10000
  }
}
```

### 优先级

配置参数的优先级（从高到低）：

1. **配置文件** (`config/test-issuer.config.json`)
2. **环境变量** (例如 `SUBSCRIPTION_ID`, `AMOUNT` 等)
3. **默认值** (代码中定义的默认值)

### 环境变量替代

如果不想使用配置文件，也可以使用环境变量：

```bash
export ENABLE_ISSUE_TEST=true
export SUBSCRIPTION_ID=123456
export AMOUNT=1000
export GAS_LIMIT=300000
export DON_ID=0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000
export RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
export WAIT_TIME=15000
```

### 运行测试

配置完成后，运行测试：

```bash
# 设置基本环境变量（合约地址）
export REAL_ESTATE_TOKEN_ADDRESS=0x你的RealEstateToken地址
export ISSUER_ADDRESS=0x你的Issuer地址

# 运行测试
npx hardhat run scripts/test-issuer.ts --network avalancheFuji
```

### 注意事项

1. **配置文件路径**：配置文件必须位于 `config/test-issuer.config.json`
2. **JSON 格式**：确保 JSON 格式正确，否则会读取失败
3. **订阅 ID**：需要有效的 Chainlink Functions 订阅 ID
4. **LINK 余额**：订阅账户需要有足够的 LINK 代币
5. **异步处理**：代币铸造是异步的，可能需要等待 Chainlink Functions 响应

### 故障排除

#### 配置文件未找到

如果看到 "配置文件不存在" 的警告，可以：
1. 创建 `config` 目录（如果不存在）
2. 创建 `test-issuer.config.json` 文件
3. 复制默认配置内容

#### JSON 解析错误

确保 JSON 格式正确：
- 使用双引号
- 注意逗号位置
- 确保没有尾随逗号

#### 测试未执行

检查：
1. `enabled` 是否为 `true`
2. `subscriptionId` 是否已设置
3. 环境变量 `ENABLE_ISSUE_TEST` 是否设置为 `true`（会覆盖配置文件）
