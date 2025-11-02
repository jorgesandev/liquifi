"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { RequestMUSDC } from "@/components/RequestMUSDC";
import { ToastContainer, type Toast } from "@/components/Toast";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { TrendingUp, DollarSign, PieChart, ArrowDownCircle, ArrowUpCircle, History, RefreshCw } from "lucide-react";

// Contract addresses from environment
// Note: Using REAL USDC from Arbitrum Sepolia (checksum: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
// For hackathon: Real USDC from Circle (user's USDC address)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Real USDC on Arbitrum Sepolia
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// ERC20 ABI (for approve and balance)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
] as const;

// ERC4626 Vault ABI
const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)",
  "function totalAssets() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function asset() external view returns (address)",
] as const;

export default function InvestPage() {
  const { address, isConnected, chain } = useAccount();
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
  const { data: vaultShares, refetch: refetchShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!VAULT_ADDRESS,
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

  // Read vault total supply (total shares)
  const { data: totalSupply } = useReadContract({
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

  // Write contracts
  const { writeContract: approveWrite, isPending: isApproving, data: approveTxHash } = useWriteContract();
  const { writeContract: depositWrite, isPending: isDepositing, data: depositTxHash } = useWriteContract();
  const { writeContract: redeemWrite, isPending: isWithdrawing, data: withdrawTxHash } = useWriteContract();

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

  // Handle approve transaction success
  useEffect(() => {
    if (approveTxHash && !isApproveConfirming) {
      handleToast({
        id: Date.now().toString(),
        message: "Aprobación exitosa",
        type: "success",
      });
      setTimeout(() => refetchAllowance(), 2000); // Refetch after a delay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTxHash, isApproveConfirming]);

  // Handle deposit transaction success
  useEffect(() => {
    if (depositTxHash && !isDepositConfirming) {
      handleToast({
        id: Date.now().toString(),
        message: "Depósito exitoso",
        type: "success",
      });
      setDepositAmount("");
      setTimeout(() => {
        refetchBalance();
        refetchShares();
        refetchTotalAssets();
      }, 2000); // Refetch after a delay
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

  const handleApprove = async () => {
    if (!isConnected || !depositAmount || parseFloat(depositAmount) <= 0) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor ingresa un monto válido",
        type: "error",
      });
      return;
    }

    try {
      const amount = parseUnits(depositAmount, 6); // USDC has 6 decimals
      
      await approveWrite({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VAULT_ADDRESS as `0x${string}`, amount],
      });
    } catch (error: any) {
      handleToast({
        id: Date.now().toString(),
        message: error?.shortMessage || "Error al aprobar",
        type: "error",
      });
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !depositAmount || parseFloat(depositAmount) <= 0) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor ingresa un monto válido",
        type: "error",
      });
      return;
    }

    if (!USDC_ADDRESS || !VAULT_ADDRESS) {
      handleToast({
        id: Date.now().toString(),
        message: "Contratos no configurados",
        type: "error",
      });
      return;
    }

    try {
      const amount = parseUnits(depositAmount, 6); // USDC has 6 decimals
      const currentAllowance = allowance || 0n;

      if (currentAllowance < amount) {
        handleToast({
          id: Date.now().toString(),
          message: "Primero debes aprobar el monto",
          type: "error",
        });
        return;
      }

      await depositWrite({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amount, address!],
      });
    } catch (error: any) {
      handleToast({
        id: Date.now().toString(),
        message: error?.shortMessage || "Error al depositar",
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
      const totalAssetsValue = totalAssets || 1n;
      const totalSupplyValue = totalSupply || 1n;
      
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
        message: error?.shortMessage || "Error al retirar",
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
  
  const totalBorrowed = 0; // TODO: Get from LoanManager
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
  
  const utilizationRate = totalAssets && totalAssets > 0n
    ? ((totalBorrowed / parseFloat(formatUnits(totalAssets, 6))) * 100).toFixed(1)
    : "0.0";
  
  const apy = "10.0"; // Fixed 10% APY for demo

  const userSharesFormatted = vaultShares
    ? parseFloat(formatUnits(vaultShares, 18)).toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })
    : "0.0000";

  const usdcBalanceFormatted = usdcBalance
    ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const needsApproval = allowance && depositAmount
    ? allowance < parseUnits(depositAmount, 6)
    : true;

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
                      <div className="text-2xl font-bold text-purple-600">
                        {userSharesFormatted} LQFv
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Dirección: {address?.slice(0, 6)}...{address?.slice(-4)}
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
                    <div className="flex gap-2">
                      {needsApproval && depositAmount && parseFloat(depositAmount) > 0 ? (
                        <button
                          onClick={handleApprove}
                          disabled={isApprovingFinal || !depositAmount}
                          className="flex-1 px-6 py-3 bg-purple-400 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                        >
                        {isApprovingFinal ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Aprobando...
                          </>
                        ) : (
                          "Aprobar USDC"
                        )}
                        </button>
                      ) : null}
                      <button
                        onClick={handleDeposit}
                        disabled={!depositAmount || isDepositingFinal || needsApproval}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isDepositingFinal ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Depositando...
                          </>
                        ) : (
                          "Depositar"
                        )}
                      </button>
                    </div>
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
                      disabled={!withdrawAmount || isWithdrawingFinal || !vaultShares || vaultShares === 0n}
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
