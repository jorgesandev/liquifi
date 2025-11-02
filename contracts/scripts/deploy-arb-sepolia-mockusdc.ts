import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Arbitrum Sepolia L2 with MockUSDC (FOR DEMO)");
  console.log("Deployer:", deployer.address);
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

  // 2. Mint initial supply to deployer for testing
  console.log("\n2️⃣ Minting initial MockUSDC supply...");
  const initialSupply = ethers.parseUnits("5000000", 6); // 5M USDC para el deployer
  await mockUSDC.mint(deployer.address, initialSupply);
  console.log(`✅ Minted ${ethers.formatUnits(initialSupply, 6)} MockUSDC to deployer`);

  // 3. Deploy LiquiFiINFT
  console.log("\n3️⃣ Deploying LiquiFiINFT...");
  const LiquiFiINFT = await ethers.getContractFactory("LiquiFiINFT");
  const inft = await LiquiFiINFT.deploy(deployer.address);
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("✅ LiquiFiINFT deployed to:", inftAddress);

  // 4. Deploy LiquidityVault (ERC-4626) with MockUSDC
  console.log("\n4️⃣ Deploying LiquidityVault (ERC-4626) with MockUSDC...");
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
  const vault = await LiquidityVault.deploy(mockUSDCAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ LiquidityVault deployed to:", vaultAddress);
  console.log("   Asset: MockUSDC (", mockUSDCAddress, ")");

  // 5. Deploy LoanManager
  console.log("\n5️⃣ Deploying LoanManager...");
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

  // 6. Set LoanManager in Vault
  console.log("\n6️⃣ Configuring Vault...");
  const vaultContract = await ethers.getContractAt("LiquidityVault", vaultAddress);
  await vaultContract.setLoanManager(loanManagerAddress);
  console.log("✅ Vault configured with LoanManager");

  // 7. Add initial liquidity to vault using deposit() (creates shares properly)
  console.log("\n7️⃣ Adding initial liquidity to vault using deposit()...");
  const initialVaultLiquidity = ethers.parseUnits("1754456", 6); // 1,754,456 USDC - liquidez chingona!
  
  // Step 1: Mint MockUSDC to deployer
  await mockUSDC.mint(deployer.address, initialVaultLiquidity);
  console.log(`✅ Minted ${ethers.formatUnits(initialVaultLiquidity, 6)} MockUSDC to deployer`);
  
  // Step 2: Approve vault to spend MockUSDC
  await mockUSDC.approve(vaultAddress, initialVaultLiquidity);
  console.log(`✅ Approved vault to spend ${ethers.formatUnits(initialVaultLiquidity, 6)} MockUSDC`);
  
  // Step 3: Deposit to vault (this creates shares properly via ERC4626)
  const depositTx = await vaultContract.deposit(initialVaultLiquidity, deployer.address);
  await depositTx.wait();
  console.log(`✅ Deposited ${ethers.formatUnits(initialVaultLiquidity, 6)} MockUSDC to vault (created shares properly)`);
  
  // Verify shares were created
  const totalSupplyAfter = await vaultContract.totalSupply();
  const totalAssetsAfter = await vaultContract.totalAssets();
  console.log(`   Total Shares created: ${totalSupplyAfter.toString()}`);
  console.log(`   Total Assets in vault: ${ethers.formatUnits(totalAssetsAfter, 6)} USDC`);

  console.log("\n=== Deployment Summary (Arbitrum Sepolia L2 - MockUSDC) ===");
  console.log("MockUSDC (Asset):", mockUSDCAddress);
  console.log("LiquiFiINFT:", inftAddress);
  console.log("LiquidityVault:", vaultAddress);
  console.log("LoanManager:", loanManagerAddress);

  console.log("\n📝 Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log(`NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${loanManagerAddress}`);
  
  console.log("\n💡 Tips for Demo:");
  console.log("   - You can mint more MockUSDC using: mockUSDC.mint(address, amount)");
  console.log("   - Initial vault liquidity: 1,000 USDC");
  console.log("   - Deployer has 1,000,000 MockUSDC to distribute");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

