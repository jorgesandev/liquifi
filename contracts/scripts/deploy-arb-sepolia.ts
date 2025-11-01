import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Arbitrum Sepolia L2 with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Optional: Get ENS registrar address for cross-chain integration
  const ENS_REGISTRAR_SEPOLIA = process.env.NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA || ethers.ZeroAddress;

  // 1. Deploy MockUSDC
  console.log("\n1️⃣ Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // 2. Deploy LiquiFiINFT
  console.log("\n2️⃣ Deploying LiquiFiINFT...");
  const LiquiFiINFT = await ethers.getContractFactory("LiquiFiINFT");
  const inft = await LiquiFiINFT.deploy(deployer.address);
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("✅ LiquiFiINFT deployed to:", inftAddress);

  // 3. Deploy LiquidityVault (ERC-4626)
  console.log("\n3️⃣ Deploying LiquidityVault (ERC-4626)...");
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
  const vault = await LiquidityVault.deploy(mockUSDCAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ LiquidityVault deployed to:", vaultAddress);

  // 4. Deploy LoanManager
  console.log("\n4️⃣ Deploying LoanManager...");
  const LoanManager = await ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    vaultAddress,
    inftAddress,
    mockUSDCAddress,
    ENS_REGISTRAR_SEPOLIA,
    deployer.address
  );
  await loanManager.waitForDeployment();
  const loanManagerAddress = await loanManager.getAddress();
  console.log("✅ LoanManager deployed to:", loanManagerAddress);

  // 5. Set LoanManager in Vault
  console.log("\n5️⃣ Configuring Vault...");
  const vaultContract = await ethers.getContractAt("LiquidityVault", vaultAddress);
  await vaultContract.setLoanManager(loanManagerAddress);
  console.log("✅ Vault configured with LoanManager");

  // 6. Mint initial MockUSDC to vault for testing (optional)
  console.log("\n6️⃣ Minting test tokens...");
  const usdcContract = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
  await usdcContract.mint(deployer.address, mintAmount);
  console.log("✅ Minted 1M mUSDC to deployer");

  console.log("\n=== Deployment Summary (Arbitrum Sepolia L2) ===");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("LiquiFiINFT:", inftAddress);
  console.log("LiquidityVault:", vaultAddress);
  console.log("LoanManager:", loanManagerAddress);

  console.log("\n📝 Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log(`NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${loanManagerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

