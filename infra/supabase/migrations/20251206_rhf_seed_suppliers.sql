-- ============================================================================
-- RHF SUPPLIER SEED DATA
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new
-- ============================================================================

-- Create suppliers table if not exists
CREATE TABLE IF NOT EXISTS rhf_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  email_pattern VARCHAR(100),
  phone VARCHAR(50),
  contact_name VARCHAR(100),
  address TEXT,
  notes TEXT,
  payment_terms VARCHAR(50) DEFAULT '7 days',
  minimum_order DECIMAL(10,2),
  delivery_days TEXT[], -- e.g., ['Monday', 'Thursday']
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 4 RHF suppliers
INSERT INTO rhf_suppliers (code, name, email_pattern, notes, delivery_days) VALUES
  ('poh', 'Pure Organic Harvest', 'pureorganicharvest.com.au', 'Primary organic supplier', ARRAY['Monday', 'Thursday']),
  ('melba', 'Melba Fresh Organics', 'mforganics.com.au', 'Local Melba supplier', ARRAY['Tuesday', 'Friday']),
  ('ogg', 'Organic Growers Group', 'organicgrowersgroup.com.au', 'Large organic collective', ARRAY['Monday', 'Wednesday', 'Friday']),
  ('bdm', 'Market BioDynamic', 'biodynamic.com.au', 'Biodynamic produce specialist', ARRAY['Wednesday'])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  email_pattern = EXCLUDED.email_pattern,
  notes = EXCLUDED.notes,
  delivery_days = EXCLUDED.delivery_days,
  updated_at = NOW();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rhf_suppliers_code ON rhf_suppliers(code);
CREATE INDEX IF NOT EXISTS idx_rhf_suppliers_active ON rhf_suppliers(active);

-- RLS
ALTER TABLE rhf_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to rhf_suppliers" ON rhf_suppliers;
CREATE POLICY "Allow full access to rhf_suppliers" ON rhf_suppliers FOR ALL USING (true);

-- Verify
SELECT code, name, email_pattern, delivery_days FROM rhf_suppliers ORDER BY code;
