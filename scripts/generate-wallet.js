/**
 * Script to generate a new wallet for contract deployment (TESTNET ONLY)
 * 
 * ⚠️ WARNING: This generates a private key. 
 * - Only use on testnets (Sepolia, Arbitrum Sepolia)
 * - NEVER use for mainnet
 * - NEVER commit the private key to git
 * - Store it securely in .env.local (which is in .gitignore)
 */

const { ethers } = require("ethers");

async function main() {
  console.log("🔐 Generating new wallet for testnet deployment...\n");
  
  // Generate a random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ Wallet Generated Successfully!\n");
  console.log("📋 Add this to your .env.local:\n");
  console.log(`DEPLOYER_PRIVATE_KEY=${wallet.privateKey}\n`);
  console.log("📍 Wallet Address:", wallet.address);
  console.log("\n⚠️  IMPORTANT:");
  console.log("1. Fund this wallet with testnet ETH (Sepolia and Arbitrum Sepolia)");
  console.log("2. Never commit this private key to git");
  console.log("3. Only use on testnets");
  console.log("\n💧 Get testnet ETH from:");
  console.log("- Sepolia: https://sepoliafaucet.com/");
  console.log("- Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

