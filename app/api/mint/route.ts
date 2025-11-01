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

// Construct Alchemy RPC URL
const ALCHEMY_API_URL = alchemyPolicyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

// Basic ERC721 ABI for minting
const INFT_ABI = [
  "function mint(address to, string memory tokenURI) external returns (uint256)",
  "function mintWithMetadata(address to, string memory tokenURI, string memory invoiceHash, uint256 amount) external returns (uint256)",
  "function owner() external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: "invoice_id is required" },
        { status: 400 }
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
    const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

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

    // Get token ID using static call (simulates the transaction to get return value)
    const tokenURIBase64 = `data:application/json;base64,${Buffer.from(tokenURI).toString("base64")}`;
    const invoiceAmount = BigInt(Math.floor(Number(invoice.amount)));
    
    let tokenId: string;
    try {
      // Use mintWithMetadata to store invoice hash and amount on-chain
      const tokenIdBigInt = await contract.mintWithMetadata.staticCall(
        signer.address,
        tokenURIBase64,
        invoice.cfdi_hash,
        invoiceAmount
      );
      tokenId = tokenIdBigInt.toString();
    } catch {
      // If static call fails, we'll get it from totalSupply after minting
      tokenId = "";
    }

    // Mint NFT with metadata
    const mintTx = await contract.mintWithMetadata(
      signer.address,
      tokenURIBase64,
      invoice.cfdi_hash,
      invoiceAmount
    );
    const receipt = await mintTx.wait();

    // If we didn't get tokenId from static call, get it from totalSupply
    if (!tokenId) {
      try {
        const totalSupply = await contract.totalSupply();
        tokenId = totalSupply.toString();
      } catch {
        // Parse from Transfer event as last resort
        try {
          const transferEvent = receipt.logs.find((log: any) => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed?.name === "Transfer";
            } catch {
              return false;
            }
          });
          if (transferEvent) {
            const parsed = contract.interface.parseLog(transferEvent);
            tokenId = parsed?.args[2]?.toString() || "1";
          } else {
            tokenId = "1";
          }
        } catch {
          tokenId = "1";
        }
      }
    }

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
    console.error("Mint error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

