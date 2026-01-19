# Issuer 合约超时重试功能说明

## 概述

Issuer 合约现在支持两种重试机制：

1. **错误重试**：当 Chainlink Functions 返回错误时自动重试（最多 3 次）
2. **超时重试**：当 `fulfillRequest` 长时间未被调用时自动重试（最多 3 次）

## 功能特性

### 超时检测

- **超时时间**：5 分钟（`REQUEST_TIMEOUT = 5 minutes`）
- **最大重试次数**：3 次（`MAX_RETRIES = 3`）
- **自动检测**：支持 Chainlink Automation 自动检测和重试
- **手动重试**：支持手动调用重试函数

### 新增函数

#### 1. `checkUpkeep(bytes calldata) → (bool upkeepNeeded, bytes memory performData)`

检查是否有超时的请求需要重试。可以由 Chainlink Automation 定期调用。

**返回值**：
- `upkeepNeeded`：是否需要执行重试
- `performData`：执行数据（包含原始请求 ID）

**使用场景**：Chainlink Automation 定期检查

#### 2. `performUpkeep(bytes calldata performData)`

执行超时重试。由 Chainlink Automation 调用。

**参数**：
- `performData`：包含原始请求 ID 的编码数据

**使用场景**：Chainlink Automation 自动执行

#### 3. `retryTimedOutRequest()`

手动重试超时的请求。

**使用场景**：手动触发重试

#### 4. `getRequestStatus() → (bool, bytes32, uint8, uint256, bool, uint256)`

获取当前请求的状态信息。

**返回值**：
- `hasPendingRequest`：是否有待处理的请求
- `requestId`：当前请求 ID
- `retryCount`：重试次数
- `requestTimestamp`：请求时间戳
- `isTimedOut`：是否已超时
- `timeRemaining`：剩余时间（秒）

### 新增事件

#### `RequestTimedOut(bytes32 indexed requestId, uint256 timestamp, uint8 retryCount)`

当请求超时时触发。

## 使用方式

### 方式 1：手动重试

如果请求超时，可以手动调用 `retryTimedOutRequest()`：

```typescript
const issuer = await viem.getContractAt("Issuer", ISSUER_ADDRESS);
await issuer.write.retryTimedOutRequest();
```

### 方式 2：Chainlink Automation 自动重试

设置 Chainlink Automation Upkeep 来定期检查并自动重试：

1. **注册 Upkeep**：
   - 目标合约：Issuer 合约地址
   - 检查函数：`checkUpkeep(bytes)`
   - 执行函数：`performUpkeep(bytes)`
   - 检查间隔：建议 1-2 分钟

2. **Upkeep 配置**：
   ```javascript
   // checkUpkeep 调用
   const [upkeepNeeded, performData] = await issuer.read.checkUpkeep(["0x"]);
   
   // 如果 upkeepNeeded 为 true，调用 performUpkeep
   if (upkeepNeeded) {
     await issuer.write.performUpkeep([performData]);
   }
   ```

### 方式 3：查询请求状态

随时查询当前请求的状态：

```typescript
const status = await issuer.read.getRequestStatus();
console.log(`是否有待处理请求: ${status[0]}`);
console.log(`请求 ID: ${status[1]}`);
console.log(`重试次数: ${status[2]}`);
console.log(`是否已超时: ${status[4]}`);
console.log(`剩余时间: ${status[5]} 秒`);
```

## 测试

运行测试脚本：

```bash
npx hardhat run scripts/test-timeout-retry.ts --network avalancheFuji
```

测试脚本会：
1. 检查当前请求状态
2. 检查是否可以执行超时重试
3. 尝试手动重试超时的请求
4. 模拟 Chainlink Automation 调用

## 工作流程

### 正常流程

1. 调用 `issue()` → 发送 Chainlink Functions 请求
2. Chainlink Functions 处理请求
3. `fulfillRequest()` 被调用 → 处理响应并铸造代币

### 超时流程

1. 调用 `issue()` → 发送 Chainlink Functions 请求
2. 等待 5 分钟
3. 如果 `fulfillRequest()` 未被调用：
   - 手动调用 `retryTimedOutRequest()`，或
   - Chainlink Automation 自动调用 `performUpkeep()`
4. 发送新的请求（重试）
5. 重复步骤 2-4，最多重试 3 次

### 错误流程

1. 调用 `issue()` → 发送 Chainlink Functions 请求
2. `fulfillRequest()` 被调用，但返回错误
3. 自动重试（最多 3 次）
4. 如果所有重试都失败，触发 `MaxRetriesExceeded` 错误

## 注意事项

1. **Gas 消耗**：每次重试都会消耗 Gas，确保订阅账户有足够的 LINK
2. **时间延迟**：超时重试会增加总处理时间（每次超时等待 5 分钟）
3. **状态管理**：`s_lastRequestId` 始终指向原始请求 ID，确保重试回调正确处理
4. **最大重试次数**：无论是错误重试还是超时重试，总共最多重试 3 次
5. **时间戳更新**：每次重试都会更新请求时间戳，重新开始 5 分钟倒计时

## 配置参数

可以在合约中修改以下常量：

- `MAX_RETRIES`：最大重试次数（当前为 3）
- `REQUEST_TIMEOUT`：请求超时时间（当前为 5 分钟）

修改后需要重新编译和部署合约。
