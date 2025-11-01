"use client";

import { useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { UploadCFDI } from "@/components/UploadCFDI";
import { MintInvoice } from "@/components/MintInvoice";
import { VaultActions } from "@/components/VaultActions";
import { ToastContainer, type Toast } from "@/components/Toast";
import { useAccount } from "wagmi";
import { CheckCircle2, Circle } from "lucide-react";

export default function Home() {
  const { isConnected } = useAccount();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const steps = [
    { id: 1, name: "Connect Wallet", completed: isConnected },
    { id: 2, name: "Upload CFDI", completed: invoiceId !== null },
    { id: 3, name: "Mint NFT", completed: tokenId !== null },
    { id: 4, name: "Borrow", completed: loanId !== null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            LiquiFi
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Decentralized Invoice Financing Platform
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.completed
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                    {step.name}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step.completed
                        ? "bg-green-500"
                        : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Connect Wallet */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Connect Wallet</h2>
            <ConnectWallet />
          </div>

          {/* Step 2: Upload CFDI */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Upload CFDI Invoice</h2>
            <UploadCFDI
              onInvoiceUploaded={(id) => setInvoiceId(id)}
              onToast={handleToast}
            />
          </div>

          {/* Step 3: KYB Button */}
          {invoiceId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">KYB Verification</h2>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/kyb", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ org_id: `org_${invoiceId}` }),
                    });
                    const data = await response.json();
                    handleToast({
                      id: Date.now().toString(),
                      message: `KYB Score: ${data.score} (${data.status})`,
                      type: data.status === "approved" ? "success" : "info",
                    });
                  } catch (error) {
                    handleToast({
                      id: Date.now().toString(),
                      message: "KYB verification failed",
                      type: "error",
                    });
                  }
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Run KYB Check
              </button>
            </div>
          )}

          {/* Step 3: Mint NFT */}
          {invoiceId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Step 3: Mint Invoice NFT</h2>
              <MintInvoice
                invoiceId={invoiceId}
                onMinted={(tid) => setTokenId(tid)}
                onToast={handleToast}
              />
            </div>
          )}

          {/* Step 4: Borrow */}
          {tokenId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Step 4: Deposit & Borrow</h2>
              <VaultActions
                tokenId={tokenId}
                onBorrowed={(lid) => setLoanId(lid)}
                onToast={handleToast}
              />
            </div>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}
