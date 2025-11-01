import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load .env file from contracts directory
dotenv.config({ path: __dirname + "/.env" });

const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

if (!ALCHEMY_API_URL) {
  throw new Error("Please set ALCHEMY_API_URL in contracts/.env");
}

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error("Please set DEPLOYER_PRIVATE_KEY in contracts/.env");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arbitrumSepolia: {
      url: ALCHEMY_API_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 421614,
    },
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

