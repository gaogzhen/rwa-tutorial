import { network } from "hardhat";
import { getAddress } from "viem";

/**
 * 取消 Issuer 合约中待处理的请求
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    - ISSUER_ADDRESS: Issuer 合约地址
 * 
 * 2. 运行脚本：
 *    npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji
 */

async function main() {
  console.log("🚫 取消 Issuer 合约中待处理的请求...\n");

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

  console.log("📋 操作配置：");
  console.log(`   Issuer: ${issuerAddress}`);
  console.log(`   操作账户: ${deployer.account.address}\n`);

  // 获取合约实例
  const issuer = await viem.getContractAt("Issuer", issuerAddress);

  try {
    // 检查是否为 Owner
    const owner = await issuer.read.owner();
    const isOwner = owner.toLowerCase() === deployer.account.address.toLowerCase();

    if (!isOwner) {
      console.error("❌ 错误：当前账户不是 Issuer 的 Owner");
      console.error(`   Issuer Owner: ${owner}`);
      console.error(`   当前账户: ${deployer.account.address}`);
      process.exit(1);
    }

    console.log("✅ 当前账户是 Issuer Owner，可以执行取消操作\n");

    // 调用 cancelPendingRequest
    console.log("📝 调用 cancelPendingRequest()...");
    const hash = await issuer.write.cancelPendingRequest({
      account: deployer.account,
    });

    console.log(`✅ 交易已提交: ${hash}`);
    console.log(`   等待交易确认...\n`);

    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ 交易已确认`);
    console.log(`   区块号: ${receipt.blockNumber}`);
    console.log(`   Gas 使用: ${receipt.gasUsed}\n`);

    console.log("✅ 待处理的请求已取消！");
    console.log("\n💡 现在可以重新调用 issue 函数铸造代币：");
    console.log("   npx hardhat run scripts/test-issuer.ts --network avalancheFuji");
  } catch (error: any) {
    console.error("❌ 操作失败:", error.message);

    if (error.message.includes("Ownable")) {
      console.error("\n💡 错误：只有 Owner 可以调用此函数");
    } else if (error.message.includes("revert")) {
      console.error("\n💡 可能的原因：");
      console.error("   1. 没有待处理的请求");
      console.error("   2. 合约地址不正确");
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
