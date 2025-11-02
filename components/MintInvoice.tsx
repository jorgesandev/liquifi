"use client";

import { useState } from "react";
import { Coins, CheckCircle } from "lucide-react";
import { useAccount } from "wagmi";
import type { Toast } from "./Toast";

interface MintInvoiceProps {
  invoiceId: string | null;
  onMinted: (tokenId: string, txHash: string) => void;
  onToast: (toast: Toast) => void;
}

export function MintInvoice({
  invoiceId,
  onMinted,
  onToast,
}: MintInvoiceProps) {
  const { address } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [mintedToken, setMintedToken] = useState<{
    tokenId: string;
    txHash: string;
  } | null>(null);

  const handleMint = async () => {
    if (!invoiceId || !address) {
      onToast({
        id: Date.now().toString(),
        message: "Por favor sube una factura primero y conecta tu wallet",
        type: "error",
      });
      return;
    }

    setIsMinting(true);

    try {
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      if (!response.ok) {
        throw new Error("Error al mintear");
      }

      const data = await response.json();
      setMintedToken({ tokenId: data.tokenId, txHash: data.txHash });
      onMinted(data.tokenId, data.txHash);

      onToast({
        id: Date.now().toString(),
        message: "NFT de factura minteado exitosamente",
        type: "success",
      });
    } catch (error) {
      onToast({
        id: Date.now().toString(),
        message: "Error al mintear NFT de factura",
        type: "error",
      });
    } finally {
      setIsMinting(false);
    }
  };

  if (mintedToken) {
    return (
      <div className="flex flex-col gap-4 p-6 border rounded-lg">
        <div className="flex items-center gap-2 text-purple-600">
          <CheckCircle className="w-5 h-5" />
          <h3 className="font-semibold">NFT Minteado</h3>
        </div>
        <div className="text-sm space-y-1">
          <div>ID del Token: {mintedToken.tokenId}</div>
          <div className="font-mono text-xs break-all text-gray-600">
            TX: {mintedToken.txHash}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-lg">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5" />
        <h3 className="font-semibold">Mintear NFT de Factura</h3>
      </div>

      <button
        onClick={handleMint}
        disabled={!invoiceId || isMinting}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Coins className="w-4 h-4" />
        {isMinting ? "Minteando..." : "Mintear NFT"}
      </button>
    </div>
  );
}

