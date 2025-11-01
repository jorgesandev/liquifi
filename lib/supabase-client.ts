"use client";

import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client
// Supports both Publishable Key (recommended with RLS) or Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prefer publishable key if available, otherwise fall back to anon key
const clientKey = supabasePublishableKey || supabaseAnonKey;

if (!supabaseUrl || !clientKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  );
}

export const supabaseClient = createClient(supabaseUrl, clientKey);

