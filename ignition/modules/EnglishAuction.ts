import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * EnglishAuction 部署模块
 * 部署到 Avalanche Fuji 测试网
 * 
 * 此模块会部署 EnglishAuction 合约，用于房地产代币的英式拍卖
 * 
 * 部署前需要设置以下配置变量：
 * - AVALANCHE_FUJI_RPC_URL: Avalanche Fuji 测试网 RPC URL
 * - AVALANCHE_FUJI_PRIVATE_KEY: 部署账户的私钥
 * 
 * 部署命令：
 * npx hardhat ignition deploy ignition/modules/EnglishAuction.ts --network avalancheFuji
 * 
 * 注意：部署前请确保：
 * 1. RealEstateToken 已经部署
 * 2. 账户有足够的 AVAX 支付 gas 费用
 * 3. 合约已通过编译（npx hardhat compile）
 */
export default buildModule("EnglishAuctionModule", (m) => {
  // 部署参数配置
  // 注意：realEstateTokenAddress 是必需参数，必须提供已部署的 RealEstateToken 地址
  // 如果还未部署 RealEstateToken，请先运行：
  // npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
  const realEstateTokenAddress = m.getParameter(
    "realEstateTokenAddress",
    "0x0000000000000000000000000000000000000000" // 默认值（必须替换为实际地址）
  );

  // 使用已部署的 RealEstateToken 合约
  const realEstateToken = m.contractAt("RealEstateToken", realEstateTokenAddress);

  // 部署 EnglishAuction 合约
  // 注意：部署账户会自动成为 seller（卖家）
  const englishAuction = m.contract("EnglishAuction", [
    realEstateToken, // RealEstateToken 合约地址
  ]);

  return { englishAuction }; // 返回部署的合约实例
});
