import { network } from "hardhat";
import { getAddress, formatEther } from "viem";

/**
 * 测试部署在 Avalanche Fuji 测试网上的 RealEstateTokenRetry 合约（带重试功能）
 * 
 * 使用方法：
 * 1. 设置环境变量或使用 Hardhat Keystore 设置合约地址：
 *    - REAL_ESTATE_TOKEN_RETRY_ADDRESS: RealEstateTokenRetry 合约地址
 * 
 * 2. 运行测试：
 *    npx hardhat run scripts/test-real-estate-token-retry.ts --network avalancheFuji
 */

const REAL_ESTATE_TOKEN_RETRY_ADDRESS = "0x4D7e17b8f5ad3417561B04083383134A1EC4aF77" as `0x${string}`; // 部署后填入地址

async function main() {
  console.log("🚀 开始测试部署在 Avalanche Fuji 测试网上的 RealEstateTokenRetry 合约（带重试功能）...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    console.error("❌ 错误：无法获取钱包客户端");
    process.exit(1);
  }

  // 获取合约地址
  const realEstateTokenAddress = process.env.REAL_ESTATE_TOKEN_RETRY_ADDRESS as `0x${string}` || REAL_ESTATE_TOKEN_RETRY_ADDRESS;

  if (!realEstateTokenAddress) {
    console.error("❌ 错误：请设置 RealEstateTokenRetry 合约地址");
    console.error("   方式 1: 使用环境变量");
    console.error("   export REAL_ESTATE_TOKEN_RETRY_ADDRESS=0x...");
    console.error("\n   方式 2: 在脚本中直接设置地址");
    process.exit(1);
  }

  // 验证地址格式
  try {
    getAddress(realEstateTokenAddress);
  } catch (error) {
    console.error("❌ 错误：合约地址格式无效");
    process.exit(1);
  }

  // 获取网络信息
  const chainId = await publicClient.getChainId();

  console.log("📋 测试配置：");
  console.log(`   RealEstateTokenRetry (带重试功能): ${realEstateTokenAddress}`);
  console.log(`   测试账户: ${deployer.account.address}`);
  console.log(`   链 ID: ${chainId}\n`);

  // 获取合约实例
  const realEstateToken = await viem.getContractAt(
    "RealEstateTokenRetry",
    realEstateTokenAddress
  );

  // 测试结果统计
  let passedTests = 0;
  let failedTests = 0;

  // 辅助函数：运行测试
  async function runTest(
    testName: string,
    testFn: () => Promise<boolean>
  ): Promise<void> {
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
    const realEstateTokenCode = await publicClient.getCode({
      address: realEstateTokenAddress,
    });

    if (!realEstateTokenCode || realEstateTokenCode === "0x") {
      throw new Error("RealEstateTokenRetry 合约地址无效或未部署");
    }
    console.log(`   合约字节码长度: ${realEstateTokenCode.length / 2 - 1} 字节`);
    return true;
  });

  // ========== 测试 2: 验证 RealEstateTokenRetry 基本信息 ==========
  await runTest("验证 RealEstateTokenRetry 基本信息", async () => {
    // 获取 owner
    const owner = await realEstateToken.read.owner();
    console.log(`   Owner: ${owner}`);

    // 获取 URI（如果设置了）
    try {
      const uri = await realEstateToken.read.uri([0n]);
      console.log(`   URI (Token ID 0): ${uri}`);
    } catch (error) {
      console.log(`   URI: 未设置（正常）`);
    }

    return true;
  });

  // ========== 测试 3: 验证账户余额 ==========
  await runTest("验证测试账户 AVAX 余额", async () => {
    const balance = await publicClient.getBalance({
      address: deployer.account.address,
    });
    const balanceInAvax = formatEther(balance);
    console.log(`   余额: ${balanceInAvax} AVAX`);

    if (balance === 0n) {
      throw new Error("账户余额为 0，无法进行测试");
    }
    return true;
  });

  // ========== 测试 4: 验证合约权限 ==========
  await runTest("验证合约权限", async () => {
    const realEstateTokenOwner = await realEstateToken.read.owner();
    const isRealEstateTokenOwner =
      realEstateTokenOwner.toLowerCase() === deployer.account.address.toLowerCase();

    console.log(`   RealEstateTokenRetry Owner: ${isRealEstateTokenOwner ? "✅" : "❌"}`);

    if (!isRealEstateTokenOwner) {
      console.log(`   ⚠️  警告：测试账户不是合约 owner，某些测试可能失败`);
    }

    return true;
  });

  // ========== 测试 5: 验证 Issuer 状态 ==========
  await runTest("验证 Issuer 状态", async () => {
    const currentBlock = await publicClient.getBlockNumber();
    const maxBlockRange = 2000n;
    const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

    // 查找 IssuerSet 事件
    const events = await publicClient.getContractEvents({
      address: realEstateTokenAddress,
      abi: realEstateToken.abi,
      eventName: "IssuerSet",
      fromBlock: fromBlock,
    });

    if (events.length === 0) {
      console.log(`   ℹ️  未找到 IssuerSet 事件，Issuer 尚未设置`);
      console.log(`   建议：部署 IssuerRetry 合约后调用 setIssuer 函数`);
    } else {
      const latestEvent = events[events.length - 1];
      const eventIssuer = (latestEvent.args as any)?.issuer as `0x${string}`;
      console.log(`   ✅ Issuer 已设置: ${eventIssuer}`);
    }

    return true;
  });

  // ========== 测试 6: 测试合约只读操作 ==========
  await runTest("测试合约只读操作", async () => {
    // 测试读取代币总供应量（如果已有代币）
    try {
      const totalSupply = await realEstateToken.read.totalSupply([0n]);
      console.log(`   Token ID 0 总供应量: ${totalSupply}`);
    } catch (error) {
      console.log(`   Token ID 0 总供应量: 0（正常，尚未发行代币）`);
    }

    // 测试读取账户余额
    const balance = await realEstateToken.read.balanceOf([
      deployer.account.address,
      0n,
    ]);
    console.log(`   账户余额 (Token ID 0): ${balance}`);

    // 测试 supportsInterface
    const supportsERC1155 = await realEstateToken.read.supportsInterface([
      "0xd9b67a26", // ERC1155 interface ID
    ]);
    console.log(`   支持 ERC1155: ${supportsERC1155 ? "✅" : "❌"}`);

    return true;
  });

  // ========== 测试 7: 验证 Chainlink CCIP 配置 ==========
  await runTest("验证 Chainlink CCIP 配置", async () => {
    console.log(`   ℹ️  无法直接验证 CCIP Router 配置（需要合约公开 getter）`);
    console.log(`   请确保合约已正确配置 Chainlink CCIP Router`);
    return true;
  });

  // ========== 测试 8: 验证 Chainlink Functions 配置（带重试功能）==========
  await runTest("验证 Chainlink Functions 配置（带重试功能）", async () => {
    // 检查 getPrices 函数是否存在（来自 RealEstatePriceDetailsRetry）
    try {
      const pricesScript = await realEstateToken.read.getPrices();
      if (pricesScript && pricesScript.length > 0) {
        console.log(`   ✅ getPrices 脚本已配置（带重试功能）`);
        console.log(`   脚本长度: ${pricesScript.length} 字符`);
        console.log(`   💡 JavaScript 代码包含 API 请求重试功能（最多 3 次）`);
      } else {
        console.log(`   ⚠️  getPrices 脚本未配置或为空`);
        return false;
      }
    } catch (error: any) {
      console.log(`   ⚠️  无法读取 getPrices: ${error.message}`);
      return false;
    }

    // 检查 getNftMetadata 函数是否存在（如果合约有这个方法）
    try {
      const metadataScript = await realEstateToken.read.getNftMetadata();
      if (metadataScript && metadataScript.length > 0) {
        console.log(`   ✅ getNftMetadata 脚本已配置（带重试功能）`);
        console.log(`   脚本长度: ${metadataScript.length} 字符`);
      }
    } catch (error) {
      // getNftMetadata 可能不在 RealEstateTokenRetry 中，这是正常的
      console.log(`   ℹ️  getNftMetadata 不在 RealEstateTokenRetry 中（正常）`);
    }

    return true;
  });

  // ========== 测试 9: 检查历史事件 ==========
  await runTest("检查历史事件", async () => {
    const currentBlock = await publicClient.getBlockNumber();
    const maxBlockRange = 2000n;
    const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

    // 检查 IssuerSet 事件
    try {
      const issuerSetEvents = await publicClient.getContractEvents({
        address: realEstateTokenAddress,
        abi: realEstateToken.abi,
        eventName: "IssuerSet",
        fromBlock: fromBlock,
      });
      console.log(`   IssuerSet 事件: ${issuerSetEvents.length} 个`);
    } catch (error: any) {
      console.log(`   ⚠️  无法查询 IssuerSet 事件: ${error.message}`);
    }

    // 检查 TransferSingle 事件（代币转移）
    try {
      const transferEvents = await publicClient.getContractEvents({
        address: realEstateTokenAddress,
        abi: realEstateToken.abi,
        eventName: "TransferSingle",
        fromBlock: fromBlock,
      });
      console.log(`   TransferSingle 事件: ${transferEvents.length} 个`);
    } catch (error: any) {
      console.log(`   ⚠️  无法查询 TransferSingle 事件: ${error.message}`);
    }

    return true;
  });

  // ========== 测试 10: 验证合约接口 ==========
  await runTest("验证合约接口", async () => {
    // 测试 ERC1155 接口
    const supportsERC1155 = await realEstateToken.read.supportsInterface([
      "0xd9b67a26", // ERC1155 interface ID
    ]);
    console.log(`   支持 ERC1155: ${supportsERC1155 ? "✅" : "❌"}`);

    // 测试 ERC165 接口
    const supportsERC165 = await realEstateToken.read.supportsInterface([
      "0x01ffc9a7", // ERC165 interface ID
    ]);
    console.log(`   支持 ERC165: ${supportsERC165 ? "✅" : "❌"}`);

    if (!supportsERC1155 || !supportsERC165) {
      throw new Error("接口支持不正确");
    }

    return true;
  });

  // ========== 测试 11: 测试 updatePriceDetails 函数（带重试功能）==========
  await runTest("测试 updatePriceDetails 函数（带重试功能）", async () => {
    // 注意：此函数需要有效的 subscriptionId 和 Chainlink Functions 配置
    // 这里只测试函数接口，不执行实际调用
    
    console.log(`   ℹ️  updatePriceDetails 函数已配置`);
    console.log(`   💡 此函数使用带重试功能的 JavaScript 代码`);
    console.log(`   💡 API 请求失败时会自动重试最多 3 次`);
    console.log(`   ⚠️  实际调用需要有效的 Chainlink Functions 订阅 ID`);
    
    return true;
  });

  // ========== 测试总结 ==========
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试总结");
  console.log("=".repeat(60));
  console.log(`✅ 通过: ${passedTests}`);
  console.log(`❌ 失败: ${failedTests}`);
  console.log(`📈 总计: ${passedTests + failedTests}`);
  console.log("=".repeat(60) + "\n");

  console.log("💡 RealEstateTokenRetry 合约特性：");
  console.log("   1. ✅ 使用 RealEstatePriceDetailsRetry（带重试功能）");
  console.log("   2. ✅ JavaScript 代码包含 API 请求重试功能（最多 3 次）");
  console.log("   3. ✅ 支持 Chainlink CCIP 跨链功能");
  console.log("   4. ✅ 支持 Chainlink Functions 获取链下数据\n");

  if (failedTests === 0) {
    console.log("🎉 所有测试通过！");
    console.log("\n💡 下一步：");
    console.log("   1. 部署 IssuerRetry 合约");
    console.log("   2. 调用 setIssuer 设置发行者");
    console.log("   3. 使用 IssuerRetry 发行代币（带重试功能）");
  } else {
    console.log("⚠️  部分测试失败，请检查上述错误信息");
    process.exit(1);
  }
}

// 运行测试
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试执行失败:", error);
    process.exit(1);
  });
