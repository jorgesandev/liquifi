const fs = require("fs");
const path = require("path");

const contractsDir = path.join(__dirname, "../contracts/artifacts/contracts");
const abiDir = path.join(__dirname, "../abi");

// Ensure abi directory exists
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true });
}

// Contract names to copy
const contracts = ["LiquiFiINFT.sol", "LiquiFiVault.sol"];

contracts.forEach((contractFile) => {
  const contractName = contractFile.replace(".sol", "");
  const artifactPath = path.join(contractsDir, contractFile, `${contractName}.json`);

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiPath = path.join(abiDir, `${contractName}.json`);

    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✓ Copied ABI for ${contractName}`);
  } else {
    console.warn(`⚠ Artifact not found for ${contractName}`);
  }
});

console.log("\n✅ ABI copy complete!");

