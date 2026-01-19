import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Issuer 基础版本部署模块
 * 部署到 Avalanche Fuji 测试网
 * 
 * 此模块会：
 * 1. 部署 Issuer 合约（基础版本，无重试功能）
 * 2. 设置 RealEstateToken 的 Issuer
 * 
 * 部署前需要设置以下配置变量：
 * - AVALANCHE_FUJI_RPC_URL: Avalanche Fuji 测试网 RPC URL
 * - AVALANCHE_FUJI_PRIVATE_KEY: 部署账户的私钥
 * 
 * 部署命令：
 * npx hardhat ignition deploy ignition/modules/IssuerBasic.ts --network avalancheFuji
 * 
 * 注意：部署前请确保：
 * 1. RealEstateToken 已经部署（或使用 realEstateTokenAddress 参数）
 * 2. 账户有足够的 AVAX 支付 gas 费用
 * 3. 所有 Chainlink 地址都是正确的
 * 4. 合约已通过编译（npx hardhat compile）
 * 
 * 参考文档：
 * - Functions 地址: https://docs.chain.link/chainlink-functions/supported-networks
 */
export default buildModule("IssuerBasicModule", (m) => {
  // 部署参数配置
  const realEstateTokenAddress = m.getParameter(
    "realEstateTokenAddress",
    "0x13264FE25550C54e045728BC8a4cc0b2de322395" // 默认值（必须替换为实际地址）
  );
  
  const functionsRouterAddress = m.getParameter(
    "functionsRouterAddress",
    "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0" // Avalanche Fuji Functions Router 地址
  );

  // 使用已部署的 RealEstateToken 合约
  const realEstateToken = m.contractAt("RealEstateToken", realEstateTokenAddress);

  // 部署 Issuer 基础版本合约
  const issuer = m.contract("Issuer", [
    realEstateToken, // RealEstateToken 合约地址
    functionsRouterAddress, // Functions Router 地址
  ], {
    id: "IssuerBasic", // 使用不同的 ID 避免冲突
  });

  // 设置 Issuer 为 RealEstateToken 的发行者
  // 注意：这需要 RealEstateToken 的 owner 权限
  m.call(realEstateToken, "setIssuer", [issuer], {
    id: "setIssuerBasic", // 操作 ID
  });

  return { issuer }; // 返回部署的合约实例
});
