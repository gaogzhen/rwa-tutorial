import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * IssuerRetry 部署模块（带重试功能）
 * 部署到 Avalanche Fuji 测试网
 * 
 * 此模块会：
 * 1. 部署 IssuerRetry 合约（带重试功能版本）
 * 2. 设置 RealEstateTokenRetry 的 Issuer
 * 
 * 部署前需要设置以下配置变量：
 * - AVALANCHE_FUJI_RPC_URL: Avalanche Fuji 测试网 RPC URL
 * - AVALANCHE_FUJI_PRIVATE_KEY: 部署账户的私钥
 * 
 * 部署命令：
 * npx hardhat ignition deploy ignition/modules/IssuerRetry.ts --network avalancheFuji
 * 
 * 注意：部署前请确保：
 * 1. RealEstateTokenRetry 已经部署（或使用 realEstateTokenRetryAddress 参数）
 * 2. 账户有足够的 AVAX 支付 gas 费用
 * 3. 所有 Chainlink 地址都是正确的
 * 4. 合约已通过编译（npx hardhat compile）
 * 
 * 参考文档：
 * - Functions 地址: https://docs.chain.link/chainlink-functions/supported-networks
 */
export default buildModule("IssuerRetryModule", (m) => {
  // 部署参数配置
  const realEstateTokenRetryAddress = m.getParameter(
    "realEstateTokenRetryAddress",
    "0x4D7e17b8f5ad3417561B04083383134A1EC4aF77" // 默认值（必须替换为实际地址）
  );
  
  const functionsRouterAddress = m.getParameter(
    "functionsRouterAddress",
    "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0" // Avalanche Fuji Functions Router 地址
  );

  // 使用已部署的 RealEstateTokenRetry 合约
  const realEstateTokenRetry = m.contractAt("RealEstateTokenRetry", realEstateTokenRetryAddress);

  // 部署 IssuerRetry 合约（带重试功能）
  const issuerRetry = m.contract("IssuerRetry", [
    realEstateTokenRetry, // RealEstateTokenRetry 合约地址
    functionsRouterAddress, // Functions Router 地址
  ]);

  // 设置 IssuerRetry 为 realEstateTokenRetry 的发行者
  // 注意：这需要 realEstateTokenRetry 的 owner 权限
  m.call(realEstateTokenRetry, "setIssuer", [issuerRetry], {
    id: "setIssuerRetry", // 操作 ID
  });

  return { issuerRetry }; // 返回部署的合约实例
});
