import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";
import { arbitrumSepolia } from "viem/chains";
import type { Address } from "viem";

// Contract addresses - will be set after deployment
const INFT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

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

// INFT Contract ABI
const INFT_ABI = [
  "function mint(address to, string memory tokenURI) external returns (uint256)",
  "function mintInvoice(address to, string memory debtor, uint256 amount, uint256 dueDate, string memory metadataURI) external returns (uint256)",
  "function mintWithMetadata(address to, string memory tokenURI, string memory invoiceHash, uint256 amount) external returns (uint256)",
  "function owner() external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event InvoiceMinted(uint256 indexed tokenId, address indexed to, address indexed issuer, string debtor, uint256 amount, uint256 dueDate)",
];

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Mint endpoint called");
    
    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: "invoice_id is required" },
        { status: 400 }
      );
    }

    // Validate contract address
    if (!INFT_CONTRACT_ADDRESS || INFT_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "INFT contract address not configured" },
        { status: 500 }
      );
    }

    // Get invoice from Supabase
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(ALCHEMY_API_URL);
    const signer = new ethers.Wallet(DEPLOYER_KEY, provider);

    // Check if signer is owner (for MVP)
    const contract = new ethers.Contract(
      INFT_CONTRACT_ADDRESS,
      INFT_ABI,
      signer
    );

    try {
      const owner = await contract.owner();
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        return NextResponse.json(
          { error: "Only owner can mint (MVP restriction)" },
          { status: 403 }
        );
      }
    } catch (e) {
      // Contract might not be deployed yet or ABI incomplete
      console.warn("Could not verify owner:", e);
    }

    // Create token URI metadata
    const tokenURI = JSON.stringify({
      name: `Invoice #${invoice.id}`,
      description: `CFDI Invoice NFT for ${invoice.debtor_name}`,
      attributes: [
        { trait_type: "Amount", value: invoice.amount },
        { trait_type: "Due Date", value: invoice.due_date },
        { trait_type: "CFDI Hash", value: invoice.cfdi_hash },
      ],
    });

    // Prepare minting parameters
    const tokenURIBase64 = `data:application/json;base64,${Buffer.from(tokenURI).toString("base64")}`;
    const invoiceAmount = BigInt(Math.floor(Number(invoice.amount)));
    
    // Parse due date (expects timestamp in seconds)
    const dueDate = invoice.due_date 
      ? Math.floor(new Date(invoice.due_date).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // Default: 30 days from now
    
    // Get current total supply to predict tokenId
    let currentSupply = BigInt(0);
    try {
      const supply = await contract.totalSupply();
      currentSupply = BigInt(supply.toString());
    } catch (err) {
      console.warn("Could not get totalSupply:", err);
    }

    // Mint NFT with full invoice data using mintInvoice (includes debtor name)
    console.log("Minting NFT with params:", {
      to: signer.address,
      debtor: invoice.debtor_name || "Unknown",
      amount: invoiceAmount.toString(),
      dueDate: dueDate,
      hash: invoice.cfdi_hash.substring(0, 16) + "...",
    });

    let mintTx;
    try {
      mintTx = await contract.mintInvoice(
        signer.address,
        invoice.debtor_name || "Unknown Debtor",
        invoiceAmount,
        BigInt(dueDate),
        tokenURIBase64
      );
    } catch (error: any) {
      console.error("Minting transaction failed:", error);
      // Check if it's a revert reason
      const errorMessage = error.reason || error.message || "Unknown error";
      return NextResponse.json(
        { 
          error: "Failed to mint NFT", 
          details: errorMessage,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await mintTx.wait();
    console.log("Transaction confirmed:", receipt.hash);

    // Get tokenId from totalSupply (should be currentSupply + 1)
    let tokenId: string;
    try {
      const newSupply = await contract.totalSupply();
      tokenId = newSupply.toString();
      
      // Verify tokenId makes sense
      if (currentSupply > BigInt(0) && BigInt(tokenId) <= currentSupply) {
        // Fallback: parse from events
        throw new Error("TokenId validation failed, parsing from events");
      }
    } catch (err) {
      console.warn("Could not get tokenId from totalSupply, parsing from events:", err);
      // Parse from Transfer event
      try {
        const iface = contract.interface;
        const transferEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = iface.parseLog(log);
            return parsed?.name === "Transfer" || parsed?.name === "InvoiceMinted";
          } catch {
            return false;
          }
        });
        
        if (transferEvent) {
          const parsed = iface.parseLog(transferEvent);
          // Transfer event: Transfer(from, to, tokenId)
          // InvoiceMinted event: InvoiceMinted(tokenId, to, issuer, debtor, amount, dueDate)
          if (parsed?.name === "Transfer" && parsed.args.length >= 3) {
            tokenId = parsed.args[2].toString();
          } else if (parsed?.name === "InvoiceMinted" && parsed.args.length >= 1) {
            tokenId = parsed.args[0].toString();
          } else {
            // Fallback: use expected tokenId
            tokenId = (currentSupply + BigInt(1)).toString();
          }
        } else {
          // Last resort: use expected tokenId
          tokenId = (currentSupply + BigInt(1)).toString();
        }
      } catch (parseErr) {
        console.error("Failed to parse events:", parseErr);
        // Last resort: use expected tokenId
        tokenId = (currentSupply + BigInt(1)).toString();
      }
    }

    console.log("Minted tokenId:", tokenId);

    // Update invoice status
    await supabase
      .from("invoices")
      .update({ status: "minted", nft_token_id: tokenId })
      .eq("id", invoice_id);

    return NextResponse.json({
      tokenId,
      txHash: receipt.hash,
      invoice_id: invoice_id,
    });
  } catch (error: any) {
    console.error("❌ Mint error:", error);
    console.error("Error stack:", error?.stack);
    
    // Extract more details from the error
    const errorMessage = error.reason || error.message || "Internal server error";
    const errorCode = error.code || error.error?.code;
    const errorData = error.data || error.error?.data;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        data: errorData,
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

