import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

// Known ENS contract addresses on Mainnet
const ENS_REGISTRY_MAINNET = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const NAME_WRAPPER_MAINNET = "0x0635513f179D50A207757E05759CbD106d7dFcE8";
// Public Resolver address (correct)
const PUBLIC_RESOLVER_MAINNET = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Ethereum Mainnet with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Get configuration from environment or use defaults
  const ENS_REGISTRY = process.env.ENS_REGISTRY_MAINNET || ENS_REGISTRY_MAINNET;
  const NAME_WRAPPER = process.env.NAME_WRAPPER_MAINNET || NAME_WRAPPER_MAINNET;
  const PUBLIC_RESOLVER = process.env.PUBLIC_RESOLVER_MAINNET || PUBLIC_RESOLVER_MAINNET;
  const PARENT_NAME = process.env.ENS_PARENT_NAME || "liquifidev.eth";
  const PARENT_NODE = process.env.ENS_PARENT_NODE;

  if (!PARENT_NODE) {
    throw new Error("Missing ENS_PARENT_NODE in contracts/.env. Run 'npm run calculate-namehash' first.");
  }

  console.log("\n📋 ENS Configuration:");
  console.log("Registry:", ENS_REGISTRY);
  console.log("NameWrapper:", NAME_WRAPPER);
  console.log("Resolver:", PUBLIC_RESOLVER);
  console.log("Parent Name:", PARENT_NAME);
  console.log("Parent Node:", PARENT_NODE);

  // Verify parent domain is wrapped (non-blocking check)
  console.log("\n🔍 Verifying parent domain is wrapped...");
  try {
    const nameWrapper = await ethers.getContractAt(
      ["function ownerOf(uint256 tokenId) external view returns (address)"],
      NAME_WRAPPER
    );
    const parentTokenId = BigInt(PARENT_NODE);
    const parentOwner = await nameWrapper.ownerOf(parentTokenId);
    console.log("✅ Parent domain owner (NameWrapper):", parentOwner);
    
    if (parentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.warn("⚠️  WARNING: Parent domain owner is not the deployer address!");
      console.warn("   Make sure the deployer has permission to create subdomains.");
      console.warn("   Deployment will continue, but subdomain registration may fail.");
    } else {
      console.log("✅ Deployer is the owner of the wrapped domain");
    }
  } catch (error: any) {
    console.warn("⚠️  WARNING: Could not verify if domain is wrapped:", error.message);
    console.warn("   The domain may not be wrapped yet.");
    console.warn("   Deployment will continue, but you should wrap the domain before registering subdomains.");
    console.warn("   To wrap: Go to https://app.ens.domains/ and wrap liquifidev.eth using NameWrapper");
  }

  // Deploy ENSSubnameRegistrar
  console.log("\n📦 Deploying ENSSubnameRegistrar...");
  
  // Ensure addresses are checksummed
  const nameWrapperAddress = ethers.getAddress(NAME_WRAPPER);
  const resolverAddress = ethers.getAddress(PUBLIC_RESOLVER);
  const registryAddress = ethers.getAddress(ENS_REGISTRY);
  
  console.log("Deploying with addresses:");
  console.log("  NameWrapper:", nameWrapperAddress);
  console.log("  Resolver:", resolverAddress);
  console.log("  Registry:", registryAddress);
  console.log("  Parent Node:", PARENT_NODE);
  console.log("  Owner:", deployer.address);
  
  const ENSSubnameRegistrar = await ethers.getContractFactory("ENSSubnameRegistrar");
  const registrar = await ENSSubnameRegistrar.deploy(
    PARENT_NODE,
    nameWrapperAddress,
    resolverAddress,
    registryAddress,
    deployer.address
  );
  await registrar.waitForDeployment();
  const registrarAddress = await registrar.getAddress();
  console.log("\n✅ ENSSubnameRegistrar deployed to:", registrarAddress);

  // Verify deployment
  const parentNode = await registrar.parentNode();
  console.log("✅ Verified parent node:", parentNode);

  console.log("\n=== Deployment Summary (Ethereum Mainnet) ===");
  console.log("ENSSubnameRegistrar:", registrarAddress);
  console.log("Parent Domain:", PARENT_NAME);
  console.log("Parent Node:", PARENT_NODE);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=${registrarAddress}`);
  console.log(`ENS_PARENT_NAME=${PARENT_NAME}`);
  console.log(`ENS_PARENT_NODE=${PARENT_NODE}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

