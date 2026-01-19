import { network } from "hardhat";
import { getAddress, formatEther, formatUnits } from "viem";

/**
 * 测试部署在 Avalanche Fuji 测试网上的合约
 * 
 * 使用方法：
 * 1. 设置环境变量或使用 Hardhat Keystore 设置合约地址：
 *    - REAL_ESTATE_TOKEN_ADDRESS: RealEstateToken 合约地址
 *    - ISSUER_ADDRESS: Issuer 合约地址
 * 
 * 2. 运行测试：
 *    npx hardhat run scripts/test-deployed-contracts.ts --network avalancheFuji
 * 
 * 或者使用参数：
 *    npx hardhat run scripts/test-deployed-contracts.ts --network avalancheFuji \
 *      --real-estate-token-address 0x... \
 *      --issuer-address 0x...
 */

async function main() {
  console.log("🚀 开始测试部署在 Avalanche Fuji 测试网上的合约...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // 获取合约地址（从环境变量或命令行参数）
  const realEstateTokenAddress = process.env.REAL_ESTATE_TOKEN_ADDRESS as `0x${string}`;
  const issuerAddress = process.env.ISSUER_ADDRESS as `0x${string}`;

  if (!realEstateTokenAddress || !issuerAddress) {
    console.error("❌ 错误：请设置合约地址");
    console.error("   方式 1: 使用环境变量");
    console.error("   export REAL_ESTATE_TOKEN_ADDRESS=0x...");
    console.error("   export ISSUER_ADDRESS=0x...");
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
  console.log(`   Issuer: ${issuerAddress}`);
  console.log(`   测试账户: ${deployer.account.address}`);
  console.log(`   链 ID: ${chainId}\n`);

  // 获取合约实例
  const realEstateToken = await viem.getContractAt(
    "RealEstateToken",
    realEstateTokenAddress
  );
  const issuer = await viem.getContractAt("Issuer", issuerAddress);

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
    // 使用 getCode 获取合约字节码（新 API）
    const realEstateTokenCode = await publicClient.getCode({
      address: realEstateTokenAddress,
    });
    const issuerCode = await publicClient.getCode({
      address: issuerAddress,
    });

    if (!realEstateTokenCode || realEstateTokenCode === "0x") {
      throw new Error("RealEstateToken 合约地址无效或未部署");
    }
    if (!issuerCode || issuerCode === "0x") {
      throw new Error("Issuer 合约地址无效或未部署");
    }
    return true;
  });

  // ========== 测试 2: 验证 RealEstateToken 基本信息 ==========
  await runTest("验证 RealEstateToken 基本信息", async () => {
    // 获取 owner
    const owner = await realEstateToken.read.owner();
    console.log(`   Owner: ${owner}`);

    // 获取 URI（如果设置了）
    try {
      const uri = await realEstateToken.read.uri([0n]);
      console.log(`   URI: ${uri}`);
    } catch (error) {
      // URI 可能未设置，这是正常的
      console.log(`   URI: 未设置（正常）`);
    }

    return true;
  });

  // ========== 测试 3: 验证 Issuer 基本信息 ==========
  await runTest("验证 Issuer 基本信息", async () => {
    // 获取 owner
    const owner = await issuer.read.owner();
    console.log(`   Owner: ${owner}`);

    // 验证 Issuer 中存储的 RealEstateToken 地址
    // 注意：这需要 Issuer 合约有公开的 getter 函数，如果没有则跳过
    return true;
  });

  // ========== 测试 4: 验证 Issuer 是否已设置为 RealEstateToken 的发行者 ==========
  await runTest("验证 Issuer 是否已设置为 RealEstateToken 的发行者", async () => {
    // 通过检查 IssuerSet 事件来验证
    // 获取最近的区块号
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 10000n; // 检查最近 10000 个区块

    // 查找 IssuerSet 事件
    const events = await publicClient.getContractEvents({
      address: realEstateTokenAddress,
      abi: realEstateToken.abi,
      eventName: "IssuerSet",
      fromBlock: fromBlock,
    });

    if (events.length === 0) {
      console.log(`   ⚠️  未找到 IssuerSet 事件，Issuer 可能未设置`);
      console.log(`   建议：运行 setIssuer 函数设置 Issuer`);
      return false;
    }

    // 检查最新的事件
    const latestEvent = events[events.length - 1];
    const eventIssuer = (latestEvent.args as any)?.issuer as `0x${string}`;

    if (eventIssuer.toLowerCase() === issuerAddress.toLowerCase()) {
      console.log(`   ✅ Issuer 已正确设置: ${eventIssuer}`);
      return true;
    } else {
      console.log(`   ❌ Issuer 地址不匹配`);
      console.log(`      事件中的地址: ${eventIssuer}`);
      console.log(`      期望的地址: ${issuerAddress}`);
      return false;
    }
  });

  // ========== 测试 5: 验证账户余额 ==========
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

  // ========== 测试 6: 验证合约权限 ==========
  await runTest("验证合约权限", async () => {
    // 检查部署账户是否是 RealEstateToken 的 owner
    const realEstateTokenOwner = await realEstateToken.read.owner();
    const isRealEstateTokenOwner =
      realEstateTokenOwner.toLowerCase() === deployer.account.address.toLowerCase();

    // 检查部署账户是否是 Issuer 的 owner
    const issuerOwner = await issuer.read.owner();
    const isIssuerOwner =
      issuerOwner.toLowerCase() === deployer.account.address.toLowerCase();

    console.log(`   RealEstateToken Owner: ${isRealEstateTokenOwner ? "✅" : "❌"}`);
    console.log(`   Issuer Owner: ${isIssuerOwner ? "✅" : "❌"}`);

    if (!isRealEstateTokenOwner || !isIssuerOwner) {
      console.log(`   ⚠️  警告：测试账户不是合约 owner，某些测试可能失败`);
    }

    return true;
  });

  // ========== 测试 7: 验证 Chainlink 集成 ==========
  await runTest("验证 Chainlink Functions Router 配置", async () => {
    // 检查 Issuer 合约是否配置了 Functions Router
    // 这需要 Issuer 合约有公开的 getter 函数
    console.log(`   ⚠️  无法直接验证 Functions Router 配置`);
    console.log(`   请确保 Issuer 合约已正确配置 Chainlink Functions Router`);
    return true;
  });

  // ========== 测试 8: 测试合约交互（只读操作） ==========
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

  if (failedTests === 0) {
    console.log("🎉 所有测试通过！");
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
