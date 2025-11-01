import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy LiquiFiINFT
  const LiquiFiINFT = await ethers.getContractFactory("LiquiFiINFT");
  const inft = await LiquiFiINFT.deploy(deployer.address);
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("LiquiFiINFT deployed to:", inftAddress);

  // Deploy LiquiFiVault
  const LiquiFiVault = await ethers.getContractFactory("LiquiFiVault");
  const vault = await LiquiFiVault.deploy(inftAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("LiquiFiVault deployed to:", vaultAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("INFT Contract:", inftAddress);
  console.log("Vault Contract:", vaultAddress);
  console.log("\nAdd these to your .env.local:");
  console.log(`NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

