import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load .env file from contracts directory
dotenv.config({ path: __dirname + "/.env" });

const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const alchemyPolicyId = process.env.ALCHEMY_POLICY_ID;
const alchemySepoliaApiKey = process.env.ALCHEMY_SEPOLIA_API_KEY;
const alchemyMainnetApiKey = process.env.ALCHEMY_MAINNET_API_KEY;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

// Construct Alchemy RPC URLs (required only for deployment, not compilation)
const ALCHEMY_ARB_SEPOLIA_URL = alchemyApiKey
  ? alchemyPolicyId
    ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
    : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
  : "https://arb-sepolia.g.alchemy.com/v2/dummy";

const ALCHEMY_SEPOLIA_URL = alchemySepoliaApiKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemySepoliaApiKey}`
  : "https://eth-sepolia.g.alchemy.com/v2/dummy";

const ALCHEMY_MAINNET_URL = alchemyMainnetApiKey
  ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyMainnetApiKey}`
  : "https://eth-mainnet.g.alchemy.com/v2/dummy";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 11155111,
    },
    arbitrumSepolia: {
      url: ALCHEMY_ARB_SEPOLIA_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 421614,
    },
    mainnet: {
      url: ALCHEMY_MAINNET_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 1,
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

