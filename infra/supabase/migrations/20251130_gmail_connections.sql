-- Gmail OAuth2 Connections for Teelixir PO Email Processing
-- Run in Supabase SQL Editor

-- 1. Gmail connections table
CREATE TABLE IF NOT EXISTS tlx_gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/gmail.readonly'],
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by TEXT,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. PO emails tracking
CREATE TABLE IF NOT EXISTS tlx_po_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_connection_id UUID REFERENCES tlx_gmail_connections(id),
  gmail_message_id TEXT UNIQUE NOT NULL,
  gmail_thread_id TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_names TEXT[],
  distributor_id UUID REFERENCES tlx_distributors(id),
  status TEXT DEFAULT 'pending', -- pending, processed, ignored, error
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  raw_body_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Distributor email mapping (which emails belong to which distributor)
CREATE TABLE IF NOT EXISTS tlx_distributor_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES tlx_distributors(id) ON DELETE CASCADE,
  email_pattern TEXT NOT NULL, -- e.g., '%@oborne.com.au' or 'orders@healthylife.com.au'
  is_exact BOOLEAN DEFAULT FALSE, -- true = exact match, false = ILIKE pattern
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(distributor_id, email_pattern)
);

-- 4. Product code mapping (their codes → our codes)
CREATE TABLE IF NOT EXISTS tlx_distributor_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES tlx_distributors(id) ON DELETE CASCADE,
  their_product_code TEXT NOT NULL,
  their_product_name TEXT,
  tlx_product_id UUID REFERENCES tlx_products(id),
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(distributor_id, their_product_code)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_po_emails_status ON tlx_po_emails(status);
CREATE INDEX IF NOT EXISTS idx_po_emails_received ON tlx_po_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_emails_distributor ON tlx_po_emails(distributor_id);
CREATE INDEX IF NOT EXISTS idx_dist_emails_pattern ON tlx_distributor_emails(email_pattern);

-- 6. RLS Policies
ALTER TABLE tlx_gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_po_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributor_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributor_product_map ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON tlx_gmail_connections FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_po_emails FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributor_emails FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributor_product_map FOR ALL USING (true);
