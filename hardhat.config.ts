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
      accounts: [
        // 私钥格式要求：
        // - 必须是 0x 开头的 66 字符十六进制字符串
        // - 或者 64 字符十六进制字符串（会自动添加 0x）
        // 使用 Hardhat Keystore 设置：npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
        // 注意：私钥必须存储在 Keystore 或环境变量中，格式正确
        configVariable("AVALANCHE_FUJI_PRIVATE_KEY"),
      ],
      chainId: 43113, // Avalanche Fuji 测试网链 ID
    },
  },
});
