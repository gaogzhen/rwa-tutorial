import { network } from "hardhat";
import { getAddress, formatEther } from "viem";

/**
 * 检查 RealEstateToken 代币余额
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    - REAL_ESTATE_TOKEN_ADDRESS: RealEstateToken 合约地址
 *    - TOKEN_ID: 代币 ID（可选，默认 0）
 *    - ADDRESS: 要检查的地址（可选，默认为部署账户）
 * 
 * 2. 运行脚本：
 *    npx hardhat run scripts/check-token-balance.ts --network avalancheFuji
 */

async function main() {
  console.log("🔍 检查 RealEstateToken 代币余额...\n");

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
  const realEstateTokenAddress = (process.env.REAL_ESTATE_TOKEN_ADDRESS as `0x${string}`) || 
    "0x4D7e17b8f5ad3417561B04083383134A1EC4aF77";
  const tokenId = BigInt(process.env.TOKEN_ID || "0");
  const address = (process.env.ADDRESS as `0x${string}`) || deployer.account.address;

  if (!realEstateTokenAddress) {
    console.error("❌ 错误：请设置 RealEstateToken 合约地址");
    console.error("   export REAL_ESTATE_TOKEN_ADDRESS=0x...");
    process.exit(1);
  }

  // 验证地址格式
  try {
    getAddress(realEstateTokenAddress);
    getAddress(address);
  } catch (error) {
    console.error("❌ 错误：地址格式无效");
    process.exit(1);
  }

  // 获取网络信息
  const chainId = await publicClient.getChainId();

  console.log("📋 查询配置：");
  console.log(`   RealEstateToken: ${realEstateTokenAddress}`);
  console.log(`   查询地址: ${address}`);
  console.log(`   Token ID: ${tokenId}`);
  console.log(`   链 ID: ${chainId}\n`);

  // 获取合约实例
  const realEstateToken = await viem.getContractAt(
    "RealEstateToken",
    realEstateTokenAddress
  );

  try {
    // 查询余额
    const balance = await realEstateToken.read.balanceOf([address, tokenId]);
    console.log(`💰 余额: ${balance} 代币`);

    // 查询总供应量
    const totalSupply = await realEstateToken.read.totalSupply([tokenId]);
    console.log(`📊 总供应量: ${totalSupply} 代币`);

    // 查询 URI
    try {
      const uri = await realEstateToken.read.uri([tokenId]);
      console.log(`🔗 代币 URI: ${uri}`);
    } catch (error) {
      console.log(`🔗 代币 URI: 未设置`);
    }

    // 查询账户 AVAX 余额
    const avaxBalance = await publicClient.getBalance({ address });
    console.log(`💵 账户 AVAX 余额: ${formatEther(avaxBalance)} AVAX`);

    // 如果余额大于 0，显示详细信息
    if (balance > 0n) {
      console.log(`\n✅ 账户持有 ${balance} 个 Token ID ${tokenId} 代币`);
      
      // 计算占总供应量的百分比
      if (totalSupply > 0n) {
        const percentage = (Number(balance) / Number(totalSupply)) * 100;
        console.log(`📈 占总供应量的 ${percentage.toFixed(2)}%`);
      }
    } else {
      console.log(`\nℹ️  账户未持有 Token ID ${tokenId} 代币`);
    }

    // 查询所有已创建的代币 ID（通过尝试查询多个 ID）
    console.log(`\n🔍 检查其他代币 ID...`);
    const tokenIdsToCheck = [0n, 1n, 2n, 3n, 4n, 5n];
    const existingTokens: bigint[] = [];

    for (const id of tokenIdsToCheck) {
      try {
        const supply = await realEstateToken.read.totalSupply([id]);
        if (supply > 0n) {
          existingTokens.push(id);
          const addrBalance = await realEstateToken.read.balanceOf([address, id]);
          console.log(`   Token ID ${id}: 总供应量 ${supply}, 账户余额 ${addrBalance}`);
        }
      } catch (error) {
        // 忽略错误，继续检查下一个
      }
    }

    if (existingTokens.length > 0) {
      console.log(`\n📋 已创建的代币 ID: ${existingTokens.join(", ")}`);
    } else {
      console.log(`\n📋 尚未创建任何代币`);
    }

    console.log("\n✅ 查询完成！");
  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
    
    // 提供更详细的错误信息
    if (error.message.includes("revert")) {
      console.error("\n💡 可能的原因：");
      console.error("   1. 合约地址不正确");
      console.error("   2. Token ID 不存在");
      console.error("   3. 合约未正确部署");
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
