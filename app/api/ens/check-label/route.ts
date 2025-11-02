import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Validate ENS label format
 */
function validateENSLabel(label: string): { valid: boolean; error?: string } {
  if (!label) {
    return { valid: false, error: "El nombre de usuario es requerido" };
  }
  
  if (label.length < 3) {
    return { valid: false, error: "El nombre debe tener al menos 3 caracteres" };
  }
  
  if (label.length > 50) {
    return { valid: false, error: "El nombre no puede exceder 50 caracteres" };
  }
  
  // Only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(label)) {
    return { valid: false, error: "Solo se permiten letras minúsculas, números y guiones" };
  }
  
  // Cannot start or end with hyphen
  if (label.startsWith("-") || label.endsWith("-")) {
    return { valid: false, error: "El nombre no puede empezar o terminar con guión" };
  }
  
  // Cannot have consecutive hyphens
  if (label.includes("--")) {
    return { valid: false, error: "No se permiten guiones consecutivos" };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ens_label } = body;

    if (!ens_label) {
      return NextResponse.json(
        { error: "ens_label is required" },
        { status: 400 }
      );
    }

    // Normalize label (lowercase)
    const normalizedLabel = ens_label.toLowerCase().trim();

    // Validate format
    const validation = validateENSLabel(normalizedLabel);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, available: false },
        { status: 400 }
      );
    }

    // Check if label is already registered in Supabase
    const { data: existing, error } = await supabase
      .from("kyb_results")
      .select("ens_label")
      .eq("ens_label", normalizedLabel)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is fine
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Error checking label availability" },
        { status: 500 }
      );
    }

    // If found, label is not available
    if (existing) {
      return NextResponse.json({
        available: false,
        message: "Este nombre ya está registrado",
      });
    }

    return NextResponse.json({
      available: true,
      label: normalizedLabel,
      full_domain: `${normalizedLabel}.liquifidev.eth`,
    });
  } catch (error) {
    console.error("Check label error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

