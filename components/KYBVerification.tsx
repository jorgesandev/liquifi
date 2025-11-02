"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface KYBVerificationProps {
  orgId: string;
  invoiceId: string | null;
  onKYBComplete?: (data: {
    score: number;
    status: string;
    ensLabel?: string;
    fullDomain?: string;
    ensRegistered?: boolean;
  }) => void;
  onToast?: (toast: { id: string; message: string; type: "success" | "error" | "info" }) => void;
}

export function KYBVerification({
  orgId,
  invoiceId,
  onKYBComplete,
  onToast,
}: KYBVerificationProps) {
  const { address } = useAccount();
  const [ensLabel, setEnsLabel] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [kybData, setKybData] = useState<{
    score?: number;
    status?: string;
    ensLabel?: string;
    fullDomain?: string;
    ensRegistered?: boolean;
  } | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Validate ENS label format
  const validateLabel = (label: string): string | null => {
    if (!label) return "El nombre de usuario es requerido";
    if (label.length < 3) return "El nombre debe tener al menos 3 caracteres";
    if (label.length > 50) return "El nombre no puede exceder 50 caracteres";
    if (!/^[a-z0-9-]+$/.test(label.toLowerCase())) {
      return "Solo se permiten letras minúsculas, números y guiones";
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return "El nombre no puede empezar o terminar con guión";
    }
    return null;
  };

  const handleLabelChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setEnsLabel(normalized);
    setLabelError(null);
  };

  const checkLabelAvailability = async () => {
    if (!ensLabel) {
      setLabelError("Ingresa un nombre de usuario");
      return;
    }

    const error = validateLabel(ensLabel);
    if (error) {
      setLabelError(error);
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch("/api/ens/check-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ens_label: ensLabel }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLabelError(data.error || "Error verificando disponibilidad");
        onToast?.({
          id: Date.now().toString(),
          message: data.error || "Error verificando disponibilidad",
          type: "error",
        });
      } else {
        if (!data.available) {
          setLabelError("Este nombre ya está registrado");
        } else {
          setLabelError(null);
          onToast?.({
            id: Date.now().toString(),
            message: `✓ ${ensLabel}.liquifidev.eth está disponible`,
            type: "success",
          });
        }
      }
    } catch (error) {
      setLabelError("Error verificando disponibilidad");
      onToast?.({
        id: Date.now().toString(),
        message: "Error verificando disponibilidad del nombre",
        type: "error",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleKYBCheck = async () => {
    if (!ensLabel) {
      setLabelError("Ingresa un nombre de usuario ENS primero");
      return;
    }

    const error = validateLabel(ensLabel);
    if (error) {
      setLabelError(error);
      return;
    }

    if (!address) {
      onToast?.({
        id: Date.now().toString(),
        message: "Conecta tu wallet primero",
        type: "error",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch("/api/kyb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          ens_label: ensLabel,
          owner_address: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        onToast?.({
          id: Date.now().toString(),
          message: data.error || "Error en verificación KYB",
          type: "error",
        });
      } else {
        const kybResult = {
          score: data.score,
          status: data.status,
          ensLabel: data.ens_label,
          fullDomain: data.full_domain,
          ensRegistered: data.ens_registered,
        };
        setKybData(kybResult);
        onKYBComplete?.(kybResult);
        onToast?.({
          id: Date.now().toString(),
          message: data.ens_registered
            ? `✅ KYB Aprobado! Subdominio registrado: ${data.full_domain}`
            : `KYB Score: ${data.score}/100 (${data.status === "approved" ? "Aprobado" : "Pendiente"})`,
          type: data.status === "approved" ? "success" : "info",
        });
      }
    } catch (error) {
      onToast?.({
        id: Date.now().toString(),
        message: "Error en verificación KYB",
        type: "error",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ENS Label Input */}
      <div>
        <label htmlFor="ens-label" className="block text-sm font-medium text-gray-700 mb-2">
          Nombre de Usuario ENS
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              id="ens-label"
              type="text"
              value={ensLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="ej: negociomuebles"
              className={`w-full px-4 py-2 border rounded-lg ${
                labelError ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              disabled={isRegistering || !!kybData?.ensRegistered}
            />
            {ensLabel && (
              <p className="mt-1 text-sm text-gray-500">
                Tu dominio será: <span className="font-mono">{ensLabel}.liquifidev.eth</span>
              </p>
            )}
            {labelError && (
              <p className="mt-1 text-sm text-red-600">{labelError}</p>
            )}
          </div>
          <button
            onClick={checkLabelAvailability}
            disabled={!ensLabel || isChecking || isRegistering}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Verificar"
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Este nombre será tu identidad permanente en LiquiFi. Solo letras minúsculas, números y guiones.
        </p>
      </div>

      {/* KYB Status */}
      {kybData && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            {kybData.status === "approved" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-semibold text-gray-900">
              KYB Score: {kybData.score}/100 ({kybData.status === "approved" ? "Aprobado" : "Pendiente"})
            </span>
          </div>
          {kybData.ensRegistered && kybData.fullDomain && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800">
                ✅ Subdominio registrado: <span className="font-mono font-semibold">{kybData.fullDomain}</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Tu empresa ya está verificada. No necesitarás KYB en préstamos futuros.
              </p>
            </div>
          )}
        </div>
      )}

      {/* KYB Button */}
      {!kybData?.ensRegistered && (
        <button
          onClick={handleKYBCheck}
          disabled={!ensLabel || !!labelError || isRegistering || !address}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRegistering ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Registrando subdominio ENS...</span>
            </>
          ) : (
            "Ejecutar KYB y Registrar Subdominio"
          )}
        </button>
      )}
    </div>
  );
}

