"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { RequestMUSDC } from "@/components/RequestMUSDC";
import { ToastContainer, type Toast } from "@/components/Toast";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { parseUnits, formatUnits } from "viem";
import { TrendingUp, DollarSign, PieChart, ArrowDownCircle, ArrowUpCircle, History, RefreshCw } from "lucide-react";

// Contract addresses from environment
// Note: Using REAL USDC from Arbitrum Sepolia (checksum: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
// For hackathon: Real USDC from Circle (user's USDC address)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Real USDC on Arbitrum Sepolia
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// ERC20 ABI (for approve and balance) - Full JSON ABI format required by viem
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

// ERC4626 Vault ABI - Full JSON ABI format required by viem
const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "convertToShares",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export default function InvestPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Read USDC balance (real USDC or mock)
  const { data: usdcBalance, refetch: refetchBalance } = useBalance({
    address,
    token: USDC_ADDRESS as `0x${string}`,
    query: {
      enabled: !!address && !!USDC_ADDRESS && USDC_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Read vault shares balance
  const { 
    data: vaultShares, 
    refetch: refetchShares,
    error: vaultSharesError,
    isLoading: vaultSharesLoading 
  } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!VAULT_ADDRESS && VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 5000, // Auto-refetch every 5 seconds to catch updates
    },
  });

  // Read vault total assets
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "totalAssets",
    query: {
      enabled: !!VAULT_ADDRESS,
    },
  });

  // Read total receivables (loans outstanding) from vault
  const { data: totalReceivables } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: [
      {
        name: "totalReceivables",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "totalReceivables",
    query: {
      enabled: !!VAULT_ADDRESS,
    },
  });

  // Read vault total supply (total shares)
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!VAULT_ADDRESS,
    },
  });

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && VAULT_ADDRESS ? [address, VAULT_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!USDC_ADDRESS && !!VAULT_ADDRESS,
    },
  });

  // Write contracts with error handling
  const { 
    writeContract: approveWrite, 
    isPending: isApproving, 
    data: approveTxHash,
    error: approveError,
    reset: resetApprove
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error("Error al aprobar:", error);
        handleToast({
          id: Date.now().toString(),
          message: `Error al aprobar: ${(error as any).message || (error as any).shortMessage || "Error desconocido"}`,
          type: "error",
        });
      },
    },
  });

  const { 
    writeContract: depositWrite, 
    isPending: isDepositing, 
    data: depositTxHash,
    error: depositError,
    reset: resetDeposit
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error("Error al depositar:", error);
        handleToast({
          id: Date.now().toString(),
          message: `Error al depositar: ${(error as any).message || (error as any).shortMessage || "Error desconocido"}`,
          type: "error",
        });
      },
    },
  });

  const { 
    writeContract: redeemWrite, 
    isPending: isWithdrawing, 
    data: withdrawTxHash,
    error: withdrawError,
    reset: resetWithdraw
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error("Error al retirar:", error);
        handleToast({
          id: Date.now().toString(),
          message: `Error al retirar: ${(error as any).message || (error as any).shortMessage || "Error desconocido"}`,
          type: "error",
        });
      },
    },
  });

  // Wait for transaction receipts
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isLoading: isDepositConfirming } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });
  const { isLoading: isWithdrawConfirming } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });

  const isApprovingFinal = isApproving || isApproveConfirming;
  const isDepositingFinal = isDepositing || isDepositConfirming;
  const isWithdrawingFinal = isWithdrawing || isWithdrawConfirming;

  const handleToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Monitor approve errors
  useEffect(() => {
    if (approveError) {
      console.error("Error de aprobación detectado:", approveError);
    }
  }, [approveError]);

  // Monitor deposit errors
  useEffect(() => {
    if (depositError) {
      console.error("Error de depósito detectado:", depositError);
    }
  }, [depositError]);

  // Handle approve transaction success - automatically trigger deposit if amount is set
  useEffect(() => {
    if (approveTxHash && !isApproveConfirming && depositAmount && parseFloat(depositAmount) > 0 && address && VAULT_ADDRESS) {
      handleToast({
        id: Date.now().toString(),
        message: "Aprobación exitosa, depositando...",
        type: "success",
      });
      
      // Refetch allowance and then trigger deposit
      const triggerDeposit = async () => {
        await refetchAllowance();
        
        // Small delay to ensure allowance is updated on-chain
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const amount = parseUnits(depositAmount, 6);
          console.log("Ejecutando depósito automático después de aprobación...", { amount: amount.toString() });
          
          depositWrite({
            address: VAULT_ADDRESS as `0x${string}`,
            abi: VAULT_ABI,
            functionName: "deposit",
            args: [amount, address],
          });
        } catch (error: any) {
          console.error("Error al depositar después de aprobar:", error);
          handleToast({
            id: Date.now().toString(),
            message: (error as any)?.shortMessage || "Error al depositar después de aprobar",
            type: "error",
          });
        }
      };
      
      triggerDeposit();
    } else if (approveTxHash && !isApproveConfirming) {
      handleToast({
        id: Date.now().toString(),
        message: "Aprobación exitosa",
        type: "success",
      });
      setTimeout(() => refetchAllowance(), 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTxHash, isApproveConfirming]);

  // Handle deposit transaction success
  useEffect(() => {
    if (depositTxHash && !isDepositConfirming) {
      console.log("✅ Deposit transaction confirmed! Hash:", depositTxHash);
      handleToast({
        id: Date.now().toString(),
        message: "Depósito exitoso",
        type: "success",
      });
      setDepositAmount("");
      
      // Multiple refetches with delays to ensure we catch the update
      console.log("🔄 Refreshing balances and shares...");
      setTimeout(() => {
        console.log("⏰ First refetch (2s delay)...");
        refetchBalance();
        refetchShares();
        refetchTotalAssets();
        refetchTotalSupply();
      }, 2000);
      
      setTimeout(() => {
        console.log("⏰ Second refetch (5s delay)...");
        refetchShares();
        refetchTotalAssets();
        refetchTotalSupply();
      }, 5000);
      
      setTimeout(() => {
        console.log("⏰ Final refetch (10s delay)...");
        refetchShares();
        refetchTotalAssets();
        refetchTotalSupply();
      }, 10000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositTxHash, isDepositConfirming]);

  // Handle withdraw transaction success
  useEffect(() => {
    if (withdrawTxHash && !isWithdrawConfirming) {
      handleToast({
        id: Date.now().toString(),
        message: "Retiro exitoso",
        type: "success",
      });
      setWithdrawAmount("");
      setTimeout(() => {
        refetchBalance();
        refetchShares();
        refetchTotalAssets();
      }, 2000); // Refetch after a delay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawTxHash, isWithdrawConfirming]);

  // Simplified: Combined approve + deposit flow
  const handleDeposit = async () => {
    if (!isConnected || !address) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor conecta tu wallet",
        type: "error",
      });
      return;
    }

    // Check if user is on the correct chain and switch if needed
    if (chain?.id !== arbitrumSepolia.id) {
      // If chain is defined but wrong, try to switch
      if (chain && switchChain) {
        try {
          await switchChain({ chainId: arbitrumSepolia.id });
          // Wait a bit for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          // User rejected or error switching
          handleToast({
            id: Date.now().toString(),
            message: "Por favor cambia a Arbitrum Sepolia en MetaMask",
            type: "error",
          });
          return;
        }
      } else {
        // Chain not loaded or switchChain not available - allow to continue
        // wagmi will handle the chain switching when the transaction is sent
        console.warn("Chain not loaded or switch not available, proceeding anyway. Wagmi will handle chain switching.");
      }
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor ingresa un monto válido",
        type: "error",
      });
      return;
    }

    if (!USDC_ADDRESS || !VAULT_ADDRESS || USDC_ADDRESS === "0x0000000000000000000000000000000000000000" || VAULT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      handleToast({
        id: Date.now().toString(),
        message: "Contratos no configurados. Verifica las variables de entorno.",
        type: "error",
      });
      console.error("USDC_ADDRESS:", USDC_ADDRESS, "VAULT_ADDRESS:", VAULT_ADDRESS);
      return;
    }

    // Reset any previous errors
    resetApprove();
    resetDeposit();

    try {
      const amount = parseUnits(depositAmount, 6); // USDC has 6 decimals
      const currentAllowance = allowance || BigInt(0);

      // Step 1: Approve if needed
      if (currentAllowance < amount) {
        console.log("Aprobando USDC...", { 
          amount: amount.toString(), 
          currentAllowance: currentAllowance.toString(),
          usdcAddress: USDC_ADDRESS,
          vaultAddress: VAULT_ADDRESS
        });
        
        handleToast({
          id: Date.now().toString(),
          message: "Confirma la transacción en tu wallet para aprobar USDC",
          type: "info",
        });

        // Call approve - this will trigger MetaMask prompt
        approveWrite({
          address: USDC_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS as `0x${string}`, amount],
        });

        // Note: We return here and let useEffect handle the deposit after approval
        return;
      }

      // Step 2: Deposit
      console.log("Depositando USDC...", { 
        amount: amount.toString(), 
        vaultAddress: VAULT_ADDRESS,
        userAddress: address
      });

      handleToast({
        id: Date.now().toString(),
        message: "Confirma la transacción en tu wallet para depositar",
        type: "info",
      });

      depositWrite({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amount, address],
      });
    } catch (error: any) {
      console.error("Error en handleDeposit:", error);
      const errorMessage = (error as any)?.shortMessage || (error as any)?.message || "Error desconocido";
      handleToast({
        id: Date.now().toString(),
        message: `Error: ${errorMessage}`,
        type: "error",
      });
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor ingresa un monto válido",
        type: "error",
      });
      return;
    }

    if (!VAULT_ADDRESS) {
      handleToast({
        id: Date.now().toString(),
        message: "Contrato vault no configurado",
        type: "error",
      });
      return;
    }

    try {
      // Convert assets to shares for withdrawal
      // For now, we'll use a simple calculation: shares = (assets * totalSupply) / totalAssets
      const assetsAmount = parseUnits(withdrawAmount, 6);
      const totalAssetsValue = totalAssets || BigInt(1);
      const totalSupplyValue = totalSupply || BigInt(1);
      
      // Calculate shares needed: shares = (assets * totalSupply) / totalAssets
      const sharesNeeded = (assetsAmount * totalSupplyValue) / totalAssetsValue;

      if (vaultShares && vaultShares < sharesNeeded) {
        handleToast({
          id: Date.now().toString(),
          message: "No tienes suficientes shares para retirar",
          type: "error",
        });
        return;
      }

      await redeemWrite({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "redeem",
        args: [sharesNeeded, address!, address!],
      });
    } catch (error: any) {
      handleToast({
        id: Date.now().toString(),
        message: (error as any)?.shortMessage || "Error al retirar",
        type: "error",
      });
    }
  };

  // Calculate vault stats
  const totalAssetsFormatted = totalAssets
    ? parseFloat(formatUnits(totalAssets, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
  
  // Get total borrowed from vault's totalReceivables
  const totalBorrowed = totalReceivables
    ? parseFloat(formatUnits(totalReceivables, 6))
    : 0;
  const totalBorrowedFormatted = totalBorrowed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const availableLiquidity = totalAssets
    ? parseFloat(formatUnits(totalAssets, 6)) - totalBorrowed
    : 0;
  const availableLiquidityFormatted = availableLiquidity.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const utilizationRate = totalAssets && totalAssets > BigInt(0)
    ? ((totalBorrowed / parseFloat(formatUnits(totalAssets, 6))) * 100).toFixed(1)
    : "0.0";
  
  const apy = "10.0"; // Fixed 10% APY for demo

  // Format user shares (ERC4626 uses 18 decimals for shares)
  // Note: The raw value is in wei (smallest unit), so we need to divide by 10^18
  const userSharesRaw = vaultShares || BigInt(0);
  const userSharesValue = parseFloat(formatUnits(userSharesRaw, 18));
  
  // Format shares with appropriate precision
  // Show more decimals for very small values to make them visible
  const userSharesFormatted = userSharesValue > 0
    ? userSharesValue < 0.000001  // Less than 0.000001 shares
      ? userSharesValue.toFixed(18).replace(/\.?0+$/, "") // Show up to 18 decimals, remove trailing zeros
      : userSharesValue < 0.01
      ? userSharesValue.toFixed(12).replace(/\.?0+$/, "") // Show 12 decimals for medium small values
      : userSharesValue.toLocaleString(undefined, {
          minimumFractionDigits: 8,  // Increased from 6 to 8 for better visibility
          maximumFractionDigits: 12,  // Increased from 6 to 12 max
        })
    : "0.000000000000000000";  // Show 18 decimal places when zero
  
  // Also calculate what assets these shares represent
  const userAssetsFromShares = vaultShares && totalAssets && totalSupply && totalSupply > BigInt(0)
    ? (vaultShares * totalAssets) / totalSupply
    : BigInt(0);
  
  const userAssetsFormatted = userAssetsFromShares
    ? parseFloat(formatUnits(userAssetsFromShares, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
  
  // Estimate deposit amount: if totalAssets increased significantly, someone deposited
  // Check if vault has assets but user shares are 0 - might be a display delay
  const vaultHasAssets = totalAssets && totalAssets > BigInt(0);
  const vaultHasSupply = totalSupply && totalSupply > BigInt(0);
  
  // If vault has assets/supply but user has no shares visible, check if it's a timing issue
  // This is a heuristic - if vault grew but shares aren't showing, likely just deposited
  const likelyJustDeposited = userSharesRaw === BigInt(0) && vaultHasAssets && vaultHasSupply;
  
  // Debug: Log vault shares to console with more details
  useEffect(() => {
    if (address) {
      console.log("🔍 Vault Shares Debug - Full Details:", {
        userAddress: address,
        vaultAddress: VAULT_ADDRESS,
        vaultSharesRaw: vaultShares?.toString() || "undefined",
        vaultSharesValue: userSharesValue,
        vaultSharesFormatted: userSharesFormatted,
        totalAssets: totalAssets?.toString() || "undefined",
        totalAssetsFormatted: totalAssetsFormatted,
        totalSupply: totalSupply?.toString() || "undefined",
        userAssetsFromShares: userAssetsFromShares?.toString() || "undefined",
        likelyJustDeposited,
        vaultHasAssets,
        vaultHasSupply,
        vaultSharesError: vaultSharesError?.message,
        vaultSharesLoading,
      });
      
      // Check if we should query the vault directly
      if (vaultShares === BigInt(0) || vaultShares === undefined) {
        console.log("⚠️ No shares detected. Possible reasons:");
        console.log("   1. Deposit transaction not confirmed yet");
        console.log("   2. Wrong address being queried");
        console.log("   3. Shares are very small (need to check raw value)");
        console.log("   4. Query issue with wagmi");
        console.log("   5. Address mismatch between deposit receiver and query");
        console.log("");
        console.log("🔍 Query Details:", {
          queryAddress: address,
          vaultAddress: VAULT_ADDRESS,
          sharesError: vaultSharesError?.message,
          sharesLoading: vaultSharesLoading,
        });
        
        // Verify the address that received shares matches the query address
        console.log("💡 Tip: Check the deposit transaction receipt to see which address received the shares");
        console.log("   The deposit function signature is: deposit(uint256 assets, address receiver)");
        console.log(`   You deposited to: ${address}`);
        console.log(`   We're querying balanceOf for: ${address}`);
        
        // Try to manually verify by checking if we can query again
        if (VAULT_ADDRESS && address) {
          console.log("🔄 Attempting manual query verification...");
          refetchShares();
        }
      } else {
        console.log("✅ Shares found! Raw value:", vaultShares.toString());
        console.log("   Formatted:", userSharesFormatted);
      }
      
      // Auto-refetch if we likely just deposited but shares aren't showing
      if (likelyJustDeposited) {
        console.log("🔄 Auto-refreshing shares after deposit...");
        const timeoutId = setTimeout(() => {
          console.log("⏰ Refreshing shares after 3s delay...");
          refetchShares();
          refetchTotalSupply();
        }, 3000); // Wait 3 seconds for block confirmation
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [vaultShares, address, userSharesFormatted, userSharesValue, userAssetsFormatted, userAssetsFromShares, totalAssets, totalSupply, totalAssetsFormatted, likelyJustDeposited, vaultHasAssets, vaultHasSupply, refetchShares, refetchTotalSupply]);

  const usdcBalanceFormatted = usdcBalance
    ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  // Check if approval is needed
  const needsApproval = allowance !== undefined && depositAmount && parseFloat(depositAmount) > 0
    ? allowance < parseUnits(depositAmount, 6)
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Proporcionar Liquidez
            </h1>
            <p className="text-lg text-gray-600">
              Deposita mUSDC en el vault y gana intereses
            </p>
          </div>

          {!isConnected ? (
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                Conecta tu Wallet
              </h2>
              <p className="text-gray-600 mb-6">
                Necesitas conectar tu wallet para comenzar a invertir
              </p>
              <ConnectWallet />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Deposit/Withdraw Forms */}
              <div className="lg:col-span-2 space-y-6">
                {/* Wallet Balances */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Mis Balances
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">USDC en Wallet</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {usdcBalanceFormatted} USDC
                      </div>
                      {(!usdcBalance || parseFloat(usdcBalance.formatted) === 0) && (
                        <div className="text-xs text-gray-500 mt-1">Sin balance</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Shares en Vault</div>
                      {userSharesValue > 0 ? (
                        <>
                          <div className="text-2xl font-bold text-purple-600 font-mono text-lg break-all">
                            {userSharesFormatted} LQFv
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ≈ {userAssetsFormatted} USDC en assets
                          </div>
                        </>
                      ) : likelyJustDeposited ? (
                        <>
                          <div className="text-2xl font-bold text-purple-600">
                            Depósito exitoso ✓
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Las shares se actualizarán en unos segundos...
                          </div>
                          <div className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={() => {
                            refetchShares();
                            refetchTotalAssets();
                            refetchTotalSupply();
                          }}>
                            🔄 Refrescar ahora
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-purple-600 font-mono text-lg">
                            {userSharesFormatted} LQFv
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Sin shares en el vault
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>Dirección:</div>
                    <div className="font-mono text-purple-600 break-all cursor-pointer hover:text-purple-700" 
                         onClick={() => {
                           if (address) {
                             navigator.clipboard.writeText(address);
                             handleToast({
                               id: Date.now().toString(),
                               message: "Dirección copiada al portapapeles",
                               type: "success",
                             });
                           }
                         }}
                         title="Clic para copiar">
                      {address || "No conectado"}
                    </div>
                    <div className="text-gray-400">
                      (Clic para copiar - Usa esta dirección en MetaMask para ver el balance)
                    </div>
                  </div>
                  {(!usdcBalance || parseFloat(usdcBalance.formatted) === 0) && (
                    <div className="mt-4">
                      <RequestMUSDC onToast={handleToast} />
                    </div>
                  )}
                </div>

                {/* Deposit Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-purple-600" />
                    Depositar en el Vault
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad (USDC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                      />
                      {usdcBalance && depositAmount && (
                        <div className="text-xs text-gray-500 mt-1">
                          Balance disponible: {usdcBalanceFormatted} USDC
                        </div>
                      )}
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <div className="text-sm text-gray-600 mb-2">APY Estimado:</div>
                      <div className="text-2xl font-bold text-purple-600">{apy}%</div>
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={!depositAmount || isDepositingFinal || isApprovingFinal || parseFloat(depositAmount) <= 0}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isApprovingFinal ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {isApproving && !approveTxHash ? "Esperando confirmación en MetaMask..." : "Aprobando..."}
                        </>
                      ) : isDepositingFinal ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {isDepositing && !depositTxHash ? "Esperando confirmación en MetaMask..." : "Depositando..."}
                        </>
                      ) : needsApproval ? (
                        "Aprobar y Depositar"
                      ) : (
                        "Depositar"
                      )}
                    </button>
                    {needsApproval && depositAmount && (
                      <p className="text-xs text-gray-500 text-center">
                        Primero se aprobará el monto, luego se depositará automáticamente
                      </p>
                    )}
                    {(approveError || depositError) && (
                      <div className="text-xs text-red-600 text-center mt-2">
                        Error: {approveError?.message || depositError?.message || "Error desconocido"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Withdraw Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-purple-600" />
                    Retirar del Vault
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad (USDC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                      />
                      {totalAssets && (
                        <div className="text-xs text-gray-500 mt-1">
                          Disponible para retirar: ~{availableLiquidityFormatted} USDC
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={!withdrawAmount || isWithdrawingFinal || !vaultShares || vaultShares === BigInt(0)}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isWithdrawingFinal ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Retirando...
                        </>
                      ) : (
                        "Retirar"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Vault Stats */}
              <div className="space-y-6">
                {/* Vault Statistics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Estadísticas del Vault
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Activos Totales</span>
                      <span className="font-semibold text-gray-900">
                        {totalAssetsFormatted} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Prestado</span>
                      <span className="font-semibold text-gray-900">
                        {totalBorrowedFormatted} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Liquidez Disponible</span>
                      <span className="font-semibold text-purple-600">
                        {availableLiquidityFormatted} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tasa de Utilización</span>
                      <span className="font-semibold text-gray-900">{utilizationRate}%</span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">APY Actual</span>
                        <span className="font-bold text-2xl text-purple-600">{apy}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-100">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Cómo Funciona
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Deposita USDC real en el vault</li>
                    <li>• Recibes shares (LQFv tokens)</li>
                    <li>• Tus fondos financian préstamos</li>
                    <li>• Gana intereses del {apy}% anual</li>
                    <li>• Retira cuando quieras</li>
                  </ul>
                </div>

                {/* Risk Warning */}
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    ⚠️ Advertencia de Riesgo
                  </h3>
                  <p className="text-sm text-yellow-800">
                    Las inversiones en DeFi conllevan riesgos. Asegúrate de
                    entender los términos antes de depositar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}
