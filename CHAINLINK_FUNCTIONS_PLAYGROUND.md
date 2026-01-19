# Chainlink Functions Playground 使用指南

## 概述

[Chainlink Functions Playground](https://functions.chain.link/playground) 是一个在线工具，可以在浏览器中模拟 Chainlink Functions 的执行环境，用于测试和调试 JavaScript 代码。

## 为什么使用 Playground？

1. **快速测试**：无需部署合约即可测试 JavaScript 代码
2. **调试方便**：可以查看详细的执行日志和错误信息
3. **代码验证**：确保代码符合 Chainlink Functions 的执行环境
4. **示例参考**：查看社区提供的代码示例

## 如何使用 Playground 测试代码

### 步骤 1: 访问 Playground

打开 [https://functions.chain.link/playground](https://functions.chain.link/playground)

### 步骤 2: 选择网络

在页面顶部选择目标网络（例如：**Avalanche Fuji**）

### 步骤 3: 输入 JavaScript 代码

将 `FunctionsSourceRetry.sol` 中的 JavaScript 代码复制到 Playground 的输入框。

**示例代码（getNftMetadata）：**

```javascript
const { ethers } = await import('npm:ethers@6.10.0');
const Hash = await import('npm:ipfs-only-hash@4.0.0');
const MAX_RETRIES = 3;
const API_URL = 'https://api.bridgedataoutput.com/api/v2/OData/test/Property(\'P_69179ef9b7bb783d6039ab66\')?access_token=6baca547742c6f96a6ff71b138424f21';
let lastError = null;
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt} of ${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
    const apiResponse = await Functions.makeHttpRequest({
      url: API_URL,
      timeout: 5000,
      method: 'GET',
    });
    if (apiResponse.error) {
      throw new Error(`API error: ${apiResponse.error}`);
    }
    if (!apiResponse || !apiResponse.data) {
      throw new Error('API response is invalid or empty');
    }
    const data = apiResponse.data;
    const realEstateAddress = data.UnparsedAddress || '';
    const yearBuilt = Number(data.YearBuilt) || 0;
    const lotSizeSquareFeet = Number(data.LotSizeSquareFeet) || 0;
    const livingArea = Number(data.LivingArea) || 0;
    const bedroomsTotal = Number(data.BedroomsTotal) || 0;
    const metadata = {
      name: 'Real Estate Token',
      attributes: [
        { trait_type: 'realEstateAddress', value: realEstateAddress },
        { trait_type: 'yearBuilt', value: yearBuilt },
        { trait_type: 'lotSizeSquareFeet', value: lotSizeSquareFeet },
        { trait_type: 'livingArea', value: livingArea },
        { trait_type: 'bedroomsTotal', value: bedroomsTotal }
      ]
    };
    const metadataString = JSON.stringify(metadata);
    const ipfsCid = await Hash.of(metadataString);
    return Functions.encodeString(`ipfs://${ipfsCid}`);
  } catch (error) {
    lastError = error;
    console.error(`Attempt ${attempt + 1} failed:`, error.message);
    if (attempt === MAX_RETRIES) {
      throw new Error(`API request failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`);
    }
  }
}
```

### 步骤 4: 配置参数（可选）

- **Arguments**：如果代码使用 `args`，可以在这里添加参数
- **Secrets**：如果需要使用 Secrets（如 API 密钥），可以在这里配置

### 步骤 5: 运行代码

点击 **"Run code"** 按钮执行代码

### 步骤 6: 查看结果

- **Output**：查看返回的编码数据
- **Console log**：查看执行日志和错误信息

## 代码优化建议

根据 Playground 的最佳实践，我们已对代码进行了以下优化：

### 1. 改进错误处理

```javascript
// ✅ 检查 apiResponse.error
if (apiResponse.error) {
  throw new Error(`API error: ${apiResponse.error}`);
}

// ✅ 更详细的错误信息
if (!apiResponse || !apiResponse.data) {
  throw new Error('API response is invalid or empty');
}
```

### 2. 使用常量

```javascript
// ✅ 将 URL 提取为常量，便于维护
const API_URL = 'https://api.bridgedataoutput.com/api/v2/OData/...';
```

### 3. 明确 HTTP 方法

```javascript
// ✅ 明确指定 HTTP 方法
const apiResponse = await Functions.makeHttpRequest({
  url: API_URL,
  timeout: 5000,
  method: 'GET',  // 明确指定方法
});
```

### 4. 改进日志记录

```javascript
// ✅ 使用 console.log 和 console.error 记录详细信息
console.log(`Retry attempt ${attempt} of ${MAX_RETRIES}`);
console.error(`Attempt ${attempt + 1} failed:`, error.message);
```

### 5. 更好的错误消息

```javascript
// ✅ 包含更多上下文信息的错误消息
throw new Error(`API request failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`);
```

## 测试重试功能

在 Playground 中测试重试功能：

1. **模拟 API 失败**：可以临时修改 API URL 使其失败
2. **观察重试日志**：查看 Console log 中的重试尝试记录
3. **验证延迟**：确认每次重试之间有适当的延迟

## 常见问题

### Q: Playground 和实际执行环境有什么区别？

A: Playground 是模拟环境，主要用于测试代码逻辑。实际执行环境可能有：
- 不同的内存限制
- 不同的执行时间限制
- 不同的网络环境

### Q: 如何在 Playground 中测试带参数的代码？

A: 使用 **Arguments** 功能添加参数。例如，对于 `getPrices` 函数：
- 添加 Argument: `tokenId` = `"123"`

### Q: 如何测试 Secrets？

A: 使用 **Secrets** 功能添加敏感信息（如 API 密钥）。注意：Secrets 不会在代码中硬编码，而是通过 Chainlink Functions 的安全机制传递。

## 参考资源

- [Chainlink Functions Playground](https://functions.chain.link/playground)
- [Chainlink Functions 文档](https://docs.chain.link/chainlink-functions)
- [社区代码示例](https://usechainlinkfunctions.com)

## 代码示例

### 基础 API 请求

```javascript
const apiResponse = await Functions.makeHttpRequest({
  url: 'https://api.example.com/data',
  timeout: 5000,
  method: 'GET',
});

if (apiResponse.error) {
  throw new Error(`API error: ${apiResponse.error}`);
}

const data = apiResponse.data;
return Functions.encodeString(JSON.stringify(data));
```

### 带重试的 API 请求

```javascript
const MAX_RETRIES = 3;
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
    const apiResponse = await Functions.makeHttpRequest({
      url: 'https://api.example.com/data',
      timeout: 5000,
      method: 'GET',
    });
    if (apiResponse.error) {
      throw new Error(`API error: ${apiResponse.error}`);
    }
    return Functions.encodeString(JSON.stringify(apiResponse.data));
  } catch (error) {
    if (attempt === MAX_RETRIES) {
      throw error;
    }
  }
}
```

## 注意事项

1. **代码大小**：确保代码不会超过 Chainlink Functions 的大小限制
2. **执行时间**：避免长时间运行的循环或操作
3. **内存使用**：注意内存消耗，避免加载过大的数据
4. **错误处理**：始终包含适当的错误处理逻辑
5. **返回值**：确保返回正确编码的数据（使用 `Functions.encodeString()` 或 `Functions.encodeBytes()`）
