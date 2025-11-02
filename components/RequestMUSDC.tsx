"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Coins, RefreshCw } from "lucide-react";
import type { Toast } from "./Toast";

interface RequestMUSDCProps {
  onToast: (toast: Toast) => void;
}

export function RequestMUSDC({ onToast }: RequestMUSDCProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const { address } = useAccount();

  const handleRequest = async () => {
    if (!address) {
      onToast({
        id: Date.now().toString(),
        message: "Por favor conecta tu wallet primero",
        type: "error",
      });
      return;
    }

    setIsRequesting(true);

    try {
      const response = await fetch("/api/mint-musdc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address,
          amount: "1000", // Request 1000 mUSDC
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al solicitar mUSDC");
      }

      onToast({
        id: Date.now().toString(),
        message: `¡${data.amount} mUSDC minteados exitosamente! TX: ${data.txHash.slice(0, 10)}...`,
        type: "success",
      });

      // Refresh page after 2 seconds to update balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      onToast({
        id: Date.now().toString(),
        message: error.message || "Error al solicitar mUSDC",
        type: "error",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
      <div className="flex items-center gap-2 mb-2">
        <Coins className="w-5 h-5 text-yellow-600" />
        <h3 className="font-semibold text-yellow-900">¿Necesitas USDC?</h3>
      </div>
      <p className="text-sm text-yellow-800 mb-3">
        Para depositar en el vault, necesitas USDC real de Arbitrum Sepolia.
        Obtén USDC de testnet desde un faucet.
      </p>
      <p className="text-xs text-yellow-700 mb-3">
        <strong>Nota:</strong> El vault usa USDC real de Circle en Arbitrum Sepolia.
        Dirección: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
      </p>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        Obtener USDC de Circle Faucet
      </a>
    </div>
  );
}

