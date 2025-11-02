import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

const NAME_WRAPPER_MAINNET = "0x0635513f179D50A207757E05759CbD106d7dFcE8";
const REGISTRAR_CONTRACT = "0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52"; // ENSSubnameRegistrar

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Aprobando ENSSubnameRegistrar para crear subdominios...");
  console.log("Wallet:", signer.address);
  console.log("NameWrapper:", NAME_WRAPPER_MAINNET);
  console.log("Registrar Contract:", REGISTRAR_CONTRACT);

  const nameWrapperABI = [
    "function setApprovalForAll(address operator, bool approved) external",
    "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  ];

  const nameWrapper = new ethers.Contract(
    NAME_WRAPPER_MAINNET,
    nameWrapperABI,
    signer
  );

  // Try to check if already approved (non-blocking)
  try {
    const isApproved = await nameWrapper.isApprovedForAll(
      signer.address,
      REGISTRAR_CONTRACT
    );

    if (isApproved) {
      console.log("✅ El contrato ya está aprobado!");
      return;
    }
  } catch (checkError: any) {
    console.log("⚠️  No se pudo verificar estado de aprobación, continuando...");
    console.log("   Esto es normal si hay problemas de conexión o el dominio no está wrapped");
  }

  console.log("\n📝 Enviando transacción para aprobar el contrato...");
  const tx = await nameWrapper.setApprovalForAll(REGISTRAR_CONTRACT, true);
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Contrato aprobado exitosamente!");
  console.log("   TX:", receipt.hash);
  console.log(
    "\nVerifica en Etherscan:",
    `https://etherscan.io/tx/${receipt.hash}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

