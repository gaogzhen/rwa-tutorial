import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.20", // Solidity 版本
        settings: {
          optimizer: {
            enabled: true, // 启用优化器以减小合约大小
            runs: 200, // 优化运行次数（平衡代码大小和 gas 成本）
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"), // Sepolia RPC URL（需要设置，例如：https://sepolia.infura.io/v3/YOUR_API_KEY）
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")], // Sepolia 部署账户私钥
    },
    avalancheFuji: {
      type: "http",
      chainType: "l1",
      url: configVariable("AVALANCHE_FUJI_RPC_URL"), // Avalanche Fuji RPC URL
      accounts: [configVariable("AVALANCHE_FUJI_PRIVATE_KEY")], // 部署账户私钥
      chainId: 43113, // Avalanche Fuji 测试网链 ID
    },
  },
});
