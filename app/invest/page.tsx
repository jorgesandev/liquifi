"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ToastContainer, type Toast } from "@/components/Toast";
import { useAccount, useBalance } from "wagmi";
import { TrendingUp, DollarSign, PieChart, ArrowDownCircle, History } from "lucide-react";

export default function InvestPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeposit = async () => {
    if (!isConnected || !depositAmount || parseFloat(depositAmount) <= 0) {
      handleToast({
        id: Date.now().toString(),
        message: "Por favor conecta tu wallet e ingresa un monto válido",
        type: "error",
      });
      return;
    }

    setIsDepositing(true);
    try {
      // TODO: Implement vault deposit API
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate
      handleToast({
        id: Date.now().toString(),
        message: `Depósito de ${depositAmount} ETH exitoso`,
        type: "success",
      });
      setDepositAmount("");
    } catch (error) {
      handleToast({
        id: Date.now().toString(),
        message: "Error al depositar fondos",
        type: "error",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  // Mock data - TODO: Fetch from contracts/API
  const vaultStats = {
    totalAssets: "125.5 ETH",
    totalBorrowed: "87.85 ETH",
    utilizationRate: "70%",
    apy: "12.5%",
    availableLiquidity: "37.65 ETH",
  };

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
              Deposita fondos en el vault y gana intereses
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
              {/* Left Column - Deposit Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Wallet Balance */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Balance de Wallet
                  </h2>
                  <div className="text-3xl font-bold text-purple-600">
                    {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : "0.0000 ETH"}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Dirección: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
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
                        Cantidad (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                      />
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <div className="text-sm text-gray-600 mb-2">
                        APY Estimado:
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {vaultStats.apy}
                      </div>
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={!depositAmount || isDepositing}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isDepositing ? "Depositando..." : "Depositar"}
                    </button>
                  </div>
                </div>

                {/* Investment History */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    Historial de Inversiones
                  </h2>
                  <div className="text-center py-8 text-gray-500">
                    No hay transacciones aún
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
                      <span className="text-gray-600">
                        Activos Totales
                      </span>
                      <span className="font-semibold text-gray-900">
                        {vaultStats.totalAssets}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Prestado
                      </span>
                      <span className="font-semibold text-gray-900">
                        {vaultStats.totalBorrowed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Liquidez Disponible
                      </span>
                      <span className="font-semibold text-purple-600">
                        {vaultStats.availableLiquidity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Tasa de Utilización
                      </span>
                      <span className="font-semibold text-gray-900">
                        {vaultStats.utilizationRate}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          APY Actual
                        </span>
                        <span className="font-bold text-2xl text-purple-600">
                          {vaultStats.apy}
                        </span>
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
                    <li>• Deposita ETH en el vault</li>
                    <li>• Tus fondos financian préstamos</li>
                    <li>• Gana intereses del 10% anual</li>
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

