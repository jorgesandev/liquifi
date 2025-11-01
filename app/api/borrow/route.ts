import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";

const VAULT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

if (!DEPLOYER_PRIVATE_KEY || !alchemyApiKey) {
  throw new Error("Missing DEPLOYER_PRIVATE_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY");
}

// Construct Alchemy RPC URL
const ALCHEMY_API_URL = alchemyPolicyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

// Basic Vault ABI
const VAULT_ABI = [
  "function depositAndBorrow(uint256 tokenId, uint256 amount) external returns (uint256)",
  "function getLoanId(uint256 tokenId) external view returns (uint256)",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Get invoice from Supabase by tokenId
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("nft_token_id", tokenId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found for this token" },
        { status: 404 }
      );
    }

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(ALCHEMY_API_URL);
    const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    const contract = new ethers.Contract(
      VAULT_CONTRACT_ADDRESS,
      VAULT_ABI,
      signer
    );

    // Calculate borrow amount (e.g., 70% of invoice amount)
    const borrowAmount = BigInt(Math.floor(Number(invoice.amount) * 0.7));

    // Call depositAndBorrow
    const borrowTx = await contract.depositAndBorrow(
      tokenId,
      borrowAmount
    );

    const receipt = await borrowTx.wait();

    // Get loan ID from contract or use transaction-based ID
    let loanId: string;
    try {
      const loanIdBigInt = await contract.getLoanId(tokenId);
      loanId = loanIdBigInt.toString();
    } catch {
      // Fallback to transaction hash-based ID
      loanId = `loan_${receipt.hash.slice(0, 16)}`;
    }

    // Store loan in Supabase
    await supabase.from("loans").insert({
      loan_id: loanId,
      invoice_id: invoice.id,
      token_id: tokenId,
      amount: borrowAmount.toString(),
      tx_hash: receipt.hash,
      status: "active",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      loanId,
      txHash: receipt.hash,
      amount: borrowAmount.toString(),
    });
  } catch (error: any) {
    console.error("Borrow error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

