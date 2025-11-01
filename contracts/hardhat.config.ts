import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load .env file from contracts directory
dotenv.config({ path: __dirname + "/.env" });

const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const alchemyPolicyId = process.env.ALCHEMY_POLICY_ID;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

if (!alchemyApiKey) {
  throw new Error("Please set ALCHEMY_API_KEY in contracts/.env");
}

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error("Please set DEPLOYER_PRIVATE_KEY in contracts/.env");
}

// Construct Alchemy RPC URL
const ALCHEMY_API_URL = alchemyPolicyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

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

