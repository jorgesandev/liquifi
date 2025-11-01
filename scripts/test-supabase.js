#!/usr/bin/env node

/**
 * Test script to verify Supabase connection and table setup
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: Missing Supabase environment variables");
  console.log("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  console.log("🔗 Testing Supabase connection...\n");

  try {
    // Test 1: Check if invoices table exists
    console.log("1. Checking invoices table...");
    const { data, error } = await supabase
      .from("invoices")
      .select("id")
      .limit(1);

    if (error) {
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        console.log("❌ Error: 'invoices' table does not exist!");
        console.log("\nPlease run this SQL in your Supabase SQL Editor:\n");
        console.log(`
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  debtor_name TEXT NOT NULL,
  cfdi_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'uploaded',
  nft_token_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_cfdi_hash ON invoices(cfdi_hash);
CREATE INDEX idx_invoices_nft_token_id ON invoices(nft_token_id);
        `);
        return false;
      }
      console.log("❌ Error:", error.message);
      return false;
    }

    console.log("✅ Invoices table exists");

    // Test 2: Try a test insert
    console.log("\n2. Testing insert...");
    const testHash = "test_" + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from("invoices")
      .insert({
        org_id: "test_org",
        amount: 1000,
        due_date: new Date().toISOString(),
        debtor_name: "Test Debtor",
        cfdi_hash: testHash,
        status: "uploaded",
      })
      .select()
      .single();

    if (insertError) {
      console.log("❌ Insert failed:", insertError.message);
      console.log("Code:", insertError.code);
      console.log("Hint:", insertError.hint);
      return false;
    }

    console.log("✅ Insert successful, ID:", insertData.id);

    // Test 3: Clean up test record
    console.log("\n3. Cleaning up test record...");
    await supabase.from("invoices").delete().eq("id", insertData.id);
    console.log("✅ Test record deleted");

    console.log("\n✅ All Supabase tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return false;
  }
}

testConnection().then((success) => {
  process.exit(success ? 0 : 1);
});

