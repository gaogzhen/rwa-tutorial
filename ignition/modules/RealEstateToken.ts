import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * RealEstateToken 部署模块
 * 部署到 Avalanche Fuji 测试网
 * 
 * 部署前需要设置以下配置变量：
 * - AVALANCHE_FUJI_RPC_URL: Avalanche Fuji 测试网 RPC URL（可选，有默认值）
 * - AVALANCHE_FUJI_PRIVATE_KEY: 部署账户的私钥
 * 
 * 部署命令：
 * npx hardhat ignition deploy ignition/modules/RealEstateToken.ts --network avalancheFuji
 * 
 * 注意：部署前请确保：
 * 1. 账户有足够的 AVAX 支付 gas 费用
 * 2. 所有 Chainlink 地址都是正确的（请参考 DEPLOY_FUJI.md）
 * 3. 合约已通过编译（npx hardhat compile）
 * 
 * 参考文档：
 * - CCIP 地址: https://docs.chain.link/ccip/supported-networks
 * - Functions 地址: https://docs.chain.link/chainlink-functions/supported-networks
 */
export default buildModule("RealEstateTokenModule", (m) => {
  // 部署参数配置
  // 注意：这些地址需要根据实际的 Chainlink 部署地址进行更新
  const baseURI = m.getParameter("baseURI", ""); // 基础 URI，用于代币元数据
  const ccipRouterAddress = m.getParameter(
    "ccipRouterAddress",
    "0xF694E193200268f9a4868e4Aa017A0118C9a8177" // Avalanche Fuji CCIP Router 地址（需要验证）
  );
  const linkTokenAddress = m.getParameter(
    "linkTokenAddress",
    "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846" // Avalanche Fuji Link Token 地址
  );
  const currentChainSelector = m.getParameter(
    "currentChainSelector",
    14767482510784806043n // Avalanche Fuji 链选择器
  );
  const functionsRouterAddress = m.getParameter(
    "functionsRouterAddress",
    "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0" // Avalanche Fuji Functions Router 地址
  );

  // 部署 RealEstateToken 合约
  const realEstateToken = m.contract("RealEstateToken", [
    baseURI, // 基础 URI
    ccipRouterAddress, // CCIP Router 地址
    linkTokenAddress, // Link Token 地址
    currentChainSelector, // 当前链选择器
    functionsRouterAddress, // Functions Router 地址
  ]);

  return { realEstateToken }; // 返回部署的合约实例
});
