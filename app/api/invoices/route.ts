import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    console.log("📁 Starting invoice upload...");
    
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("❌ No file provided");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("📄 File received:", file.name, "Size:", file.size, "bytes");

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    if (buffer.length === 0) {
      console.error("❌ File is empty");
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Generate CFDI hash
    const cfdiHash = createHash("sha256").update(buffer).digest("hex");
    console.log("🔐 Generated hash:", cfdiHash.substring(0, 16) + "...");

    // Parse basic invoice metadata (simplified - in production, parse XML properly)
    // For MVP, we'll extract what we can or use defaults
    const orgId = "org_" + Date.now();
    const amount = Math.floor(Math.random() * 100000) + 10000; // Mock amount
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
    const debtorName = "Debtor Corp " + Date.now();

    console.log("💾 Preparing to insert invoice:", { orgId, amount, debtorName });

    // Check if invoice with this hash already exists
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("cfdi_hash", cfdiHash)
      .single();

    if (existingInvoice) {
      console.log("⚠️ Invoice with this hash already exists, returning existing:", existingInvoice.id);
      return NextResponse.json({
        invoice_id: existingInvoice.id,
        cfdi_hash: cfdiHash,
        amount: existingInvoice.amount,
        message: "Invoice already exists",
      });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        org_id: orgId,
        amount: amount,
        due_date: dueDate.toISOString(),
        debtor_name: debtorName,
        cfdi_hash: cfdiHash,
        status: "uploaded",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate key error gracefully
      if (error.code === "23505" && error.message.includes("cfdi_hash")) {
        console.log("⚠️ Duplicate invoice hash, fetching existing invoice...");
        const { data: duplicateInvoice } = await supabase
          .from("invoices")
          .select("*")
          .eq("cfdi_hash", cfdiHash)
          .single();

        if (duplicateInvoice) {
          return NextResponse.json({
            invoice_id: duplicateInvoice.id,
            cfdi_hash: cfdiHash,
            amount: duplicateInvoice.amount,
            message: "Invoice already exists",
          });
        }
      }

      console.error("Supabase error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: "Failed to save invoice",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    console.log("✅ Invoice saved successfully, ID:", data.id);

    return NextResponse.json({
      invoice_id: data.id,
      cfdi_hash: cfdiHash,
      amount,
    });
  } catch (error: any) {
    console.error("Invoice upload error:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error?.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

