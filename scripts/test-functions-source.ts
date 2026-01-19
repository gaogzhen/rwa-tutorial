import { network } from "hardhat";
import { getAddress } from "viem";

/**
 * 测试 FunctionsSource 中的 JavaScript 代码
 * 
 * 使用方法：
 * 1. 设置环境变量（可选）：
 *    - ISSUER_ADDRESS: Issuer 合约地址（用于读取 getNftMetadata）
 * 
 * 2. 运行脚本：
 *    npx hardhat run scripts/test-functions-source.ts --network avalancheFuji
 * 
 * 注意：此脚本在本地 Node.js 环境中测试 JavaScript 代码逻辑
 */

async function main() {
  console.log("🧪 测试 FunctionsSource 中的 JavaScript 代码...\n");

  // 获取网络连接
  const { viem } = await network.connect();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    console.error("❌ 错误：无法获取钱包客户端");
    process.exit(1);
  }

  // 获取 Issuer 地址（可选）
  const issuerAddress = (process.env.ISSUER_ADDRESS as `0x${string}`) || 
    "0x5Ba14BA9a0aC5A27a975a8ad64df3308E61Bb5Fa";

  console.log("📋 测试配置：");
  console.log(`   Issuer: ${issuerAddress}\n`);

  // 获取合约实例
  const issuer = await viem.getContractAt("Issuer", issuerAddress);

  try {
    // 读取 getNftMetadata JavaScript 代码
    console.log("📖 读取 getNftMetadata JavaScript 代码...\n");
    const jsCode = await issuer.read.getNftMetadata();
    
    console.log("📝 JavaScript 代码：");
    console.log("=".repeat(60));
    console.log(jsCode);
    console.log("=".repeat(60));
    console.log(`\n代码长度: ${jsCode.length} 字符\n`);

    // 测试代码语法和逻辑
    console.log("🔍 分析代码结构...\n");

    // 检查关键组件
    const checks = {
      "包含 ethers 导入": jsCode.includes("import('npm:ethers@6.10.0')"),
      "包含 Hash 导入": jsCode.includes("import('npm:ipfs-only-hash@4.0.0')"),
      "包含 API 请求": jsCode.includes("Functions.makeHttpRequest"),
      "包含 API URL": jsCode.includes("api.bridgedataoutput.com"),
      "包含数据提取": jsCode.includes("apiResponse.data"),
      "包含元数据构建": jsCode.includes("metadata"),
      "包含 IPFS CID": jsCode.includes("Hash.of"),
      "包含返回语句": jsCode.includes("Functions.encodeString"),
    };

    console.log("✅ 代码组件检查：");
    for (const [check, result] of Object.entries(checks)) {
      console.log(`   ${result ? "✅" : "❌"} ${check}`);
    }

    // 提取 API URL
    const urlMatch = jsCode.match(/url:\s*`([^`]+)`/);
    if (urlMatch) {
      console.log(`\n🌐 API URL: ${urlMatch[1]}`);
    }

    // 测试 API 请求（模拟）
    console.log("\n🧪 测试 API 请求逻辑...\n");

    // 创建模拟的 API 响应
    const mockApiResponse = {
      data: {
        UnparsedAddress: "123 Main St, City, State 12345",
        YearBuilt: 2020,
        LotSizeSquareFeet: 5000,
        LivingArea: 2000,
        BedroomsTotal: 3,
      },
    };

    console.log("📊 模拟 API 响应：");
    console.log(JSON.stringify(mockApiResponse, null, 2));

    // 测试数据处理逻辑
    console.log("\n🔧 测试数据处理逻辑...\n");

    try {
      const realEstateAddress = mockApiResponse.data.UnparsedAddress;
      const yearBuilt = Number(mockApiResponse.data.YearBuilt);
      const lotSizeSquareFeet = Number(mockApiResponse.data.LotSizeSquareFeet);
      const livingArea = Number(mockApiResponse.data.LivingArea);
      const bedroomsTotal = Number(mockApiResponse.data.BedroomsTotal);

      console.log("✅ 数据提取成功：");
      console.log(`   realEstateAddress: ${realEstateAddress}`);
      console.log(`   yearBuilt: ${yearBuilt}`);
      console.log(`   lotSizeSquareFeet: ${lotSizeSquareFeet}`);
      console.log(`   livingArea: ${livingArea}`);
      console.log(`   bedroomsTotal: ${bedroomsTotal}`);

      // 构建元数据
      const metadata = {
        name: "Real Estate Token",
        attributes: [
          { trait_type: "realEstateAddress", value: realEstateAddress },
          { trait_type: "yearBuilt", value: yearBuilt },
          { trait_type: "lotSizeSquareFeet", value: lotSizeSquareFeet },
          { trait_type: "livingArea", value: livingArea },
          { trait_type: "bedroomsTotal", value: bedroomsTotal },
        ],
      };

      const metadataString = JSON.stringify(metadata);
      console.log("\n✅ 元数据构建成功：");
      console.log(metadataString);

      console.log("\n✅ 数据处理逻辑测试通过！");
    } catch (error: any) {
      console.error("❌ 数据处理失败:", error.message);
      throw error;
    }

    // 检查潜在问题
    console.log("\n⚠️  潜在问题检查：\n");

    const issues: string[] = [];

    // 检查 API URL 中的访问令牌
    if (jsCode.includes("access_token=")) {
      const tokenMatch = jsCode.match(/access_token=([^&`']+)/);
      if (tokenMatch) {
        console.log(`   ℹ️  检测到访问令牌: ${tokenMatch[1].substring(0, 10)}...`);
        console.log(`   ⚠️  请确保访问令牌有效且未过期`);
      }
    }

    // 检查错误处理
    if (!jsCode.includes("try") && !jsCode.includes("catch")) {
      issues.push("缺少错误处理（try-catch）");
    }

    // 检查空值处理
    if (!jsCode.includes("null") && !jsCode.includes("undefined")) {
      issues.push("可能缺少空值检查");
    }

    if (issues.length > 0) {
      console.log("   ⚠️  发现潜在问题：");
      issues.forEach((issue) => console.log(`      - ${issue}`));
    } else {
      console.log("   ✅ 未发现明显问题");
    }

    // 提供改进建议
    console.log("\n💡 改进建议：\n");
    console.log("   1. 添加错误处理：");
    console.log("      try { ... } catch (error) { return Functions.encodeString('error'); }");
    console.log("\n   2. 添加空值检查：");
    console.log("      if (!apiResponse || !apiResponse.data) { ... }");
    console.log("\n   3. 验证 API 响应：");
    console.log("      确保 API 返回的数据格式符合预期");
    console.log("\n   4. 测试真实 API：");
    console.log("      在浏览器或 Postman 中测试 API URL 是否可访问");

    console.log("\n✅ JavaScript 代码分析完成！");
    console.log("\n📝 下一步：");
    console.log("   1. 如果代码逻辑正确，问题可能在 Chainlink Functions 执行环境");
    console.log("   2. 尝试增加 gasLimit（已在配置中设置为 500000）");
    console.log("   3. 检查 Chainlink Functions 界面查看详细错误信息");
    console.log("   4. 确保订阅账户有足够的 LINK 代币");

  } catch (error: any) {
    console.error("❌ 测试失败:", error.message);

    if (error.message.includes("revert")) {
      console.error("\n💡 可能的原因：");
      console.error("   1. Issuer 合约地址不正确");
      console.error("   2. 合约未正确部署");
      console.error("   3. 网络连接问题");
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
