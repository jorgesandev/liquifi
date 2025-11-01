import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";

const LOAN_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

const INFT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS ||
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

// LoanManager ABI
const LOAN_MANAGER_ABI = [
  "function initiateLoan(uint256 tokenId, uint256 requestedAmount, string memory ensLabel) external returns (uint256)",
  "function getLoanId(uint256 tokenId) external view returns (uint256)",
  "function getLoan(uint256 loanId) external view returns (tuple(address borrower, uint256 tokenId, uint256 principal, uint256 approvedValue, uint256 ltvBps, uint256 interestBps, uint256 start, uint256 due, bool active))",
  "function vault() external view returns (address)",
];

// INFT ABI for checking owner
const INFT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function getInvoice(uint256 tokenId) external view returns (tuple(address issuer, string debtor, uint256 amount, uint256 dueDate, string metadataURI, bool active))",
];

export async function POST(request: NextRequest) {
  try {
    console.log("💵 Borrow endpoint called");
    
    const body = await request.json();
    const { tokenId, borrowerAddress } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Validate contract addresses
    if (!LOAN_MANAGER_ADDRESS || LOAN_MANAGER_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "LoanManager contract address not configured" },
        { status: 500 }
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

    // Check NFT owner - MVP: NFT should be owned by deployer (since minting mints to deployer)
    const inftContract = new ethers.Contract(
      INFT_CONTRACT_ADDRESS,
      INFT_ABI,
      provider
    );

    let nftOwner: string;
    try {
      nftOwner = await inftContract.ownerOf(tokenId);
      console.log("📋 NFT Owner:", nftOwner);
    } catch (error: any) {
      console.error("Error checking NFT owner:", error);
      return NextResponse.json(
        { error: "NFT not found or invalid tokenId" },
        { status: 404 }
      );
    }

    // For MVP: The NFT should be owned by deployer (minted to deployer address)
    // In production, this should be the user's address from the frontend
    const borrower = borrowerAddress || nftOwner || signer.address;
    
    if (nftOwner.toLowerCase() !== borrower.toLowerCase()) {
      // Try to transfer NFT to deployer first (for MVP)
      // In production, user should initiate loan from their own wallet
      console.log("⚠️  NFT owner mismatch. For MVP, NFT must be owned by deployer.");
    }

    // Get LoanManager contract
    const loanManager = new ethers.Contract(
      LOAN_MANAGER_ADDRESS,
      LOAN_MANAGER_ABI,
      signer
    );

    // Get invoice data from contract to calculate max borrow
    let invoiceData;
    try {
      invoiceData = await inftContract.getInvoice(tokenId);
      console.log("📄 Invoice data from contract:", {
        amount: invoiceData.amount.toString(),
        dueDate: new Date(Number(invoiceData.dueDate) * 1000).toISOString(),
        active: invoiceData.active,
      });
    } catch (error: any) {
      console.warn("Could not get invoice from contract, using Supabase data:", error);
      invoiceData = null;
    }

    // 🎯 DEMO: Hardcoded borrow amount of 0.05 mUSDC (50,000 units with 6 decimals)
    // In production, this would be calculated as: invoiceAmount × 70% LTV
    const invoiceAmount = invoiceData 
      ? BigInt(invoiceData.amount.toString())  // From contract (most reliable)
      : BigInt(Math.floor(Number(invoice.amount))); // Fallback: from Supabase
    
    // Demo: Always borrow 0.05 mUSDC (50,000 units = 0.05 * 10^6)
    const borrowAmount = BigInt(50000); // 0.05 mUSDC with 6 decimals
    
    console.log("💰 Borrowing (DEMO - fixed amount):", {
      tokenId,
      invoiceAmount: invoiceAmount.toString(),
      borrowAmount: borrowAmount.toString(), // 0.05 mUSDC (50,000 units)
      borrower,
      note: "Demo mode: fixed borrow amount of 0.05 mUSDC"
    });

    // Check vault liquidity before attempting loan
    // Note: For demo, we skip this check since vault may not have liquidity yet
    // The contract will revert with InsufficientLiquidity() if needed
    // Skip liquidity check for demo - the contract will handle the error
    console.log("⚠️ Demo mode: Skipping vault liquidity check. Contract will revert if insufficient.");
      

    // Call initiateLoan (ensLabel is optional, pass empty string for MVP)
    let borrowTx;
    try {
      borrowTx = await loanManager.initiateLoan(
        tokenId,
        borrowAmount,
        "" // Empty ENS label for MVP
      );
    } catch (error: any) {
      console.error("❌ Loan initiation failed:", error);
      
      // Try to decode custom error
      let decodedError = "Unknown error";
      if (error.data) {
        // Custom errors in Solidity 0.8.24 use error selector (first 4 bytes)
        const errorSelector = error.data.substring(0, 10);
        
        // Map error selectors to human-readable messages
        const errorMap: Record<string, string> = {
          // These would need to be calculated from actual error selectors
          // For now, check common errors
        };
        
        // Check for known errors by trying to call contract
        try {
          // Try to get more info about why it failed
          const maxBorrow = (invoiceAmount * BigInt(7000)) / BigInt(10000);
          if (borrowAmount > maxBorrow) {
            decodedError = `Requested amount (${borrowAmount.toString()}) exceeds maximum LTV (${maxBorrow.toString()})`;
          }
        } catch {}
        
        // Error selector 0x177e802f = InsufficientLiquidity() from LiquidityVault
        if (error.data && error.data.length >= 10 && error.data.startsWith("0x177e802f")) {
          decodedError = "El vault no tiene suficiente liquidez. Por favor, deposita fondos al vault primero desde la página /invest";
        } else if (error.reason?.includes("NotBorrower")) {
          decodedError = "NFT owner mismatch - NFT must be owned by borrower";
        } else if (error.reason?.includes("PastDueDate")) {
          decodedError = "Invoice is past its due date";
        } else if (error.reason?.includes("InsufficientLTV")) {
          decodedError = "Requested amount exceeds maximum loan-to-value (70%)";
        } else {
          decodedError = error.reason || error.message || "Contract execution reverted";
        }
      }
      
      return NextResponse.json(
        { 
          error: "Loan initiation failed",
          details: decodedError,
          code: error.code,
          data: error.data
        },
        { status: 400 }
      );
    }

    console.log("⏳ Transaction sent, waiting for confirmation...");
    const receipt = await borrowTx.wait();
    console.log("✅ Transaction confirmed:", receipt.hash);

    // Get loan ID from contract
    let loanId: string;
    try {
      const loanIdBigInt = await loanManager.getLoanId(tokenId);
      loanId = loanIdBigInt.toString();
      console.log("📝 Loan ID:", loanId);
    } catch (error: any) {
      console.warn("Could not get loanId from contract:", error);
      // Fallback: parse from events or use transaction hash
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
    console.error("❌ Borrow error:", error);
    console.error("Error details:", {
      message: error.message,
      reason: error.reason,
      code: error.code,
      data: error.data,
    });
    
    // Extract error details
    const errorMessage = error.reason || error.message || "Internal server error";
    const errorCode = error.code || error.error?.code;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

