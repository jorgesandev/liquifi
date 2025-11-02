"use client";

import { useState, useEffect } from "react";
import { FileText, DollarSign, Percent, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface LoanSummaryProps {
  invoiceId: string | null;
  tokenId: string | null;
  loanId: string | null;
}

interface InvoiceData {
  id: string;
  amount: number;
  due_date: string;
  debtor_name: string;
  cfdi_hash: string;
  status: string;
  nft_token_id: string | null;
}

interface KYBData {
  score: number;
  status: string;
}

interface LoanData {
  loan_id: string;
  amount: string;
  tx_hash: string;
  status: string;
}

export function LoanSummary({ invoiceId, tokenId, loanId }: LoanSummaryProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [kyb, setKyb] = useState<KYBData | null>(null);
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoice) {
      fetchKYB();
    }
  }, [invoice]);

  useEffect(() => {
    if (loanId) {
      fetchLoan();
    }
  }, [loanId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKYB = async () => {
    if (!invoice || !invoiceId) return;
    try {
      // Generate org_id from invoiceId (matches the pattern used in the backend)
      const org_id = `org_${invoiceId}`;
      const response = await fetch("/api/kyb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id }),
      });
      if (response.ok) {
        const data = await response.json();
        setKyb(data);
      }
    } catch (error) {
      console.error("Error fetching KYB:", error);
    }
  };

  const fetchLoan = async () => {
    if (!loanId) return;
    try {
      // Get loan from Supabase or contract
      // For now, we'll construct from loanId
      setLoan({
        loan_id: loanId,
        amount: "0", // Will be fetched from contract
        tx_hash: "",
        status: "active",
      });
    } catch (error) {
      console.error("Error fetching loan:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-gray-500">Cargando información...</div>
      </div>
    );
  }

  if (!invoice) return null;

  // Invoice amount in Supabase is stored as integer (e.g., 50000 = 50000 units)
  // When minted to contract, it's sent as BigInt directly (with 6 decimals: 50000 = 0.05 USDC)
  // For display: invoice.amount / 1e6 = USDC amount
  const invoiceAmountInUSDC = invoice.amount / 1e6; // Convert base units to USDC
  const invoiceAmount = invoiceAmountInUSDC; // For display
  
  // Calculate loan amount based on 70% LTV
  const maxLoanAmountInUSDC = invoiceAmountInUSDC * 0.70; // 70% LTV
  const borrowAmount = maxLoanAmountInUSDC;
  
  const isApproved = kyb?.status === "approved" || (kyb?.score !== undefined && kyb.score >= 80);
  const isInvoiceValidated = invoice.status === "minted" || invoice.nft_token_id !== null;
  const isLoanActive = loan?.status === "active";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-600" />
        Resumen del Préstamo
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Información de la Factura</h4>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monto de Factura:
            </span>
            <span className="font-semibold text-gray-900">
              ${invoiceAmount.toFixed(6)} USDC
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Deudor:</span>
            <span className="font-medium text-gray-900">{invoice.debtor_name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Fecha de Vencimiento:</span>
            <span className="font-medium text-gray-900">
              {new Date(invoice.due_date).toLocaleDateString("es-MX")}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Estado:</span>
            <div className="flex items-center gap-2">
              {isInvoiceValidated ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">Validada</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Pendiente</span>
                </>
              )}
            </div>
          </div>

          {tokenId && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ID del Token:</span>
              <span className="font-mono text-sm text-gray-900">{tokenId}</span>
            </div>
          )}
        </div>

        {/* KYB & Loan Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Verificación y Préstamo</h4>
          
          {kyb ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Score KYB:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    kyb.score >= 80 ? "text-green-600" : 
                    kyb.score >= 60 ? "text-yellow-600" : 
                    "text-red-600"
                  }`}>
                    {kyb.score}/100
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estado KYB:</span>
                <div className="flex items-center gap-2">
                  {isApproved ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Aprobado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 font-medium">Rechazado</span>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">
              <Clock className="w-4 h-4 inline mr-2" />
              KYB pendiente
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              LTV Máximo:
            </span>
            <span className="font-semibold text-gray-900">70%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monto del Préstamo:</span>
              <span className="font-bold text-purple-600">
                {borrowAmount.toFixed(6)} USDC
              </span>
            </div>
            <div className="text-xs text-gray-500 italic text-right">
              * Calculado al 70% LTV del valor de la factura
            </div>
          </div>

          {loan && (
            <>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">ID del Préstamo:</span>
                <span className="font-mono text-sm text-gray-900">{loan.loan_id}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estado del Préstamo:</span>
                <div className="flex items-center gap-2">
                  {isLoanActive ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Activo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">Inactivo</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {!loan && isApproved && isInvoiceValidated && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Listo para solicitar préstamo
            </div>
          )}
        </div>
      </div>

      {/* CFDI Hash */}
      {invoice.cfdi_hash && (
        <div className="mt-6 pt-4 border-t">
          <div className="text-xs text-gray-500">
            <span className="font-medium">CFDI Hash: </span>
            <span className="font-mono break-all">{invoice.cfdi_hash}</span>
          </div>
        </div>
      )}
    </div>
  );
}

