-- =============================================================================
-- CREDENTIALS TABLE + DATA - Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
-- =============================================================================

-- Create credentials table
CREATE TABLE IF NOT EXISTS credentials (
  id SERIAL PRIMARY KEY,
  project VARCHAR(50) NOT NULL,           -- 'boo', 'elevate', 'teelixir', 'shared'
  service VARCHAR(100) NOT NULL,          -- 'bigcommerce', 'supabase', 'ftp', etc.
  credential_name VARCHAR(100) NOT NULL,  -- 'store_hash', 'access_token', etc.
  credential_value TEXT NOT NULL,         -- The actual credential
  notes TEXT,                             -- Optional notes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project, service, credential_name)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_credentials_project_service ON credentials(project, service);

-- =============================================================================
-- INSERT BOO CREDENTIALS (What Claude has access to)
-- =============================================================================

-- BigCommerce BOO
INSERT INTO credentials (project, service, credential_name, credential_value, notes) VALUES
('boo', 'bigcommerce', 'store_hash', 'hhhi', 'BigCommerce store identifier'),
('boo', 'bigcommerce', 'access_token', 'd9y2srla3treynpbtmp4f3u1bomdna2', 'API access token'),
('boo', 'bigcommerce', 'client_id', 'nvmcwck5yr15lob1q911z68d4r6erxy', 'OAuth client ID')
ON CONFLICT (project, service, credential_name) DO UPDATE SET credential_value = EXCLUDED.credential_value;

-- Supabase BOO (this is the current database)
INSERT INTO credentials (project, service, credential_name, credential_value, notes) VALUES
('boo', 'supabase', 'url', 'https://usibnysqelovfuctmkqw.supabase.co', 'Supabase project URL'),
('boo', 'supabase', 'service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s', 'Service role key for API access')
ON CONFLICT (project, service, credential_name) DO UPDATE SET credential_value = EXCLUDED.credential_value;

-- FTP Oborne (for BOO supplier data)
INSERT INTO credentials (project, service, credential_name, credential_value, notes) VALUES
('boo', 'ftp_oborne', 'host', 'ftp3.ch2.net.au', 'CH2/Oborne FTP server'),
('boo', 'ftp_oborne', 'username', 'retail_310', 'FTP username'),
('boo', 'ftp_oborne', 'password', 'am2SH6wWevAY&#+Q', 'FTP password')
ON CONFLICT (project, service, credential_name) DO UPDATE SET credential_value = EXCLUDED.credential_value;

-- Unleashed (Inventory Management)
INSERT INTO credentials (project, service, credential_name, credential_value, notes) VALUES
('boo', 'unleashed', 'api_secret', 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==', 'Unleashed API authentication secret')
ON CONFLICT (project, service, credential_name) DO UPDATE SET credential_value = EXCLUDED.credential_value;

-- =============================================================================
-- PLACEHOLDER ROWS FOR MISSING CREDENTIALS (You need to add these)
-- =============================================================================

-- Elevate Wholesale - MISSING
INSERT INTO credentials (project, service, credential_name, credential_value, notes, is_active) VALUES
('elevate', 'shopify', 'access_token', 'NEEDS_VALUE', 'Shopify API access token - ADD THIS', FALSE),
('elevate', 'shopify', 'store_domain', 'NEEDS_VALUE', 'e.g. store-name.myshopify.com - ADD THIS', FALSE),
('elevate', 'hubspot', 'access_token', 'NEEDS_VALUE', 'HubSpot API token - ADD THIS', FALSE),
('elevate', 'supabase', 'url', 'NEEDS_VALUE', 'Elevate Supabase URL if separate - ADD THIS', FALSE),
('elevate', 'supabase', 'service_role_key', 'NEEDS_VALUE', 'Elevate Supabase key if separate - ADD THIS', FALSE)
ON CONFLICT (project, service, credential_name) DO NOTHING;

-- Teelixir - MISSING
INSERT INTO credentials (project, service, credential_name, credential_value, notes, is_active) VALUES
('teelixir', 'shopify', 'access_token', 'NEEDS_VALUE', 'Shopify API access token - ADD THIS', FALSE),
('teelixir', 'shopify', 'store_domain', 'NEEDS_VALUE', 'e.g. store-name.myshopify.com - ADD THIS', FALSE),
('teelixir', 'xero', 'client_id', 'NEEDS_VALUE', 'Xero OAuth client ID - ADD THIS', FALSE),
('teelixir', 'xero', 'client_secret', 'NEEDS_VALUE', 'Xero OAuth client secret - ADD THIS', FALSE),
('teelixir', 'supabase', 'url', 'NEEDS_VALUE', 'Teelixir Supabase URL if separate - ADD THIS', FALSE),
('teelixir', 'supabase', 'service_role_key', 'NEEDS_VALUE', 'Teelixir Supabase key if separate - ADD THIS', FALSE)
ON CONFLICT (project, service, credential_name) DO NOTHING;

-- Shared/Other Services - MISSING
INSERT INTO credentials (project, service, credential_name, credential_value, notes, is_active) VALUES
('shared', 'klaviyo', 'api_key', 'NEEDS_VALUE', 'Klaviyo email marketing API key - ADD THIS', FALSE),
('shared', 'n8n', 'api_key', 'NEEDS_VALUE', 'n8n workflow automation API key - ADD THIS', FALSE),
('shared', 'smartlead', 'api_key', 'NEEDS_VALUE', 'SmartLead email campaign API key - ADD THIS', FALSE)
ON CONFLICT (project, service, credential_name) DO NOTHING;

-- =============================================================================
-- VIEW TO CHECK STATUS
-- =============================================================================

CREATE OR REPLACE VIEW v_credentials_status AS
SELECT
  project,
  service,
  credential_name,
  CASE
    WHEN credential_value = 'NEEDS_VALUE' THEN 'MISSING'
    WHEN is_active = FALSE THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END AS status,
  LEFT(credential_value, 20) || '...' AS value_preview,
  notes
FROM credentials
ORDER BY project, service, credential_name;

-- Check what we have
SELECT * FROM v_credentials_status;
