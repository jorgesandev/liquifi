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

// Type-safe constant after validation
const DEPLOYER_KEY: string = DEPLOYER_PRIVATE_KEY;

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

    // First, verify the NFT exists and get its owner
    const provider = new ethers.JsonRpcProvider(ALCHEMY_API_URL);
    const inftContract = new ethers.Contract(
      INFT_CONTRACT_ADDRESS,
      INFT_ABI,
      provider
    );

    let nftOwner: string;
    let invoiceData: any;
    try {
      nftOwner = await inftContract.ownerOf(tokenId);
      console.log("📋 NFT Owner:", nftOwner);
      
      // Try to get invoice data from contract to verify it matches
      try {
        invoiceData = await inftContract.getInvoice(tokenId);
        console.log("📄 Invoice data from contract:", {
          amount: invoiceData.amount.toString(),
          dueDate: new Date(Number(invoiceData.dueDate) * 1000).toISOString(),
          active: invoiceData.active,
        });
      } catch (err) {
        console.warn("Could not fetch invoice data from contract:", err);
      }
    } catch (error: any) {
      console.error("Error checking NFT owner:", error);
      return NextResponse.json(
        { error: "NFT not found or invalid tokenId" },
        { status: 404 }
      );
    }

    // Get invoice from Supabase by tokenId AND status=minted
    // This ensures we get the correct invoice even after redeployment
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("nft_token_id", tokenId)
      .eq("status", "minted")
      .single();

    // If not found, try searching without status filter (for backward compatibility)
    let finalInvoice = invoice;
    if (invoiceError || !invoice) {
      console.warn("⚠️ Invoice not found with status=minted, trying without status filter...");
      const { data: invoiceFallback } = await supabase
        .from("invoices")
        .select("*")
        .eq("nft_token_id", tokenId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (invoiceFallback) {
        finalInvoice = invoiceFallback;
        console.log("✅ Found invoice without status filter:", finalInvoice.id);
      }
    }

    if (!finalInvoice) {
      return NextResponse.json(
        { 
          error: "Invoice not found for this token",
          details: `No invoice found with nft_token_id=${tokenId}. Make sure the invoice was minted successfully.`
        },
        { status: 404 }
      );
    }

    // Verify the invoice amount matches the contract (if we got invoice data)
    if (invoiceData && finalInvoice.amount !== invoiceData.amount.toString()) {
      console.warn("⚠️ Invoice amount mismatch between Supabase and contract");
      console.warn(`  Supabase: ${finalInvoice.amount}, Contract: ${invoiceData.amount.toString()}`);
      // Use contract amount as source of truth
      console.log("📝 Using contract amount as source of truth");
    }

    // Check if org has ENS registered (skip KYB if true)
    const orgId = `org_${finalInvoice.id}`;
    let kybData: any = null;
    let ensLabel: string | null = null;
    
    // Get KYB data to check ENS status
    const { data: kyb } = await supabase
      .from("kyb_results")
      .select("ens_registered, ens_label, status")
      .eq("org_id", orgId)
      .single();

    if (kyb?.ens_registered && kyb?.ens_label) {
      kybData = kyb;
      ensLabel = kyb.ens_label;
      console.log(`✅ Empresa verificada con ENS: ${ensLabel}.liquifidev.eth`);
      console.log(`   KYB ya completado, omitiendo verificación adicional`);
    }

    // Setup signer (provider already created above)
    const signer = new ethers.Wallet(DEPLOYER_KEY, provider);

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

    // invoiceData was already fetched above when verifying NFT ownership
    // If it wasn't fetched successfully, try again now
    if (!invoiceData) {
      try {
        invoiceData = await inftContract.getInvoice(tokenId);
        console.log("📄 Invoice data from contract (retry):", {
          amount: invoiceData.amount.toString(),
          dueDate: new Date(Number(invoiceData.dueDate) * 1000).toISOString(),
          active: invoiceData.active,
        });
      } catch (error: any) {
        console.warn("Could not get invoice from contract, using Supabase data:", error);
        invoiceData = null;
      }
    }

    // Calculate borrow amount based on invoice amount and 70% LTV
    // IMPORTANT: Invoice amount from Supabase is stored as integer (e.g., 50000)
    // When minted to contract, it's used directly as BigInt (with 6 decimals: 50000 = 0.05 USDC)
    // So we need to use it as-is (already in correct units for contract)
    const invoiceAmount = invoiceData 
      ? BigInt(invoiceData.amount.toString())  // From contract (most reliable)
      : BigInt(Math.floor(Number(invoice.amount))); // Fallback: from Supabase (already in correct units)
    
    // Calculate max borrow: invoiceAmount × 70% LTV (MAX_LTV_BPS = 7000 = 70%)
    // For demo, we'll borrow the maximum allowed amount (70% of invoice value)
    const maxBorrow = (invoiceAmount * BigInt(7000)) / BigInt(10000);
    const borrowAmount = maxBorrow; // Borrow maximum allowed (70% of invoice)
    
    // Get vault balance for debugging
    const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS;
    let vaultBalance = "0";
    if (VAULT_ADDRESS) {
      try {
        const assetAddress = await loanManager.vault(); // Get vault address from LoanManager
        const vaultContract = new ethers.Contract(
          VAULT_ADDRESS,
          ["function asset() external view returns (address)", "function totalAssets() external view returns (uint256)"],
          provider
        );
        const asset = await vaultContract.asset();
        const assetContract = new ethers.Contract(
          asset,
          ["function balanceOf(address) external view returns (uint256)", "function decimals() external view returns (uint8)"],
          provider
        );
        vaultBalance = (await assetContract.balanceOf(VAULT_ADDRESS)).toString();
        const decimals = await assetContract.decimals();
        const vaultBalanceFormatted = Number(vaultBalance) / (10 ** Number(decimals));
        
        console.log("💰 Borrowing:", {
          tokenId,
          invoiceAmount: invoiceAmount.toString(),
          invoiceAmountUSDC: (Number(invoiceAmount.toString()) / 1e6).toFixed(6),
          maxBorrow: maxBorrow.toString(),
          borrowAmount: borrowAmount.toString(),
          borrowAmountUSDC: (Number(borrowAmount.toString()) / 1e6).toFixed(6),
          vaultBalance: vaultBalance,
          vaultBalanceUSDC: vaultBalanceFormatted.toFixed(6),
          ltvPercent: "70%",
          borrower,
        });
      } catch (err) {
        console.warn("⚠️ Could not fetch vault balance:", err);
        console.log("💰 Borrowing:", {
          tokenId,
          invoiceAmount: invoiceAmount.toString(),
          maxBorrow: maxBorrow.toString(),
          borrowAmount: borrowAmount.toString(),
          ltvPercent: "70%",
          borrower,
        });
      }
    }

    // Check vault liquidity and LoanManager configuration before attempting loan
    const VAULT_ABI = [
      "function asset() external view returns (address)",
      "function loanManager() external view returns (address)",
    ];
    if (VAULT_ADDRESS && vaultBalance !== "0") {
      try {
        const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
        
        // Verify LoanManager is configured in vault
        const configuredLoanManager = await vaultContract.loanManager();
        if (configuredLoanManager.toLowerCase() !== LOAN_MANAGER_ADDRESS.toLowerCase()) {
          console.error("❌ LoanManager not configured in vault!", {
            expected: LOAN_MANAGER_ADDRESS,
            actual: configuredLoanManager,
          });
          return NextResponse.json(
            { 
              error: "Configuration error",
              details: `El LoanManager no está configurado en el vault. Configurado: ${configuredLoanManager}, Esperado: ${LOAN_MANAGER_ADDRESS}. Por favor, ejecuta vault.setLoanManager(loanManagerAddress).`,
            },
            { status: 500 }
          );
        }
        console.log("✅ LoanManager correctly configured in vault");
        
        const assetAddress = await vaultContract.asset();
        const assetContract = new ethers.Contract(
          assetAddress,
          ["function balanceOf(address) external view returns (uint256)", "function decimals() external view returns (uint8)"],
          provider
        );
        const availableBalance = await assetContract.balanceOf(VAULT_ADDRESS);
        const availableBalanceBigInt = BigInt(availableBalance.toString());
        const availableBalanceUSDC = Number(availableBalance.toString()) / 1e6;
        const requestedUSDC = Number(borrowAmount.toString()) / 1e6;
        
        // Compare BigInt values properly
        const sufficient = availableBalanceBigInt >= borrowAmount;
        
        console.log("💧 Vault Liquidity Check:", {
          availableBalance: availableBalance.toString(),
          availableBalanceUSDC: availableBalanceUSDC.toFixed(2),
          requested: borrowAmount.toString(),
          requestedUSDC: requestedUSDC.toFixed(6),
          sufficient: sufficient,
          loanManagerConfigured: true,
        });
        
        if (!sufficient) {
          return NextResponse.json(
            { 
              error: "Insufficient liquidity",
              details: `El vault tiene ${availableBalanceUSDC.toFixed(2)} USDC disponible, pero se solicita ${requestedUSDC.toFixed(6)} USDC. El balance disponible no incluye préstamos pendientes (totalReceivables).`,
              availableBalanceUSDC: availableBalanceUSDC.toFixed(2),
              requestedUSDC: requestedUSDC.toFixed(6),
            },
            { status: 400 }
          );
        }
      } catch (err) {
        console.warn("⚠️ Could not verify vault liquidity:", err);
      }
    }
      

    // Verify vault configuration and state one more time
    // Re-create vaultContract if needed (it might be in a different scope)
    const VAULT_ADDRESS_FINAL = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS;
    if (!VAULT_ADDRESS_FINAL) {
      return NextResponse.json(
        { error: "VAULT_CONTRACT_ADDRESS not configured" },
        { status: 500 }
      );
    }
    
    const vaultContractFinal = new ethers.Contract(
      VAULT_ADDRESS_FINAL,
      VAULT_ABI,
      provider
    );
    
    try {
      const vaultLoanManager = await vaultContractFinal.loanManager();
      console.log("🔍 Verificación final del vault:");
      console.log("  Vault LoanManager configurado:", vaultLoanManager);
      console.log("  LoanManager address esperado:", LOAN_MANAGER_ADDRESS);
      console.log("  Coinciden?", vaultLoanManager.toLowerCase() === LOAN_MANAGER_ADDRESS.toLowerCase());
      
      if (vaultLoanManager.toLowerCase() !== LOAN_MANAGER_ADDRESS.toLowerCase()) {
        return NextResponse.json(
          {
            error: "LoanManager no está configurado correctamente en el vault",
            details: `Vault tiene: ${vaultLoanManager}, pero esperamos: ${LOAN_MANAGER_ADDRESS}. Por favor redespliega el vault y configura el LoanManager.`
          },
          { status: 500 }
        );
      }
      
      // Verify vault has enough balance (re-create assetContract if needed)
      const assetAddressFinal = await vaultContractFinal.asset();
      const assetContractFinal = new ethers.Contract(
        assetAddressFinal,
        ["function balanceOf(address) external view returns (uint256)"],
        provider
      );
      const vaultBalanceCheck = await assetContractFinal.balanceOf(VAULT_ADDRESS_FINAL);
      console.log("  Balance del vault (raw):", vaultBalanceCheck.toString());
      console.log("  Balance requerido:", borrowAmount.toString());
      console.log("  Suficiente?", vaultBalanceCheck >= borrowAmount);
      
      if (vaultBalanceCheck < borrowAmount) {
        return NextResponse.json(
          {
            error: "El vault no tiene suficiente liquidez",
            details: `Disponible: ${(Number(vaultBalanceCheck) / 1e6).toFixed(6)} USDC, Requerido: ${(Number(borrowAmount) / 1e6).toFixed(6)} USDC`
          },
          { status: 400 }
        );
      }
    } catch (err) {
      console.warn("⚠️ No se pudo verificar la configuración del vault:", err);
    }
    
    // Check if tokenId already has an active loan
    try {
      const existingLoanId = await loanManager.getLoanId(tokenId);
      if (existingLoanId && existingLoanId.toString() !== "0") {
        console.warn("⚠️ TokenId ya tiene un loan activo:", existingLoanId.toString());
        // Try to get loan details
        try {
          const existingLoan = await loanManager.getLoan(existingLoanId);
          if (existingLoan.active) {
            return NextResponse.json(
              {
                error: "Este tokenId ya tiene un préstamo activo",
                details: `Loan ID: ${existingLoanId}, Borrower: ${existingLoan.borrower}, Principal: ${(Number(existingLoan.principal) / 1e6).toFixed(6)} USDC`,
                loanId: existingLoanId.toString()
              },
              { status: 400 }
            );
          }
        } catch (err) {
          console.warn("Could not fetch existing loan details:", err);
        }
      }
    } catch (err) {
      // Loan doesn't exist or tokenId is not in mapping yet, that's OK
      console.log("✅ TokenId no tiene loan previo, procediendo...");
    }
    
    // CRITICAL: Approve LoanManager to transfer the NFT
    // Without this, safeTransferFrom will fail with ERC721InsufficientApproval
    console.log("🔐 Aprobando LoanManager para transferir NFT...");
    try {
      const inftContractWithSigner = new ethers.Contract(
        INFT_CONTRACT_ADDRESS,
        [
          "function approve(address to, uint256 tokenId) external",
          "function getApproved(uint256 tokenId) external view returns (address)"
        ],
        signer
      );
      
      // Check if already approved
      const currentApproved = await inftContractWithSigner.getApproved(tokenId);
      if (currentApproved.toLowerCase() !== LOAN_MANAGER_ADDRESS.toLowerCase()) {
        const approveTx = await inftContractWithSigner.approve(LOAN_MANAGER_ADDRESS, tokenId);
        await approveTx.wait();
        console.log("✅ NFT aprobado para LoanManager");
      } else {
        console.log("✅ NFT ya está aprobado para LoanManager");
      }
    } catch (approveErr: any) {
      console.error("❌ Error aprobando NFT:", approveErr);
      return NextResponse.json(
        { 
          error: "Failed to approve NFT for transfer",
          details: approveErr.message
        },
        { status: 500 }
      );
    }
    
    let borrowTx;
    try {
      borrowTx = await loanManager.initiateLoan(
        tokenId,
        borrowAmount,
        ensLabel || "" // Use ENS label if available, otherwise empty
      );
    } catch (error: any) {
      console.error("❌ Loan initiation failed:", error);
      console.error("📊 Error details:", {
        code: error.code,
        action: error.action,
        data: error.data,
        reason: error.reason,
        shortMessage: error.shortMessage,
      });
      
      // Decode error data
      if (error.data && error.data.length >= 10) {
        const errorData = error.data;
        const selector = errorData.substring(0, 10);
        const encodedParams = errorData.substring(10);
        
        console.error("🔍 Error Data Breakdown:", {
          selector,
          encodedParams,
          fullLength: errorData.length,
        });
        
        // Try to decode if there are parameters
        if (encodedParams.length >= 64) {
          try {
            // First parameter (likely an address, 64 hex chars = 32 bytes)
            const param1 = '0x' + encodedParams.substring(0, 64);
            // Second parameter (if exists)
            const param2 = encodedParams.length >= 128 ? '0x' + encodedParams.substring(64, 128) : null;
            
            console.error("📦 Decoded Parameters:", {
              param1: param1,
              param2: param2,
              param1AsAddress: param1 !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
                ? ethers.getAddress('0x' + param1.slice(-40)) : null,
              param2AsNumber: param2 ? parseInt(param2, 16).toString() : null,
            });
          } catch (decodeErr) {
            console.error("⚠️ Could not decode parameters:", decodeErr);
          }
        }
      }
      
      // Try to decode custom error
      let decodedError = "Unknown error";
      if (error.data) {
        // Error selectors (first 4 bytes of keccak256 hash of error signature)
        // 0xbb55fd27 = InsufficientLiquidity() from LiquidityVault (actual)
        // 0x27c73dbd = InsufficientLTV() from LoanManager
        // 0x045f33d1 = InvalidLoan() from LoanManager
        // 0x9dda5799 = TokenNotDeposited() from LoanManager
        
        const errorSelector = error.data && error.data.length >= 10 
          ? error.data.substring(0, 10).toLowerCase()
          : null;
        
        if (errorSelector === "0x177e802f") {
          // This error selector doesn't match any of our custom errors
          // It might be from OpenZeppelin (SafeERC20) or an older contract version
          // Let's verify the actual vault balance at the time of the error
          const availableUSDC = vaultBalance !== "0" ? (Number(vaultBalance) / 1e6).toFixed(2) : "desconocido";
          const requestedUSDC = (Number(borrowAmount.toString()) / 1e6).toFixed(6);
          decodedError = `Error durante la simulación de la transacción. El selector 0x177e802f no coincide con errores conocidos. Posible causa: problema con el token o versión anterior del contrato. Verifica en Arbiscan que los contratos desplegados coincidan con el código fuente. Solicitado: ${requestedUSDC} USDC, Balance verificado: ${availableUSDC} USDC.`;
        } else if (errorSelector === "0x27c73dbd") {
          // InsufficientLTV: requested amount exceeds 70% LTV
          const maxBorrowCalc = (invoiceAmount * BigInt(7000)) / BigInt(10000);
          decodedError = `El monto solicitado excede el máximo permitido (70% LTV). Monto máximo: ${(Number(maxBorrowCalc) / 1e6).toFixed(6)} USDC (${maxBorrowCalc.toString()} unidades)`;
        } else if (errorSelector === "0x045f33d1") {
          decodedError = "La factura no está activa o es inválida";
        } else if (errorSelector === "0x9dda5799") {
          decodedError = "El NFT no ha sido depositado en el vault";
        } else if (error.reason?.includes("NotBorrower")) {
          decodedError = "El NFT debe ser propiedad del prestatario";
        } else if (error.reason?.includes("PastDueDate")) {
          decodedError = "La factura ha vencido";
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
      invoice_id: finalInvoice.id,
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

