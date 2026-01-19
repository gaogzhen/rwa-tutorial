import { network } from "hardhat";
import { getAddress, formatEther } from "viem";

/**
 * 检查 Issuer 合约状态
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    - ISSUER_ADDRESS: Issuer 合约地址
 * 
 * 2. 运行脚本：
 *    npx hardhat run scripts/check-issuer-status.ts --network avalancheFuji
 */

async function main() {
  console.log("🔍 检查 Issuer 合约状态...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    console.error("❌ 错误：无法获取钱包客户端");
    process.exit(1);
  }

  // 获取参数
  const issuerAddress = (process.env.ISSUER_ADDRESS as `0x${string}`) || 
    "0x5Ba14BA9a0aC5A27a975a8ad64df3308E61Bb5Fa";

  if (!issuerAddress) {
    console.error("❌ 错误：请设置 Issuer 合约地址");
    console.error("   export ISSUER_ADDRESS=0x...");
    process.exit(1);
  }

  // 验证地址格式
  try {
    getAddress(issuerAddress);
  } catch (error) {
    console.error("❌ 错误：合约地址格式无效");
    process.exit(1);
  }

  console.log("📋 查询配置：");
  console.log(`   Issuer: ${issuerAddress}`);
  console.log(`   查询账户: ${deployer.account.address}\n`);

  // 获取合约实例
  const issuer = await viem.getContractAt("Issuer", issuerAddress);

  try {
    // 检查 Owner
    const owner = await issuer.read.owner();
    console.log(`👤 Owner: ${owner}`);
    console.log(`   当前账户是否为 Owner: ${owner.toLowerCase() === deployer.account.address.toLowerCase() ? "✅ 是" : "❌ 否"}\n`);

    // 检查最近的 RequestSent 事件（查看是否有待处理的请求）
    console.log("🔍 检查最近的请求...");
    const currentBlock = await publicClient.getBlockNumber();
    const maxBlockRange = 2000n;
    const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

    try {
      const requestSentEvents = await publicClient.getContractEvents({
        address: issuerAddress,
        abi: issuer.abi,
        eventName: "RequestSent",
        fromBlock: fromBlock,
      });

      if (requestSentEvents.length > 0) {
        console.log(`   ✅ 找到 ${requestSentEvents.length} 个 RequestSent 事件`);
        const latestEvent = requestSentEvents[requestSentEvents.length - 1];
        const requestId = (latestEvent.args as any)?.id as `0x${string}`;
        const blockNumber = latestEvent.blockNumber;
        
        console.log(`   📋 最新请求 ID: ${requestId}`);
        console.log(`   📦 区块号: ${blockNumber}`);
        console.log(`   ⏰ 区块时间: ${new Date().toLocaleString()}`);
        
        // 计算已过时间
        const currentBlockTime = await publicClient.getBlock({ blockNumber: currentBlock });
        const requestBlockTime = await publicClient.getBlock({ blockNumber: blockNumber });
        if (currentBlockTime.timestamp && requestBlockTime.timestamp) {
          const timeDiff = Number(currentBlockTime.timestamp - requestBlockTime.timestamp);
          const minutes = Math.floor(timeDiff / 60);
          const seconds = timeDiff % 60;
          console.log(`   ⏱️  已过时间: ${minutes} 分 ${seconds} 秒`);
        }

        console.log(`\n   ⚠️  可能有待处理的请求！`);
        console.log(`   💡 如果请求卡住，可以调用 cancelPendingRequest() 取消`);
        console.log(`   💡 或者等待 Chainlink Functions 完成处理`);
      } else {
        console.log(`   ℹ️  未找到 RequestSent 事件（最近 ${maxBlockRange} 个区块）`);
        console.log(`   ✅ 没有待处理的请求`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  无法查询事件: ${error.message}`);
    }

    // 检查 getNftMetadata 配置
    console.log(`\n🔍 检查 Chainlink Functions 配置...`);
    try {
      const metadataScript = await issuer.read.getNftMetadata();
      if (metadataScript && metadataScript.length > 0) {
        console.log(`   ✅ getNftMetadata 脚本已配置`);
        console.log(`   脚本长度: ${metadataScript.length} 字符`);
      } else {
        console.log(`   ⚠️  getNftMetadata 脚本未配置或为空`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  无法读取 getNftMetadata: ${error.message}`);
    }

    // 提供操作建议
    console.log(`\n💡 操作建议：`);
    console.log(`   1. 如果有待处理的请求且已超时，可以取消：`);
    console.log(`      npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji`);
    console.log(`   2. 如果没有待处理的请求，可以重新调用 issue：`);
    console.log(`      npx hardhat run scripts/test-issuer.ts --network avalancheFuji`);
    console.log(`   3. 检查代币余额：`);
    console.log(`      npx hardhat run scripts/check-token-balance.ts --network avalancheFuji`);

    console.log("\n✅ 检查完成！");
  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
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
