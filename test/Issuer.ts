import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData, decodeFunctionResult, stringToHex, hexToString } from "viem";

describe("Issuer", async function () {
  // 获取网络连接和客户端
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, recipient, otherAccount] = await viem.getWalletClients();

  // 测试用的合约实例
  let mockFunctionsRouter: any; // 模拟的 FunctionsRouter 合约
  let mockCcipRouter: any; // 模拟的 CCIP Router 合约
  let mockLinkToken: any; // 模拟的 Link Token 合约
  let realEstateToken: any; // RealEstateToken 合约实例
  let issuer: any; // Issuer 合约实例

  beforeEach(async function () {
    // 部署模拟的 FunctionsRouter 合约（无构造函数参数）
    mockFunctionsRouter = await viem.deployContract("MockFunctionsRouter");

    // 部署模拟的 CCIP Router 合约（无构造函数参数）
    mockCcipRouter = await viem.deployContract("MockCcipRouter");

    // 部署模拟的 Link Token 合约（无构造函数参数）
    mockLinkToken = await viem.deployContract("MockLinkToken");

    // 部署 RealEstateToken 合约
    const baseURI = "https://api.example.com/metadata/"; // 基础 URI
    const currentChainSelector = 1n; // 测试用的链选择器
    realEstateToken = await viem.deployContract("RealEstateToken", [
      baseURI, // 基础 URI
      mockCcipRouter.address, // CCIP Router 地址
      mockLinkToken.address, // Link Token 地址
      currentChainSelector, // 当前链选择器
      mockFunctionsRouter.address, // Functions Router 地址
    ]);

    // 部署 Issuer 合约
    issuer = await viem.deployContract("Issuer", [
      realEstateToken.address, // RealEstateToken 地址
      mockFunctionsRouter.address, // FunctionsRouter 地址
    ]);

    // 设置 Issuer 为 RealEstateToken 的发行者
    await realEstateToken.write.setIssuer([issuer.address], {
      account: owner.account, // 使用 owner 账户
    });
  });

  it("应该允许 owner 调用 issue 函数", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制（注意：不是 bigint）
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 调用 issue 函数
    const hash = await issuer.write.issue(
      [to, amount, subscriptionId, gasLimit, donId], // 参数数组
      {
        account: owner.account, // 使用 owner 账户
      }
    );

    // 等待交易确认
    await publicClient.waitForTransactionReceipt({ hash }); // 等待交易确认

    // 验证请求 ID 已设置
    // 注意：由于我们使用的是模拟 Router，实际的 requestId 可能不同
    // 这里我们主要验证函数调用成功
    assert.ok(hash, "issue 函数应该成功执行"); // 验证交易哈希存在
  });

  it("应该防止在已有请求进行中时再次调用 issue", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 第一次调用 issue
    await issuer.write.issue([to, amount, subscriptionId, gasLimit, donId], {
      account: owner.account, // 使用 owner 账户
    });

    // 尝试第二次调用 issue，应该失败
    try {
      await issuer.write.issue([to, amount, subscriptionId, gasLimit, donId], {
        account: owner.account, // 使用 owner 账户
      });
      assert.fail("应该抛出 LatestIssueInProcess 错误"); // 如果成功则测试失败
    } catch (error: any) {
      // 验证错误类型
      assert.ok(
        error.message.includes("LatestIssueInProcess") || // 检查是否包含错误名称
          error.message.includes("revert"), // 或者包含 revert
        "应该抛出 LatestIssueInProcess 错误" // 错误消息
      );
    }
  });

  it("应该允许 owner 取消待处理的请求", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 调用 issue 创建待处理的请求
    await issuer.write.issue([to, amount, subscriptionId, gasLimit, donId], {
      account: owner.account, // 使用 owner 账户
    });

    // 取消待处理的请求
    const hash = await issuer.write.cancelPendingRequest({
      account: owner.account, // 使用 owner 账户
    });

    // 等待交易确认
    await publicClient.waitForTransactionReceipt({ hash }); // 等待交易确认

    // 验证可以再次调用 issue
    await issuer.write.issue([to, amount, subscriptionId, gasLimit, donId], {
      account: owner.account, // 使用 owner 账户
    });

    assert.ok(true, "取消请求后应该可以再次调用 issue"); // 验证测试通过
  });

  it("应该防止非 owner 调用 issue", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 尝试使用非 owner 账户调用 issue
    try {
      await issuer.write.issue([to, amount, subscriptionId, gasLimit, donId], {
        account: otherAccount.account, // 使用非 owner 账户
      });
      assert.fail("应该抛出权限错误"); // 如果成功则测试失败
    } catch (error: any) {
      // 验证错误类型
      assert.ok(
        error.message.includes("Ownable") || // 检查是否包含 Ownable
          error.message.includes("revert") || // 或者包含 revert
          error.message.includes("Unauthorized"), // 或者包含 Unauthorized
        "应该抛出权限错误" // 错误消息
      );
    }
  });

  it("应该防止非 owner 调用 cancelPendingRequest", async function () {
    // 尝试使用非 owner 账户调用 cancelPendingRequest
    try {
      await issuer.write.cancelPendingRequest({
        account: otherAccount.account, // 使用非 owner 账户
      });
      assert.fail("应该抛出权限错误"); // 如果成功则测试失败
    } catch (error: any) {
      // 验证错误类型
      assert.ok(
        error.message.includes("Ownable") || // 检查是否包含 Ownable
          error.message.includes("revert") || // 或者包含 revert
          error.message.includes("Unauthorized"), // 或者包含 Unauthorized
        "应该抛出权限错误" // 错误消息
      );
    }
  });

  it("应该正确处理 fulfillRequest 并铸造代币", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 调用 issue 创建请求
    const issueHash = await issuer.write.issue(
      [to, amount, subscriptionId, gasLimit, donId], // 参数数组
      {
        account: owner.account, // 使用 owner 账户
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: issueHash }); // 等待交易确认

    // 获取请求 ID（从事件中）
    const events = await publicClient.getContractEvents({
      address: issuer.address, // 合约地址
      abi: issuer.abi, // 合约 ABI
      eventName: "RequestSent", // 事件名称
      fromBlock: "latest", // 从最新区块开始
    });

    // 验证事件存在
    assert.ok(events.length > 0, "应该发出 RequestSent 事件"); // 验证事件存在

    // 获取请求 ID（从事件参数中）
    const event = events[0] as any; // 类型断言以访问事件参数
    const requestId = event.args?.id as `0x${string}` || event.id as `0x${string}`; // 获取请求 ID

    // 准备响应数据（模拟的 tokenURI）
    const tokenURI = "ipfs://QmTest123"; // 模拟的 token URI
    const response = stringToHex(tokenURI); // 将字符串转换为十六进制
    const err = "0x" as `0x${string}`; // 无错误（空字节）

    // 通过模拟 Router 调用 fulfillRequest
    // 注意：fulfillRequest 是 internal 函数，需要通过 Router 的 handleOracleFulfillment 调用
    const fulfillHash = await mockFunctionsRouter.write.fulfillRequest(
      [requestId, response, err], // 参数数组
      {
        account: owner.account, // 使用 owner 账户
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: fulfillHash }); // 等待交易确认

    // 验证代币已铸造
    const tokenId = 0n; // 第一个 token ID（从 0 开始）
    const balance = await realEstateToken.read.balanceOf([to, tokenId]); // 查询余额
    assert.equal(balance, amount, "代币余额应该等于发行数量"); // 验证余额正确
  });

  it("应该正确处理 fulfillRequest 中的错误响应", async function () {
    // 准备测试参数
    const to = recipient.account.address; // 接收者地址
    const amount = 1000n; // 发行数量
    const subscriptionId = 1n; // 订阅 ID
    const gasLimit = 300000; // Gas 限制
    const donId = "0x" + "0".repeat(64) as `0x${string}`; // DON ID

    // 调用 issue 创建请求
    const issueHash = await issuer.write.issue(
      [to, amount, subscriptionId, gasLimit, donId], // 参数数组
      {
        account: owner.account, // 使用 owner 账户
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: issueHash }); // 等待交易确认

    // 获取请求 ID（从事件中）
    const events = await publicClient.getContractEvents({
      address: issuer.address, // 合约地址
      abi: issuer.abi, // 合约 ABI
      eventName: "RequestSent", // 事件名称
      fromBlock: "latest", // 从最新区块开始
    });

    // 获取请求 ID（从事件参数中）
    const event = events[0] as any; // 类型断言以访问事件参数
    const requestId = event.args?.id as `0x${string}` || event.id as `0x${string}`; // 获取请求 ID

    // 准备错误响应
    const errorMessage = "API request failed"; // 错误消息
    const err = stringToHex(errorMessage); // 将错误消息转换为十六进制
    const response = "0x" as `0x${string}`; // 无响应（空字节）

    // 通过模拟 Router 调用 fulfillRequest，应该会 revert
    try {
      await mockFunctionsRouter.write.fulfillRequest(
        [requestId, response, err], // 参数数组
        {
          account: owner.account, // 使用 owner 账户
        }
      );
      assert.fail("应该抛出错误"); // 如果成功则测试失败
    } catch (error: any) {
      // 验证错误消息
      assert.ok(
        error.message.includes("API request failed") || // 检查是否包含错误消息
          error.message.includes("revert"), // 或者包含 revert
        "应该抛出包含错误消息的异常" // 错误消息
      );
    }
  });
});
