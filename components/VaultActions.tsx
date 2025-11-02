"use client";

import { useState } from "react";
import { PiggyBank, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useAccount } from "wagmi";
import type { Toast } from "./Toast";

interface VaultActionsProps {
  tokenId: string | null;
  onBorrowed: (loanId: string, txHash: string) => void;
  onToast: (toast: Toast) => void;
}

export function VaultActions({
  tokenId,
  onBorrowed,
  onToast,
}: VaultActionsProps) {
  const { address } = useAccount();
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [loanInfo, setLoanInfo] = useState<{
    loanId: string;
    txHash: string;
  } | null>(null);

  const handleBorrow = async () => {
    if (!tokenId || !address) {
      onToast({
        id: Date.now().toString(),
        message: "Por favor mintea un NFT primero y conecta tu wallet",
        type: "error",
      });
      return;
    }

    setIsBorrowing(true);

    try {
      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Error al pedir préstamo");
      }

      setLoanInfo({ loanId: data.loanId, txHash: data.txHash });
      onBorrowed(data.loanId, data.txHash);

      onToast({
        id: Date.now().toString(),
        message: `Préstamo aprobado: ${(Number(data.amount) / 1e6).toLocaleString()} USDC`,
        type: "success",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Error al pedir préstamo";
      onToast({
        id: Date.now().toString(),
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsBorrowing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-lg">
      <div className="flex items-center gap-2">
        <PiggyBank className="w-5 h-5" />
        <h3 className="font-semibold">Acciones del Vault</h3>
      </div>

      {loanInfo ? (
        <div className="text-sm space-y-1">
          <div className="text-purple-600">
            ID del Préstamo: {loanInfo.loanId}
          </div>
          <div className="font-mono text-xs break-all text-gray-600">
            TX: {loanInfo.txHash}
          </div>
        </div>
      ) : (
        <button
          onClick={handleBorrow}
          disabled={!tokenId || isBorrowing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          <ArrowDownCircle className="w-4 h-4" />
          {isBorrowing ? "Procesando..." : "Depositar y Pedir Préstamo"}
        </button>
      )}
    </div>
  );
}

