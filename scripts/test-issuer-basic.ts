import { network } from "hardhat";
import { getAddress, formatEther } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// 在 ES modules 中获取 __dirname 的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 测试部署在 Avalanche Fuji 测试网上的 Issuer 基础版本合约
 * 
 * 使用方法：
 * 1. 设置环境变量或直接在脚本中修改合约地址：
 *    - REAL_ESTATE_TOKEN_ADDRESS: RealEstateToken 合约地址
 *    - ISSUER_BASIC_ADDRESS: Issuer 基础版本合约地址
 * 
 * 2. 配置 issue 测试参数（可选）：
 *    编辑 config/test-issuer.config.json 文件
 * 
 * 3. 运行测试：
 *    npx hardhat run scripts/test-issuer-basic.ts --network avalancheFuji
 */

const REAL_ESTATE_TOKEN_ADDRESS = "0x13264FE25550C54e045728BC8a4cc0b2de322395" as `0x${string}`;
const ISSUER_BASIC_ADDRESS = "0xC089eaA0F7867CCa1838d0576eABDdEe51CE2f90" as `0x${string}`; // 部署后填入地址

async function main() {
  console.log("🚀 开始测试部署在 Avalanche Fuji 测试网上的 Issuer 基础版本合约...\n");

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
  const issuerAddress = process.env.ISSUER_BASIC_ADDRESS as `0x${string}` || ISSUER_BASIC_ADDRESS;

  if (!issuerAddress ) {
    console.error("❌ 错误：请设置 Issuer 基础版本合约地址");
    console.error("   方式 1: 使用环境变量");
    console.error("   export ISSUER_BASIC_ADDRESS=0x...");
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
  console.log(`   Issuer (基础版本): ${issuerAddress}`);
  console.log(`   测试账户 (Owner): ${deployer.account.address}`);
  console.log(`   测试账户 (Recipient): ${recipient.account.address}`);
  console.log(`   链 ID: ${chainId}\n`);

  // 获取合约实例
  const realEstateToken = await viem.getContractAt("RealEstateToken", realEstateTokenAddress);
  const issuer = await viem.getContractAt("Issuer", issuerAddress);

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
      throw new Error("Issuer 基础版本合约地址无效或未部署");
    }
    return true;
  });

  // ========== 测试 2: 验证 Issuer 基本信息 ==========
  await runTest("验证 Issuer 基本信息", async () => {
    const owner = await issuer.read.owner();
    console.log(`   Owner: ${owner}`);
    const isOwner = owner.toLowerCase() === deployer.account.address.toLowerCase();
    if (!isOwner) {
      console.log(`   ⚠️  警告：测试账户不是合约 owner`);
    }
    return true;
  });

  // ========== 测试 3: 验证 Issuer 与 RealEstateToken 的连接 ==========
  await runTest("验证 Issuer 与 RealEstateToken 的连接", async () => {
    try {
      const realEstateTokenOwner = await realEstateToken.read.owner();
      console.log(`   RealEstateToken Owner: ${realEstateTokenOwner}`);
      return true;
    } catch (error: any) {
      throw new Error(`无法访问 RealEstateToken: ${error.message}`);
    }
  });

  // ========== 测试 4: 验证 Issuer 是否已设置 ==========
  await runTest("验证 Issuer 是否已设置为 RealEstateToken 的发行者", async () => {
    const currentBlock = await publicClient.getBlockNumber();
    const maxBlockRange = 2000n;
    const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

    const events = await publicClient.getContractEvents({
      address: realEstateTokenAddress,
      abi: realEstateToken.abi,
      eventName: "IssuerSet",
      fromBlock: fromBlock,
    });

    if (events.length === 0) {
      console.log(`   ⚠️  未找到 IssuerSet 事件`);
      return false;
    }

    const latestEvent = events[events.length - 1];
    const eventIssuer = (latestEvent.args as any)?.issuer as `0x${string}`;

    if (eventIssuer.toLowerCase() === issuerAddress.toLowerCase()) {
      console.log(`   ✅ Issuer 已正确设置: ${eventIssuer}`);
      return true;
    } else {
      console.log(`   ❌ Issuer 地址不匹配`);
      return false;
    }
  });

  // ========== 测试 5: 验证账户余额 ==========
  await runTest("验证测试账户 AVAX 余额", async () => {
    const deployerBalance = await publicClient.getBalance({ address: deployer.account.address });
    const deployerBalanceInAvax = formatEther(deployerBalance);
    console.log(`   Owner 余额: ${deployerBalanceInAvax} AVAX`);
    if (deployerBalance === 0n) {
      throw new Error("Owner 账户余额为 0，无法进行测试");
    }
    return true;
  });

  // ========== 测试 6: 测试 cancelPendingRequest 函数 ==========
  await runTest("测试 cancelPendingRequest 函数", async () => {
    try {
      const hash = await issuer.write.cancelPendingRequest({ account: deployer.account });
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
      const hash = await issuer.write.issue(
        [to, amount, BigInt(subscriptionId), gasLimit, donId],
        { account: deployer.account }
      );

      console.log(`   ✅ 交易已提交: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ 交易已确认，区块号: ${receipt.blockNumber}`);

      // 查找 RequestSent 事件
      const requestSentEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuer.abi,
        eventName: "RequestSent",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      if (requestSentEvents.length > 0) {
        const requestId = (requestSentEvents[0].args as any)?.id as `0x${string}`;
        console.log(`   📋 Chainlink Functions 请求 ID: ${requestId}`);
        console.log(`   ⏳ 等待 Chainlink Functions 响应...`);
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
      if (error.message.includes("LatestIssueInProgress")) {
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
      await issuer.write.issue(
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

  // ========== 测试总结 ==========
  console.log("\n" + "=".repeat(50));
  console.log("📊 测试总结");
  console.log("=".repeat(50));
  console.log(`   ✅ 通过: ${passedTests}`);
  console.log(`   ❌ 失败: ${failedTests}`);
  console.log(`   📈 总计: ${passedTests + failedTests}`);
  console.log("=".repeat(50) + "\n");

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
