/**
 * 测试 API 请求（独立 Node.js 脚本）
 * 
 * 使用方法：
 * node scripts/test-api-request.js
 * 
 * 此脚本直接测试 API 请求，不依赖 Hardhat
 * 注意：需要 Node.js 18+ 支持 fetch API
 */

async function testApiRequest() {
  console.log("🧪 测试 API 请求...\n");

  const apiUrl = "https://api.bridgedataoutput.com/api/v2/OData/test/Property('P_69179ef9b7bb783d6039ab66')?access_token=6baca547742c6f96a6ff71b138424f21";

  console.log("📋 API URL:");
  console.log(apiUrl);
  console.log("\n");

  try {
    const response = await fetch(apiUrl);
    
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    console.log(`📋 响应头:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    
    console.log("\n✅ API 请求成功！\n");
    console.log("📦 响应数据：");
    console.log(JSON.stringify(jsonData, null, 2));

    // 检查所需字段
    if (jsonData && jsonData.UnparsedAddress) {
      console.log("\n✅ 数据字段检查：");
      console.log(`   UnparsedAddress: ${jsonData.UnparsedAddress || 'N/A'}`);
      console.log(`   YearBuilt: ${jsonData.YearBuilt || 'N/A'}`);
      console.log(`   LotSizeSquareFeet: ${jsonData.LotSizeSquareFeet || 'N/A'}`);
      console.log(`   LivingArea: ${jsonData.LivingArea || 'N/A'}`);
      console.log(`   BedroomsTotal: ${jsonData.BedroomsTotal || 'N/A'}`);
      
      return jsonData;
    } else {
      console.log("\n⚠️  警告：响应数据格式可能不符合预期");
      console.log("   期望的数据结构：{ UnparsedAddress, YearBuilt, ... }");
      if (jsonData && typeof jsonData === 'object') {
        console.log("   实际数据结构：", Object.keys(jsonData));
      } else {
        console.log("   实际数据类型：", typeof jsonData);
      }
      return jsonData;
    }
  } catch (error) {
    console.error("\n❌ API 请求失败:", error.message);
    throw error;
  }
}

// 运行测试
testApiRequest()
  .then(() => {
    console.log("\n✅ API 测试完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ API 测试失败:", error);
    process.exit(1);
  });
