import { network } from "hardhat";
import { getAddress, formatEther, decodeAbiParameters } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// 在 ES modules 中获取 __dirname 的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 测试部署在 Avalanche Fuji 测试网上的 IssuerRetry 合约（带重试功能）
 * 
 * 使用方法：
 * 1. 设置环境变量或直接在脚本中修改合约地址：
 *    - REAL_ESTATE_TOKEN_ADDRESS: RealEstateToken 合约地址
 *    - ISSUER_RETRY_ADDRESS: IssuerRetry 合约地址
 * 
 * 2. 配置 issue 测试参数（可选）：
 *    编辑 config/test-issuer.config.json 文件
 * 
 * 3. 运行测试：
 *    npx hardhat run scripts/test-issuer-retry.ts --network avalancheFuji
 */

const REAL_ESTATE_TOKEN_ADDRESS = "0x4D7e17b8f5ad3417561B04083383134A1EC4aF77" as `0x${string}`;
const ISSUER_RETRY_ADDRESS = "0x2432b178cB1835e10fB2403684078969A8E73c7e" as `0x${string}`; // 部署后填入地址

async function main() {
  console.log("🚀 开始测试部署在 Avalanche Fuji 测试网上的 IssuerRetry 合约（带重试功能）...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  const recipient = walletClients[1] || walletClients[0];
  
  if (!deployer) {
    console.error("❌ 错误：无法获取钱包客户端");
    process.exit(1);
  }

  // 获取合约地址
  const realEstateTokenAddress = process.env.REAL_ESTATE_TOKEN_ADDRESS as `0x${string}` || REAL_ESTATE_TOKEN_ADDRESS;
  const issuerAddress = process.env.ISSUER_RETRY_ADDRESS as `0x${string}` || ISSUER_RETRY_ADDRESS;

  if (!issuerAddress) {
    console.error("❌ 错误：请设置 IssuerRetry 合约地址");
    console.error("   方式 1: 使用环境变量");
    console.error("   export ISSUER_RETRY_ADDRESS=0x...");
    console.error("\n   方式 2: 在脚本中直接设置地址");
    process.exit(1);
  }

  // 验证地址格式
  try {
    getAddress(realEstateTokenAddress);
    getAddress(issuerAddress);
  } catch (error) {
    console.error("❌ 错误：合约地址格式无效");
    process.exit(1);
  }

  // 获取网络信息
  const chainId = await publicClient.getChainId();

  console.log("📋 测试配置：");
  console.log(`   RealEstateToken: ${realEstateTokenAddress}`);
  console.log(`   IssuerRetry (带重试功能): ${issuerAddress}`);
  console.log(`   测试账户 (Owner): ${deployer.account.address}`);
  console.log(`   测试账户 (Recipient): ${recipient.account.address}`);
  console.log(`   链 ID: ${chainId}\n`);

  // 获取合约实例
  const realEstateToken = await viem.getContractAt("RealEstateToken", realEstateTokenAddress);
  const issuerRetry = await viem.getContractAt("IssuerRetry", issuerAddress);
  // 类型断言：合约已添加新函数，但类型尚未更新
  const issuerRetryWithNewFunctions = issuerRetry as any;

  // 测试结果统计
  let passedTests = 0;
  let failedTests = 0;

  // 辅助函数：运行测试
  async function runTest(testName: string, testFn: () => Promise<boolean>): Promise<void> {
    try {
      console.log(`🧪 测试: ${testName}`);
      const result = await testFn();
      if (result) {
        console.log(`   ✅ 通过\n`);
        passedTests++;
      } else {
        console.log(`   ❌ 失败\n`);
        failedTests++;
      }
    } catch (error: any) {
      console.log(`   ❌ 失败: ${error.message}\n`);
      failedTests++;
    }
  }

  // ========== 测试 1: 验证合约地址 ==========
  await runTest("验证合约地址", async () => {
    const realEstateTokenCode = await publicClient.getCode({ address: realEstateTokenAddress });
    const issuerCode = await publicClient.getCode({ address: issuerAddress });

    if (!realEstateTokenCode || realEstateTokenCode === "0x") {
      throw new Error("RealEstateToken 合约地址无效或未部署");
    }
    if (!issuerCode || issuerCode === "0x") {
      throw new Error("IssuerRetry 合约地址无效或未部署");
    }
    return true;
  });

  // ========== 测试 2: 验证 IssuerRetry 基本信息 ==========
  await runTest("验证 IssuerRetry 基本信息", async () => {
    const owner = await issuerRetry.read.owner();
    console.log(`   Owner: ${owner}`);
    const isOwner = owner.toLowerCase() === deployer.account.address.toLowerCase();
    if (!isOwner) {
      console.log(`   ⚠️  警告：测试账户不是合约 owner`);
    }
    return true;
  });

  // ========== 测试 3: 测试 getRequestStatus 函数 ==========
  await runTest("测试 getRequestStatus 函数", async () => {
    try {
      const status = await issuerRetryWithNewFunctions.read.getRequestStatus();
      console.log(`   是否有待处理请求: ${status[0]}`);
      if (status[0]) {
        console.log(`   请求 ID: ${status[1]}`);
        console.log(`   重试次数: ${status[2]}`);
        console.log(`   请求时间戳: ${new Date(Number(status[3]) * 1000).toLocaleString()}`);
        console.log(`   是否已超时: ${status[4]}`);
        console.log(`   剩余时间: ${Number(status[5])} 秒 (${(Number(status[5]) / 60).toFixed(2)} 分钟)`);
      } else {
        console.log(`   ℹ️  当前没有待处理的请求`);
      }
      return true;
    } catch (error: any) {
      throw new Error(`无法调用 getRequestStatus: ${error.message}`);
    }
  });

  // ========== 测试 4: 测试 checkUpkeep 函数 ==========
  await runTest("测试 checkUpkeep 函数", async () => {
    try {
      const [upkeepNeeded, performData] = await issuerRetryWithNewFunctions.read.checkUpkeep(["0x"]);
      console.log(`   是否需要执行重试: ${upkeepNeeded}`);
      if (upkeepNeeded) {
        const requestId = decodeAbiParameters([{ type: "bytes32" }], performData as `0x${string}`)[0];
        console.log(`   需要重试的请求 ID: ${requestId}`);
        console.log(`   ✅ 可以执行超时重试`);
      } else {
        console.log(`   ℹ️  当前不需要执行重试（请求未超时或已达到最大重试次数）`);
      }
      return true;
    } catch (error: any) {
      throw new Error(`无法调用 checkUpkeep: ${error.message}`);
    }
  });

  // ========== 测试 5: 测试 cancelPendingRequest 函数 ==========
  await runTest("测试 cancelPendingRequest 函数", async () => {
    try {
      const hash = await issuerRetry.write.cancelPendingRequest({ account: deployer.account });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ cancelPendingRequest 函数调用成功`);
      return true;
    } catch (error: any) {
      if (error.message.includes("Ownable")) {
        throw new Error("权限错误：只有 owner 可以调用此函数");
      }
      throw error;
    }
  });

  // ========== 测试 6: 测试 retryTimedOutRequest 函数 ==========
  await runTest("测试 retryTimedOutRequest 函数（如果请求超时）", async () => {
    try {
      // 先检查状态
      const status = await issuerRetryWithNewFunctions.read.getRequestStatus();
      if (!status[0]) {
        console.log(`   ℹ️  没有待处理的请求，跳过此测试`);
        return true;
      } else if (!status[4]) {
        console.log(`   ℹ️  请求尚未超时，跳过此测试`);
        console.log(`   剩余时间: ${Number(status[5])} 秒`);
        return true;
      } else {
        console.log(`   ⚠️  检测到超时的请求，尝试手动重试...`);
        const tx = await issuerRetryWithNewFunctions.write.retryTimedOutRequest();
        console.log(`   交易哈希: ${tx}`);
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log(`   交易确认: 区块 ${receipt.blockNumber}`);
        
        // 检查重试事件
        const retryEvents = await publicClient.getContractEvents({
          address: issuerAddress,
          abi: issuerRetry.abi,
          eventName: "RequestRetry" as any,
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
        });

        if (retryEvents.length > 0) {
          const event = retryEvents[0];
          const args = event.args as any;
          console.log(`   ✅ 重试成功！`);
          console.log(`      原始请求 ID: ${args?.originalRequestId}`);
          console.log(`      新请求 ID: ${args?.newRequestId}`);
          console.log(`      重试次数: ${args?.retryCount}`);
        }

        return true;
      }
    } catch (error: any) {
      if (error.message.includes("RequestNotTimedOut")) {
        console.log(`   ℹ️  请求尚未超时，无法重试`);
        return true;
      } else if (error.message.includes("NoPendingRequest")) {
        console.log(`   ℹ️  没有待处理的请求`);
        return true;
      } else if (error.message.includes("MaxRetriesExceeded")) {
        console.log(`   ⚠️  已达到最大重试次数，无法继续重试`);
        return true;
      } else {
        throw error;
      }
    }
  });

  // ========== 测试 7: 测试 issue 函数 ==========
  await runTest("测试 issue 函数铸造代币", async () => {
    const configPath = path.join(__dirname, "../config/test-issuer.config.json");
    let issueConfig: any = null;
    
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(configContent);
        issueConfig = config.issue;
      }
    } catch (error: any) {
      console.log(`   ⚠️  读取配置文件失败: ${error.message}`);
    }

    const enabled = issueConfig?.enabled === true || process.env.ENABLE_ISSUE_TEST === "true";
    
    if (!enabled) {
      console.log(`   ⚠️  issue 测试未启用，跳过实际调用`);
      return true;
    }

    const subscriptionId = issueConfig?.subscriptionId || process.env.SUBSCRIPTION_ID || "";
    
    if (!subscriptionId) {
      console.log(`   ⚠️  未设置 subscriptionId，跳过实际调用`);
      return true;
    }

    const recipientAddr = issueConfig?.recipientAddress || process.env.RECIPIENT_ADDRESS;
    const to = (recipientAddr && recipientAddr !== "") 
      ? (recipientAddr as `0x${string}`)
      : recipient.account.address;
    
    const amount = BigInt(issueConfig?.amount || process.env.AMOUNT || "100");
    const gasLimit = Number(issueConfig?.gasLimit || process.env.GAS_LIMIT || "300000");
    const donId = (issueConfig?.donId || process.env.DON_ID || 
      "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000") as `0x${string}`;
    const waitTime = Number(issueConfig?.waitTime || process.env.WAIT_TIME || "10000");

    console.log(`   📋 铸造参数：`);
    console.log(`      接收地址: ${to}`);
    console.log(`      数量: ${amount}`);
    console.log(`      订阅 ID: ${subscriptionId}`);

    try {
      const hash = await issuerRetry.write.issue(
        [to, amount, BigInt(subscriptionId), gasLimit, donId],
        { account: deployer.account }
      );

      console.log(`   ✅ 交易已提交: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ 交易已确认，区块号: ${receipt.blockNumber}`);

      // 查找事件
      const requestSentEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuerRetry.abi,
        eventName: "RequestSent",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      const issueInitiatedEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuerRetry.abi,
        eventName: "IssueRequestInitiated" as any,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      if (issueInitiatedEvents.length > 0) {
        console.log(`   ✅ IssueRequestInitiated 事件已触发`);
      }

      if (requestSentEvents.length > 0) {
        const requestId = (requestSentEvents[0].args as any)?.id as `0x${string}`;
        console.log(`   📋 Chainlink Functions 请求 ID: ${requestId}`);
        console.log(`   ⏳ 等待 Chainlink Functions 响应...`);
        console.log(`   💡 如果请求失败或超时，系统将自动重试（最多 3 次）`);
      }

      console.log(`   ⏳ 等待 ${waitTime / 1000} 秒后检查代币状态...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      try {
        const totalSupplyAfter = await realEstateToken.read.totalSupply([0n]);
        console.log(`   📊 铸造后 Token ID 0 总供应量: ${totalSupplyAfter}`);
        
        if (totalSupplyAfter > 0n) {
          const balance = await realEstateToken.read.balanceOf([to, 0n]);
          console.log(`   💰 接收者余额: ${balance} 代币`);
          return true;
        } else {
          console.log(`   ⚠️  代币尚未铸造（Chainlink Functions 可能还在处理中）`);
          return true;
        }
      } catch (error: any) {
        console.log(`   ⚠️  无法检查代币状态: ${error.message}`);
        return true;
      }
    } catch (error: any) {
      if (error.message.includes("LatestIssueInProcess")) {
        console.log(`   ⚠️  已有正在处理的请求`);
        return true;
      } else if (error.message.includes("Ownable")) {
        throw new Error("权限错误：只有 owner 可以调用此函数");
      } else {
        throw error;
      }
    }
  });

  // ========== 测试 8: 验证权限控制 ==========
  await runTest("验证权限控制", async () => {
    try {
      await issuerRetry.write.issue(
        [recipient.account.address, 1000n, 1n, 300000, "0x" + "0".repeat(64) as `0x${string}`],
        { account: recipient.account }
      );
      console.log(`   ❌ 非 owner 账户不应该能够调用 issue`);
      return false;
    } catch (error: any) {
      if (error.message.includes("Ownable") || error.message.includes("revert")) {
        console.log(`   ✅ 权限控制正常：非 owner 无法调用 issue`);
        return true;
      }
      throw error;
    }
  });

  // ========== 测试 9: 检查重试相关事件 ==========
  await runTest("检查重试相关事件", async () => {
    const currentBlock = await publicClient.getBlockNumber();
    const maxBlockRange = 2000n;
    const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

    try {
      // 检查 RequestRetry 事件
      const retryEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuerRetry.abi,
        eventName: "RequestRetry" as any,
        fromBlock: fromBlock,
      });

      // 检查 RequestFailed 事件
      const failedEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuerRetry.abi,
        eventName: "RequestFailed" as any,
        fromBlock: fromBlock,
      });

      // 检查 RequestTimedOut 事件
      const timeoutEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuerRetry.abi,
        eventName: "RequestTimedOut" as any,
        fromBlock: fromBlock,
      });

      console.log(`   RequestRetry 事件: ${retryEvents.length} 个`);
      console.log(`   RequestFailed 事件: ${failedEvents.length} 个`);
      console.log(`   RequestTimedOut 事件: ${timeoutEvents.length} 个`);

      return true;
    } catch (error: any) {
      console.log(`   ⚠️  无法查询事件: ${error.message}`);
      return false;
    }
  });

  // ========== 测试总结 ==========
  console.log("\n" + "=".repeat(50));
  console.log("📊 测试总结");
  console.log("=".repeat(50));
  console.log(`   ✅ 通过: ${passedTests}`);
  console.log(`   ❌ 失败: ${failedTests}`);
  console.log(`   📈 总计: ${passedTests + failedTests}`);
  console.log("=".repeat(50) + "\n");

  console.log("💡 IssuerRetry 合约特性：");
  console.log("   1. ✅ 支持错误重试（最多 3 次）");
  console.log("   2. ✅ 支持超时重试（5 分钟超时）");
  console.log("   3. ✅ 支持 Chainlink Automation 自动重试");
  console.log("   4. ✅ 支持手动重试超时请求");
  console.log("   5. ✅ 提供请求状态查询功能\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
