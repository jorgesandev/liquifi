-- Migration: Add ENS columns to kyb_results table
-- Run this in your Supabase SQL editor

-- Add ENS-related columns to kyb_results
ALTER TABLE kyb_results 
ADD COLUMN IF NOT EXISTS ens_label TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ens_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ens_registered_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyb_results_ens_label ON kyb_results(ens_label);
CREATE INDEX IF NOT EXISTS idx_kyb_results_ens_registered ON kyb_results(ens_registered);

-- Create ens_registrations table for tracking
CREATE TABLE IF NOT EXISTS ens_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  ens_label TEXT NOT NULL UNIQUE,
  full_domain TEXT NOT NULL, -- e.g., "negociomuebles.liquifidev.eth"
  owner_address TEXT NOT NULL,
  tx_hash TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, ens_label)
);

-- Create indexes for ens_registrations
CREATE INDEX IF NOT EXISTS idx_ens_registrations_org_id ON ens_registrations(org_id);
CREATE INDEX IF NOT EXISTS idx_ens_registrations_ens_label ON ens_registrations(ens_label);
CREATE INDEX IF NOT EXISTS idx_ens_registrations_tx_hash ON ens_registrations(tx_hash);

