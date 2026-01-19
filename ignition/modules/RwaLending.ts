import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * RwaLending 部署模块
 * 部署到 Avalanche Fuji 测试网
 * 
 * 此模块会部署 RwaLending 合约，用于基于房地产代币的借贷功能
 * 
 * 部署前需要设置以下配置变量：
 * - AVALANCHE_FUJI_RPC_URL: Avalanche Fuji 测试网 RPC URL
 * - AVALANCHE_FUJI_PRIVATE_KEY: 部署账户的私钥
 * 
 * 部署命令：
 * npx hardhat ignition deploy ignition/modules/RwaLending.ts --network avalancheFuji
 * 
 * 注意：部署前请确保：
 * 1. RealEstateToken 已经部署
 * 2. 账户有足够的 AVAX 支付 gas 费用
 * 3. 所有地址都是正确的（请参考部署文档）
 * 4. 合约已通过编译（npx hardhat compile）
 * 
 * 参考文档：
 * - Chainlink Price Feeds: https://docs.chain.link/data-feeds/price-feeds/addresses
 */
export default buildModule("RwaLendingModule", (m) => {
  // 部署参数配置
  // 注意：这些地址需要根据实际的部署地址进行更新
  
  const realEstateTokenAddress = m.getParameter(
    "realEstateTokenAddress",
    "0x0000000000000000000000000000000000000000" // RealEstateToken 合约地址（必需）
    // 如果 RealEstateToken 还未部署，请先运行：
    // npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
  );

  const usdcAddress = m.getParameter(
    "usdcAddress",
    "0x5425890298aed601595a70AB815c96711a31Bc65" // Avalanche Fuji USDC 测试代币地址
    // 注意：这是测试网 USDC 代币地址，请验证是否为最新地址
  );

  const usdcUsdAggregatorAddress = m.getParameter(
    "usdcUsdAggregatorAddress",
    "0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad" // Avalanche Fuji USDC/USD 价格聚合器地址
    // 注意：请从 Chainlink 文档获取最新地址
    // https://docs.chain.link/data-feeds/price-feeds/addresses
  );

  const usdcUsdFeedHeartbeat = m.getParameter(
    "usdcUsdFeedHeartbeat",
    86400 // 价格源心跳时间（秒），默认 24 小时
    // 这是价格数据被认为有效的最大时间间隔
  );

  // 使用已部署的 RealEstateToken 合约
  const realEstateToken = m.contractAt("RealEstateToken", realEstateTokenAddress);

  // 部署 RwaLending 合约
  const rwaLending = m.contract("RwaLending", [
    realEstateToken, // RealEstateToken 合约地址
    usdcAddress, // USDC 代币地址
    usdcUsdAggregatorAddress, // USDC/USD 价格聚合器地址
    usdcUsdFeedHeartbeat, // 价格源心跳时间
  ]);

  return { rwaLending }; // 返回部署的合约实例
});
