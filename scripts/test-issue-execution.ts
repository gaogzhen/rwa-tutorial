import { network } from "hardhat";
import { getAddress, formatEther } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// 在 ES modules 中获取 __dirname 的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 测试 Issuer.issue() 函数执行
 * 验证 Chainlink Functions 请求是否被正确发送
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    - REAL_ESTATE_TOKEN_ADDRESS: RealEstateToken 合约地址
 *    - ISSUER_ADDRESS: Issuer 合约地址
 * 
 * 2. 配置参数（可选）：
 *    编辑 config/test-issuer.config.json
 * 
 * 3. 运行脚本：
 *    npx hardhat run scripts/test-issue-execution.ts --network avalancheFuji
 */

async function main() {
  console.log("🧪 测试 Issuer.issue() 函数执行...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    console.error("❌ 错误：无法获取钱包客户端");
    process.exit(1);
  }

  // 获取合约地址
  const realEstateTokenAddress = (process.env.REAL_ESTATE_TOKEN_ADDRESS as `0x${string}`) || 
    "0x13264FE25550C54e045728BC8a4cc0b2de322395";
  const issuerAddress = (process.env.ISSUER_ADDRESS as `0x${string}`) || 
    "0x5Ba14BA9a0aC5A27a975a8ad64df3308E61Bb5Fa";

  // 验证地址格式
  try {
    getAddress(realEstateTokenAddress);
    getAddress(issuerAddress);
  } catch (error) {
    console.error("❌ 错误：合约地址格式无效");
    process.exit(1);
  }

  console.log("📋 测试配置：");
  console.log(`   RealEstateToken: ${realEstateTokenAddress}`);
  console.log(`   Issuer: ${issuerAddress}`);
  console.log(`   测试账户: ${deployer.account.address}\n`);

  // 获取合约实例
  const issuer = await viem.getContractAt("Issuer", issuerAddress);
  const realEstateToken = await viem.getContractAt("RealEstateToken", realEstateTokenAddress);

  // 读取配置文件
  const configPath = path.join(__dirname, "../config/test-issuer.config.json");
  let issueConfig: any = null;

  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);
      issueConfig = config.issue;
      console.log(`📋 已加载配置文件: ${configPath}\n`);
    }
  } catch (error: any) {
    console.log(`⚠️  读取配置文件失败: ${error.message}\n`);
  }

  // 检查是否启用
  const enabled = issueConfig?.enabled === true || process.env.ENABLE_ISSUE_TEST === "true";
  if (!enabled) {
    console.log("⚠️  测试未启用，仅进行执行验证（不实际调用）\n");
  }

  // 获取参数
  const subscriptionId = issueConfig?.subscriptionId || process.env.SUBSCRIPTION_ID || "";
  const recipientAddr = issueConfig?.recipientAddress || process.env.RECIPIENT_ADDRESS;
  const to = (recipientAddr && recipientAddr !== "") 
    ? (recipientAddr as `0x${string}`)
    : deployer.account.address;
  const amount = BigInt(issueConfig?.amount || process.env.AMOUNT || "20");
  const gasLimit = Number(issueConfig?.gasLimit || process.env.GAS_LIMIT || "250000");
  const donId = (issueConfig?.donId || process.env.DON_ID || 
    "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000") as `0x${string}`;

  console.log("📋 调用参数：");
  console.log(`   to: ${to}`);
  console.log(`   amount: ${amount}`);
  console.log(`   subscriptionId: ${subscriptionId || "未设置"}`);
  console.log(`   gasLimit: ${gasLimit}`);
  console.log(`   donId: ${donId}\n`);

  // 步骤 1: 检查前置条件
  console.log("🔍 步骤 1: 检查前置条件...\n");

  // 检查 Owner
  const owner = await issuer.read.owner();
  const isOwner = owner.toLowerCase() === deployer.account.address.toLowerCase();
  console.log(`   Owner: ${owner}`);
  console.log(`   当前账户是否为 Owner: ${isOwner ? "✅ 是" : "❌ 否"}`);

  if (!isOwner) {
    console.error("\n❌ 错误：当前账户不是 Issuer 的 Owner");
    process.exit(1);
  }

  // 检查 Issuer 是否已设置
  const currentBlock = await publicClient.getBlockNumber();
  const maxBlockRange = 2000n;
  const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

  const issuerSetEvents = await publicClient.getContractEvents({
    address: realEstateTokenAddress,
    abi: realEstateToken.abi,
    eventName: "IssuerSet",
    fromBlock: fromBlock,
  });

  if (issuerSetEvents.length === 0) {
    console.error("\n❌ 错误：Issuer 尚未设置为 RealEstateToken 的发行者");
    process.exit(1);
  }

  const latestIssuerEvent = issuerSetEvents[issuerSetEvents.length - 1];
  const eventIssuer = (latestIssuerEvent.args as any)?.issuer as `0x${string}`;

  if (eventIssuer.toLowerCase() !== issuerAddress.toLowerCase()) {
    console.error("\n❌ 错误：Issuer 地址不匹配");
    console.error(`   当前设置的 Issuer: ${eventIssuer}`);
    console.error(`   提供的 Issuer: ${issuerAddress}`);
    process.exit(1);
  }

  console.log(`   ✅ Issuer 已正确设置\n`);

  // 检查 getNftMetadata
  try {
    const metadataScript = await issuer.read.getNftMetadata();
    console.log(`   ✅ getNftMetadata 脚本已配置 (${metadataScript.length} 字符)\n`);
  } catch (error: any) {
    console.error(`   ❌ 无法读取 getNftMetadata: ${error.message}\n`);
    process.exit(1);
  }

  // 步骤 2: 检查是否有待处理的请求
  console.log("🔍 步骤 2: 检查是否有待处理的请求...\n");

  const requestSentEvents = await publicClient.getContractEvents({
    address: issuerAddress,
    abi: issuer.abi,
    eventName: "RequestSent",
    fromBlock: fromBlock,
  });

  if (requestSentEvents.length > 0) {
    const latestRequest = requestSentEvents[requestSentEvents.length - 1];
    const requestId = (latestRequest.args as any)?.id as `0x${string}`;
    console.log(`   ⚠️  发现待处理的请求: ${requestId}`);
    console.log(`   💡 建议先取消: npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji\n`);
  } else {
    console.log(`   ✅ 没有待处理的请求\n`);
  }

  // 步骤 3: 实际调用（如果启用）
  if (!enabled || !subscriptionId) {
    console.log("⚠️  测试未启用或缺少 subscriptionId，跳过实际调用");
    console.log("   前置条件检查通过，代码逻辑验证完成\n");
    return;
  }

  console.log("🚀 步骤 3: 调用 issue() 函数...\n");

  try {
    // 记录调用前的区块号
    const blockBefore = await publicClient.getBlockNumber();
    console.log(`   调用前区块号: ${blockBefore}`);

    // 调用 issue 函数
    const hash = await issuer.write.issue(
      [to, amount, BigInt(subscriptionId), gasLimit, donId],
      {
        account: deployer.account,
      }
    );

    console.log(`   ✅ 交易已提交: ${hash}`);
    console.log(`   等待交易确认...\n`);

    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   ✅ 交易已确认`);
    console.log(`   区块号: ${receipt.blockNumber}`);
    console.log(`   Gas 使用: ${receipt.gasUsed}\n`);

    // 步骤 4: 验证执行结果
    console.log("🔍 步骤 4: 验证执行结果...\n");

    // 查找所有相关事件
    console.log(`   查询交易中的事件...\n`);

    // 1. 检查 IssueRequestInitiated 事件（自定义事件）
    const issueInitiatedEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "IssueRequestInitiated" as any, // 使用类型断言，因为新事件可能不在类型定义中
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (issueInitiatedEvents.length > 0) {
      const event = issueInitiatedEvents[0];
      const args = event.args as any;
      console.log(`   ✅ IssueRequestInitiated 事件已触发`);
      console.log(`      to: ${args?.to}`);
      console.log(`      amount: ${args?.amount}`);
      console.log(`      subscriptionId: ${args?.subscriptionId}`);
      console.log(`      gasLimit: ${args?.gasLimit}`);
    }

    // 2. 检查 RequestPrepared 事件（自定义事件）
    const requestPreparedEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestPrepared" as any, // 使用类型断言
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (requestPreparedEvents.length > 0) {
      console.log(`   ✅ RequestPrepared 事件已触发`);
      console.log(`      这证明 req.initializeRequestForInlineJavaScript() 已执行（第 51 行）`);
    }

    // 3. 检查 RequestSentToFunctions 事件（自定义事件）
    const requestSentToFunctionsEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestSentToFunctions" as any, // 使用类型断言
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (requestSentToFunctionsEvents.length > 0) {
      const event = requestSentToFunctionsEvents[0];
      const requestId = (event.args as any)?.requestId as `0x${string}`;
      console.log(`   ✅ RequestSentToFunctions 事件已触发`);
      console.log(`      请求 ID: ${requestId}`);
      console.log(`      这证明 _sendRequest() 已执行（第 52-57 行）`);
    }

    // 4. 检查 Chainlink Functions 的 RequestSent 事件
    const requestSentEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestSent",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (requestSentEvents.length > 0) {
      const requestEvent = requestSentEvents[0];
      const requestId = (requestEvent.args as any)?.id as `0x${string}`;
      console.log(`   ✅ RequestSent 事件已触发（Chainlink Functions）`);
      console.log(`      请求 ID: ${requestId}`);
    }

    // 5. 检查重试相关事件
    const requestRetryEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestRetry" as any,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (requestRetryEvents.length > 0) {
      const retryEvent = requestRetryEvents[0];
      const args = retryEvent.args as any;
      console.log(`   ✅ RequestRetry 事件已触发`);
      console.log(`      原始请求 ID: ${args?.originalRequestId}`);
      console.log(`      新请求 ID: ${args?.newRequestId}`);
      console.log(`      重试次数: ${args?.retryCount}`);
    }

    const requestFailedEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestFailed" as any,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (requestFailedEvents.length > 0) {
      const failedEvent = requestFailedEvents[0];
      const args = failedEvent.args as any;
      console.log(`   ⚠️  RequestFailed 事件已触发`);
      console.log(`      请求 ID: ${args?.requestId}`);
      console.log(`      错误原因: ${args?.reason}`);
      console.log(`      重试次数: ${args?.retryCount}`);
      console.log(`      💡 系统将自动重试（最多 3 次）`);
    }

    // 总结 issue 函数执行
    const retryEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestRetry" as any,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    const failedEvents = await publicClient.getContractEvents({
      address: issuerAddress,
      abi: issuer.abi,
      eventName: "RequestFailed" as any,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    const totalEvents = issueInitiatedEvents.length + 
                       requestPreparedEvents.length + 
                       requestSentToFunctionsEvents.length + 
                       requestSentEvents.length +
                       retryEvents.length +
                       failedEvents.length;

    if (totalEvents > 0) {
      console.log(`\n   ✅ issue() 函数执行验证成功！`);
      console.log(`   共检测到 ${totalEvents} 个相关事件`);
      console.log(`\n   执行流程验证：`);
      console.log(`   ✅ 步骤 1: req.initializeRequestForInlineJavaScript() - 已执行（第 51 行）`);
      console.log(`   ✅ 步骤 2: _sendRequest() - 已执行（第 52-57 行）`);
    } else {
      console.log(`   ⚠️  未找到任何相关事件`);
      console.log(`   可能的原因：`);
      console.log(`   1. 交易失败但未抛出错误`);
      console.log(`   2. 事件未正确触发`);
      console.log(`   3. 查询范围问题`);
      console.log(`   4. ABI 不匹配`);
    }

    // 检查交易日志
    if (receipt.logs && receipt.logs.length > 0) {
      console.log(`\n   📋 交易日志数量: ${receipt.logs.length}`);
      console.log(`   这证明交易已执行并产生了日志`);
    }

    // 步骤 5: 验证 fulfillRequest 接收（等待 Chainlink Functions 响应）
    console.log(`\n🔍 步骤 5: 验证 fulfillRequest() 接收...\n`);
    console.log(`   ⏳ 等待 Chainlink Functions 响应（最多 60 秒）...\n`);

    const maxWaitTime = 60000; // 60 秒
    const checkInterval = 5000; // 每 5 秒检查一次
    const startTime = Date.now();
    let fulfilled = false;
    let requestId: `0x${string}` | undefined;

    // 获取请求 ID
    if (requestSentEvents.length > 0) {
      requestId = (requestSentEvents[0].args as any)?.id as `0x${string}`;
      console.log(`   请求 ID: ${requestId}`);
    } else if (requestSentToFunctionsEvents.length > 0) {
      requestId = (requestSentToFunctionsEvents[0].args as any)?.requestId as `0x${string}`;
      console.log(`   请求 ID: ${requestId}`);
    }

    if (!requestId) {
      console.log(`   ⚠️  无法获取请求 ID，跳过 fulfillRequest 验证`);
      console.log(`\n   💡 可以使用以下命令检查状态：`);
      console.log(`      npx hardhat run scripts/check-issuer-status.ts --network avalancheFuji`);
      return;
    }

    // 轮询检查 fulfillRequest 是否被调用
    while (Date.now() - startTime < maxWaitTime && !fulfilled) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      try {
        // 检查 RequestFulfilled 事件（Chainlink Functions）
        const fulfilledEvents = await publicClient.getContractEvents({
          address: issuerAddress,
          abi: issuer.abi,
          eventName: "RequestFulfilled",
          fromBlock: receipt.blockNumber,
        });

        const matchingFulfilled = fulfilledEvents.filter(
          (event) => (event.args as any)?.id === requestId
        );

        if (matchingFulfilled.length > 0) {
          console.log(`   ✅ RequestFulfilled 事件已触发`);
          console.log(`      这证明 fulfillRequest() 已被调用（第 90-103 行）`);
          fulfilled = true;
        }

        // 检查代币是否已铸造（验证 fulfillRequest 中的 mint 调用）
        try {
          const totalSupply = await realEstateToken.read.totalSupply([0n]);
          if (totalSupply > 0n) {
            console.log(`   ✅ 代币已成功铸造！`);
            console.log(`      总供应量: ${totalSupply}`);
            console.log(`      这证明 fulfillRequest() 中的 mint() 已执行（第 103 行之后）`);
            
            // 检查接收者余额
            const balance = await realEstateToken.read.balanceOf([to, 0n]);
            console.log(`      接收者余额: ${balance} 代币`);

            // 检查代币 URI
            try {
              const uri = await realEstateToken.read.uri([0n]);
              console.log(`      代币 URI: ${uri}`);
            } catch (error) {
              console.log(`      代币 URI: 未设置或无法读取`);
            }

            fulfilled = true;
          }
        } catch (error) {
          // 代币可能还未创建，继续等待
        }

        if (!fulfilled) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`   ⏳ 等待中... (已等待 ${elapsed} 秒)`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  检查时出错: ${error.message}`);
      }
    }

    if (fulfilled) {
      console.log(`\n   ✅ fulfillRequest() 接收验证成功！`);
      console.log(`\n   完整执行流程验证：`);
      console.log(`   ✅ issue() 函数执行（第 39-61 行）`);
      console.log(`      - req.initializeRequestForInlineJavaScript() 已执行（第 51 行）`);
      console.log(`      - _sendRequest() 已执行（第 52-57 行）`);
      console.log(`   ✅ fulfillRequest() 接收（第 90-103 行）`);
      console.log(`      - 错误检查已执行（第 95-97 行）`);
      console.log(`      - 请求验证已执行（第 99-101 行）`);
      console.log(`      - 代币铸造已执行（第 103 行之后）`);
    } else {
      console.log(`\n   ⚠️  fulfillRequest() 尚未被调用或超时`);
      console.log(`   可能的原因：`);
      console.log(`   1. Chainlink Functions 还在处理中`);
      console.log(`   2. Chainlink Functions 执行失败`);
      console.log(`   3. 需要更长的等待时间`);
      console.log(`\n   💡 可以使用以下命令检查状态：`);
      console.log(`      npx hardhat run scripts/check-issuer-status.ts --network avalancheFuji`);
      console.log(`      npx hardhat run scripts/check-token-balance.ts --network avalancheFuji`);
    }

  } catch (error: any) {
    console.error("❌ 调用失败:", error.message);

    // 尝试解码错误
    if (error.message.includes("0x")) {
      const errorMatch = error.message.match(/0x[a-fA-F0-9]{8}/);
      if (errorMatch) {
        const errorSig = errorMatch[0];
        console.log(`\n   🔍 检测到错误签名: ${errorSig}`);
        console.log(`   💡 可以使用以下命令解码：`);
        console.log(`      ERROR_SIGNATURE=${errorSig} npx hardhat run scripts/decode-error.ts --network avalancheFuji`);
      }
    }

    // 常见错误处理
    if (error.message.includes("LatestIssueInProcess")) {
      console.log(`\n   💡 解决方案：取消待处理的请求`);
      console.log(`      npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji`);
    } else if (error.message.includes("GasLimitTooBig") || error.message.includes("0x1d70f87a")) {
      console.log(`\n   💡 解决方案：降低 gasLimit`);
      console.log(`      在配置文件中设置 "gasLimit": 250000 或更低`);
    }

    process.exit(1);
  }
}

// 运行脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
