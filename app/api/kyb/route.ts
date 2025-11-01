import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    // Mock KYB: random score between 80-100
    const kybScore = Math.floor(Math.random() * 21) + 80; // 80-100
    const kybStatus = kybScore >= 85 ? "approved" : "pending";

    // Upsert KYB result
    const { data, error } = await supabase
      .from("kyb_results")
      .upsert(
        {
          org_id,
          score: kybScore,
          status: kybStatus,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "org_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save KYB result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      org_id: data.org_id,
      score: data.score,
      status: data.status,
    });
  } catch (error) {
    console.error("KYB error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

