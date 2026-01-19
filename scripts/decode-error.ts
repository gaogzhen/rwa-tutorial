import { network } from "hardhat";

/**
 * 解码错误签名
 * 
 * 使用方法：
 * 1. 设置错误签名：
 *    export ERROR_SIGNATURE=0x1d70f87a
 * 
 * 2. 运行脚本：
 *    npx hardhat run scripts/decode-error.ts --network avalancheFuji
 * 
 * 或者直接查询 4byte API
 */

async function main() {
  const errorSignature = (process.env.ERROR_SIGNATURE as `0x${string}`) || "0x1d70f87a";

  console.log("🔍 解码错误签名...\n");
  console.log(`错误签名: ${errorSignature}\n`);

  try {
    // 查询 4byte API
    const response = await fetch(
      `https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=${errorSignature}&event=${errorSignature}&filter=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();

    if (data && data.ok && data.result) {
      console.log("✅ 查询成功！\n");

      // 显示函数错误
      if (data.result.function && data.result.function[errorSignature]) {
        console.log("📋 函数/错误信息：");
        data.result.function[errorSignature].forEach((item: any) => {
          console.log(`   名称: ${item.name}`);
          console.log(`   已验证合约: ${item.hasVerifiedContract ? "是" : "否"}`);
          console.log("");
        });
      }

      // 显示事件
      if (data.result.event && data.result.event[errorSignature]) {
        console.log("📋 事件信息：");
        data.result.event[errorSignature].forEach((item: any) => {
          console.log(`   名称: ${item.name}`);
          console.log("");
        });
      }

      // 提供解决方案
      const errorName = data.result.function?.[errorSignature]?.[0]?.name;
      if (errorName) {
        console.log("💡 解决方案：\n");

        if (errorName.includes("GasLimitTooBig")) {
          console.log("   错误: Gas Limit 超过了允许的最大值");
          console.log("   解决: 降低 gasLimit 到 250,000 或更低");
          console.log("   建议: 在 config/test-issuer.config.json 中设置");
          console.log("         \"gasLimit\": 250000");
        } else if (errorName.includes("LatestIssueInProcess")) {
          console.log("   错误: 已有正在处理的请求");
          console.log("   解决: 调用 cancelPendingRequest() 取消待处理的请求");
          console.log("   命令: npx hardhat run scripts/cancel-pending-request.ts --network avalancheFuji");
        } else {
          console.log(`   错误类型: ${errorName}`);
          console.log("   请查看 Chainlink Functions 文档获取更多信息");
        }
      }
    } else {
      console.log("⚠️  未找到匹配的错误信息");
      console.log("   可能的原因：");
      console.log("   1. 错误签名不正确");
      console.log("   2. 这是自定义错误，未在 4byte 数据库中注册");
    }
  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
    console.log("\n💡 可以手动查询：");
    console.log(`   https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=${errorSignature}&event=${errorSignature}&filter=false`);
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
