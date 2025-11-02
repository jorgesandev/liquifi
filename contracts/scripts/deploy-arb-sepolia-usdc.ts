import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

// USDC real en Arbitrum Sepolia (bridged USDC)
// Dirección correcta del usuario: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
const ARB_SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Arbitrum Sepolia L2 with USDC REAL");
  console.log("Deployer:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Optional: Get ENS registrar address for cross-chain integration
  const ENS_REGISTRAR_SEPOLIA = process.env.NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA || ethers.ZeroAddress;

  console.log("\n📋 Using REAL USDC from Arbitrum Sepolia:");
  console.log("   USDC Address:", ARB_SEPOLIA_USDC);

  // Verify USDC contract exists
  try {
    // Get proper checksum address
    const usdcAddress = ethers.getAddress(ARB_SEPOLIA_USDC);
    console.log(`   Using checksum address: ${usdcAddress}`);
    
    const usdcContract = await ethers.getContractAt(
      ["function symbol() external view returns (string)", "function decimals() external view returns (uint8)"],
      usdcAddress
    );
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    console.log(`   ✅ Verified: ${symbol} (${decimals} decimals)`);
  } catch (error) {
    console.warn("   ⚠️  Could not verify USDC contract, but continuing deployment...");
    console.warn("   This might be because USDC contract uses a different interface.");
    // Don't throw, continue with deployment
  }

  // 1. Deploy LiquiFiINFT
  console.log("\n1️⃣ Deploying LiquiFiINFT...");
  const LiquiFiINFT = await ethers.getContractFactory("LiquiFiINFT");
  const inft = await LiquiFiINFT.deploy(deployer.address);
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("✅ LiquiFiINFT deployed to:", inftAddress);

  // 2. Deploy LiquidityVault (ERC-4626) with REAL USDC
  console.log("\n2️⃣ Deploying LiquidityVault (ERC-4626) with REAL USDC...");
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
  const usdcAddress = ethers.getAddress(ARB_SEPOLIA_USDC);
  const vault = await LiquidityVault.deploy(usdcAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ LiquidityVault deployed to:", vaultAddress);
  console.log("   Asset: REAL USDC (", ARB_SEPOLIA_USDC, ")");

  // 3. Deploy LoanManager
  console.log("\n3️⃣ Deploying LoanManager...");
  const LoanManager = await ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    vaultAddress,
    inftAddress,
    usdcAddress,
    ENS_REGISTRAR_SEPOLIA,
    deployer.address
  );
  await loanManager.waitForDeployment();
  const loanManagerAddress = await loanManager.getAddress();
  console.log("✅ LoanManager deployed to:", loanManagerAddress);

  // 4. Set LoanManager in Vault
  console.log("\n4️⃣ Configuring Vault...");
  const vaultContract = await ethers.getContractAt("LiquidityVault", vaultAddress);
  await vaultContract.setLoanManager(loanManagerAddress);
  console.log("✅ Vault configured with LoanManager");

  console.log("\n=== Deployment Summary (Arbitrum Sepolia L2 - REAL USDC) ===");
  console.log("REAL USDC (Asset):", usdcAddress);
  console.log("LiquiFiINFT:", inftAddress);
  console.log("LiquidityVault:", vaultAddress);
  console.log("LoanManager:", loanManagerAddress);

  console.log("\n📝 Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_MOCK_USDC_ADDRESS=${usdcAddress}`);
  console.log(`NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${loanManagerAddress}`);
  
  console.log("\n💡 Note: NEXT_PUBLIC_MOCK_USDC_ADDRESS now points to REAL USDC!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

