"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { UploadCFDI } from "@/components/UploadCFDI";
import { MintInvoice } from "@/components/MintInvoice";
import { VaultActions } from "@/components/VaultActions";
import { LoanSummary } from "@/components/LoanSummary";
import { ToastContainer, type Toast } from "@/components/Toast";
import { useAccount } from "wagmi";
import { CheckCircle2, Circle } from "lucide-react";

export default function BorrowPage() {
  const { isConnected } = useAccount();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Only check completed states after component is mounted to prevent hydration mismatch
  const steps = [
    { id: 1, name: "Connect Wallet", completed: mounted && isConnected },
    { id: 2, name: "Upload CFDI", completed: mounted && invoiceId !== null },
    { id: 3, name: "Mint NFT", completed: mounted && tokenId !== null },
    { id: 4, name: "Borrow", completed: mounted && loanId !== null },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Pedir Préstamo con Facturas
            </h1>
            <p className="text-lg text-gray-600">
              Tokeniza tu factura y obtén liquidez instantánea
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
                          ? "bg-purple-600 text-white"
                          : "bg-gray-300 text-gray-500"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="mt-2 text-xs font-medium text-gray-600 text-center">
                      {step.name}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        step.completed
                          ? "bg-purple-600"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Loan Summary - Shows all information */}
          {(invoiceId || tokenId || loanId) && (
            <LoanSummary 
              invoiceId={invoiceId}
              tokenId={tokenId}
              loanId={loanId}
            />
          )}

          {/* Main Content */}
          <div className="space-y-6">
            {/* Step 1: Connect Wallet */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Step 1: Connect Wallet</h2>
              <ConnectWallet />
            </div>

            {/* Step 2: Upload CFDI */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Step 2: Upload CFDI Invoice</h2>
              <UploadCFDI
                onInvoiceUploaded={(id) => setInvoiceId(id)}
                onToast={handleToast}
              />
            </div>

            {/* Step 2.5: KYB Verification */}
            {invoiceId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Step 2.5: KYB Verification</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Verifica tu organización para continuar con el proceso
                </p>
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
                        message: `KYB Score: ${data.score}/100 (${data.status === "approved" ? "Aprobado" : "Pendiente"})`,
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  Run KYB Check
                </button>
              </div>
            )}

            {/* Step 3: Mint NFT */}
            {invoiceId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Step 3: Mint Invoice NFT</h2>
                <MintInvoice
                  invoiceId={invoiceId}
                  onMinted={(tid) => setTokenId(tid)}
                  onToast={handleToast}
                />
              </div>
            )}

            {/* Step 4: Borrow */}
            {tokenId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Step 4: Deposit & Borrow</h2>
                <VaultActions
                  tokenId={tokenId}
                  onBorrowed={(lid) => setLoanId(lid)}
                  onToast={handleToast}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}

