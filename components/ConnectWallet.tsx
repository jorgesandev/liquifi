"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, X } from "lucide-react";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const injectedConnector = connectors.find((c) => c.id === "injected");

  const handleConnect = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Show loading state during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg flex items-center gap-2 shadow-sm text-sm whitespace-nowrap"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-mono text-gray-900 font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending || !injectedConnector}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm text-sm whitespace-nowrap"
    >
      <Wallet className="w-4 h-4" />
      {isPending ? "Connecting..." : "Connect"}
    </button>
  );
}

