/**
 * Script to verify transactions on Arbitrum Sepolia
 * 
 * Usage: node scripts/verify-transaction.js <transaction_hash>
 * Example: node scripts/verify-transaction.js 0x76cc1c5a69ffc084eccdd62fd060db14e9f8338262905b8c2584d64a994b2d1d
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;
const INFT_ADDRESS = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS;

if (!ALCHEMY_API_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_ALCHEMY_API_KEY in .env.local");
  process.exit(1);
}

const ALCHEMY_URL = ALCHEMY_POLICY_ID
  ? `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}?policyId=${ALCHEMY_POLICY_ID}`
  : `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);

async function verifyTransaction(txHash) {
  console.log(`\n🔍 Verifying transaction: ${txHash}\n`);
  console.log(`🌐 View on Arbiscan: https://sepolia.arbiscan.io/tx/${txHash}\n`);

  try {
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log("⏳ Transaction not found or still pending...");
      return;
    }

    console.log("✅ Transaction Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("📦 Block Number:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());
    console.log("💰 From:", receipt.from);
    console.log("📍 To:", receipt.to);

    // Check if it's a contract call
    if (receipt.to && receipt.to !== null) {
      const code = await provider.getCode(receipt.to);
      if (code === "0x") {
        console.log("⚠️  Warning: Target address has no code (EOA or not deployed)");
      } else {
        console.log("✅ Target address is a contract");
      }
    }

    // Parse logs if possible
    if (receipt.logs.length > 0) {
      console.log(`\n📋 Events (${receipt.logs.length}):`);
      receipt.logs.forEach((log, i) => {
        console.log(`  Event ${i + 1}:`, {
          address: log.address,
          topics: log.topics.length,
          data: log.data.substring(0, 20) + "...",
        });
      });
    }

    // Check status
    if (receipt.status === 0) {
      console.log("\n❌ Transaction REVERTED - Check reason:");
      try {
        const tx = await provider.getTransaction(txHash);
        const result = await provider.call({
          to: tx.to,
          data: tx.data,
        }, tx.blockNumber - 1);
      } catch (revertErr) {
        console.log("   Reason:", revertErr.reason || revertErr.message);
      }
    }

  } catch (error) {
    console.error("❌ Error verifying transaction:", error.message);
  }
}

async function checkContract(address) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Contract address not configured");
    return;
  }

  console.log(`\n🔍 Checking contract: ${address}`);
  console.log(`🌐 View on Arbiscan: https://sepolia.arbiscan.io/address/${address}\n`);

  try {
    const code = await provider.getCode(address);
    
    if (code === "0x") {
      console.log("❌ Contract NOT DEPLOYED at this address");
      console.log("   → The address has no code");
      console.log("   → Deploy contracts first: cd contracts && npm run deploy:arb");
    } else {
      console.log("✅ Contract DEPLOYED");
      console.log("   Code size:", (code.length - 2) / 2, "bytes");

      // Try to call owner() if it's the INFT contract
      try {
        const INFT_ABI = ["function owner() external view returns (address)"];
        const contract = new ethers.Contract(address, INFT_ABI, provider);
        const owner = await contract.owner();
        console.log("   Owner:", owner);
      } catch (e) {
        // Not INFT or function doesn't exist
      }
    }
  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
  }
}

async function main() {
  const txHash = process.argv[2];

  console.log("=".repeat(60));
  console.log("🔍 LiquiFi Transaction Verifier");
  console.log("=".repeat(60));

  if (txHash) {
    await verifyTransaction(txHash);
  } else {
    console.log("\n📝 Usage: node scripts/verify-transaction.js <tx_hash>");
    console.log("\n💡 Example:");
    console.log("   node scripts/verify-transaction.js 0x76cc1c5a69ffc084eccdd62fd060db14e9f8338262905b8c2584d64a994b2d1d");
  }

  // Always check contract address
  if (INFT_ADDRESS) {
    await checkContract(INFT_ADDRESS);
  } else {
    console.log("\n⚠️  NEXT_PUBLIC_INFT_CONTRACT_ADDRESS not set in .env.local");
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

