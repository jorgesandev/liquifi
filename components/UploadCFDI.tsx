"use client";

import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import { useAccount } from "wagmi";
import type { Toast } from "./Toast";

interface UploadCFDIProps {
  onInvoiceUploaded: (invoiceId: string) => void;
  onToast: (toast: Toast) => void;
}

export function UploadCFDI({ onInvoiceUploaded, onToast }: UploadCFDIProps) {
  const { address } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedInvoice, setUploadedInvoice] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !address) {
      onToast({
        id: Date.now().toString(),
        message: "Por favor selecciona un archivo y conecta tu wallet",
        type: "error",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir");
      }

      const data = await response.json();
      setUploadedInvoice(data.invoice_id);
      onInvoiceUploaded(data.invoice_id);

      onToast({
        id: Date.now().toString(),
        message: "Factura subida exitosamente",
        type: "success",
      });
    } catch (error) {
      onToast({
        id: Date.now().toString(),
        message: "Error al subir factura",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-lg">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        <h3 className="font-semibold">Subir Factura CFDI</h3>
      </div>

      {uploadedInvoice ? (
        <div className="text-sm text-purple-600">
          ID de Factura: {uploadedInvoice}
        </div>
      ) : (
        <>
          <input
            type="file"
            accept=".xml,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Subiendo..." : "Subir"}
          </button>
        </>
      )}
    </div>
  );
}

