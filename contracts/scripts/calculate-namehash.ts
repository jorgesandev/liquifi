import { ethers } from "ethers";

/**
 * Calculate namehash for an ENS domain
 * namehash("eth") = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae
 * namehash("foo.eth") = keccak256(namehash("eth") + keccak256("foo"))
 */
function namehash(name: string): string {
  const parts = name.split(".");
  let node = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const label = ethers.keccak256(ethers.toUtf8Bytes(parts[i]));
    node = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [node, label]));
  }
  
  return node;
}

async function main() {
  const domain = process.argv[2] || "liquifidev.eth";
  const node = namehash(domain);
  
  console.log(`\n📋 ENS Namehash Calculation`);
  console.log(`Domain: ${domain}`);
  console.log(`Namehash: ${node}`);
  console.log(`\nUse this in your .env file as ENS_PARENT_NODE`);
  console.log(`ENS_PARENT_NODE=${node}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

