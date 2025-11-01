import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileContent = buffer.toString("utf-8");

    // Generate CFDI hash
    const cfdiHash = createHash("sha256").update(buffer).digest("hex");

    // Parse basic invoice metadata (simplified - in production, parse XML properly)
    // For MVP, we'll extract what we can or use defaults
    const orgId = "org_" + Date.now();
    const amount = Math.floor(Math.random() * 100000) + 10000; // Mock amount
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
    const debtorName = "Debtor Corp " + Date.now();

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
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoice_id: data.id,
      cfdi_hash: cfdiHash,
      amount,
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

