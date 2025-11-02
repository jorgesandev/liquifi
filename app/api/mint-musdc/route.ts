import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const MOCK_USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

if (!DEPLOYER_PRIVATE_KEY || !alchemyApiKey) {
  throw new Error("Missing DEPLOYER_PRIVATE_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY");
}

// Type-safe constant after validation
const DEPLOYER_KEY: string = DEPLOYER_PRIVATE_KEY;

// Construct Alchemy RPC URL
const ALCHEMY_API_URL = alchemyPolicyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

// MockUSDC ABI
const MOCK_USDC_ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
  "function balanceOf(address account) external view returns (uint256)",
] as const;

export async function POST(request: NextRequest) {
  try {
    console.log("💰 Mint mUSDC endpoint called");

    const body = await request.json();
    const { address: recipientAddress, amount } = body;

    if (!recipientAddress) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(recipientAddress)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    const mintAmount = amount
      ? ethers.parseUnits(amount.toString(), 6) // mUSDC has 6 decimals
      : ethers.parseUnits("1000", 6); // Default: 1000 mUSDC

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(ALCHEMY_API_URL);
    const signer = new ethers.Wallet(DEPLOYER_KEY, provider);

    // Get MockUSDC contract
    const mockUSDC = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_USDC_ABI, signer);

    // Verify deployer is owner
    try {
      const owner = await mockUSDC.owner();
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        return NextResponse.json(
          { error: "Only owner can mint tokens" },
          { status: 403 }
        );
      }
    } catch (e) {
      console.warn("Could not verify owner:", e);
    }

    console.log(`Minting ${ethers.formatUnits(mintAmount, 6)} mUSDC to ${recipientAddress}`);

    // Mint tokens
    const mintTx = await mockUSDC.mint(recipientAddress, mintAmount);
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await mintTx.wait();
    console.log("Transaction confirmed:", receipt.hash);

    // Get new balance
    const newBalance = await mockUSDC.balanceOf(recipientAddress);

    return NextResponse.json({
      success: true,
      recipient: recipientAddress,
      amount: ethers.formatUnits(mintAmount, 6),
      txHash: receipt.hash,
      newBalance: ethers.formatUnits(newBalance, 6),
    });
  } catch (error: any) {
    console.error("❌ Mint mUSDC error:", error);
    
    const errorMessage = error.reason || error.message || "Internal server error";
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

