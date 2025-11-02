import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying to Sepolia L1 with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const ENS_REGISTRY = process.env.SEP_ENS_REGISTRY;
  const NAME_WRAPPER = process.env.SEP_NAME_WRAPPER;
  const PUBLIC_RESOLVER = process.env.SEP_PUBLIC_RESOLVER;
  const PARENT_NAME = process.env.SEP_PARENT_NAME || "liquifi-sepolia.eth";
  const PARENT_NODE = process.env.SEP_PARENT_NODE;

  if (!ENS_REGISTRY || !NAME_WRAPPER || !PUBLIC_RESOLVER || !PARENT_NODE) {
    throw new Error("Missing ENS configuration in contracts/.env");
  }

  console.log("\n📋 ENS Configuration:");
  console.log("Registry:", ENS_REGISTRY);
  console.log("NameWrapper:", NAME_WRAPPER);
  console.log("Resolver:", PUBLIC_RESOLVER);
  console.log("Parent Name:", PARENT_NAME);
  console.log("Parent Node:", PARENT_NODE);

  // Deploy ENSSubnameRegistrar
  const ENSSubnameRegistrar = await ethers.getContractFactory("ENSSubnameRegistrar");
  const registrar = await ENSSubnameRegistrar.deploy(
    PARENT_NODE,
    NAME_WRAPPER,
    PUBLIC_RESOLVER,
    ENS_REGISTRY,
    deployer.address
  );
  await registrar.waitForDeployment();
  const registrarAddress = await registrar.getAddress();
  console.log("\n✅ ENSSubnameRegistrar deployed to:", registrarAddress);

  console.log("\n=== Deployment Summary (Sepolia L1) ===");
  console.log("ENSSubnameRegistrar:", registrarAddress);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA=${registrarAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

