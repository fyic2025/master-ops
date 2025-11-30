-- Teelixir Distributor Groups Migration
-- Adds parent entity consolidation for distributor accounts
-- Run in Supabase SQL Editor

-- ============================================================================
-- 1. Create distributor groups table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tlx_distributor_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  parent_group_id UUID REFERENCES tlx_distributor_groups(id),
  region TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Add columns to existing tlx_distributors table
-- ============================================================================

ALTER TABLE tlx_distributors
ADD COLUMN IF NOT EXISTS distributor_group_id UUID REFERENCES tlx_distributor_groups(id);

ALTER TABLE tlx_distributors
ADD COLUMN IF NOT EXISTS is_distributor BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 3. Seed distributor groups
-- ============================================================================

INSERT INTO tlx_distributor_groups (group_code, group_name, region) VALUES
  -- Oborne by State
  ('OBORNE_VIC', 'Oborne Health (VIC)', 'VIC'),
  ('OBORNE_NSW', 'Oborne Health (NSW)', 'NSW'),
  ('OBORNE_QLD', 'Oborne Health (QLD)', 'QLD'),
  ('OBORNE_SA', 'Oborne Health (SA)', 'SA'),
  ('OBORNE_WA', 'Oborne Health (WA)', 'WA'),
  -- Vitalus Group (consolidated)
  ('VITALUS', 'Vitalus Group', 'National'),
  -- Others
  ('WAIVA_CLARK', 'Waiva Clark Distributing', 'National'),
  ('MUSCLE_WORX', 'Muscle Worx Group', 'National'),
  ('PERTH_HEALTH', 'Perth Health', 'WA'),
  ('KIKAI', 'kikai Distributions', 'National'),
  ('HAPPY_GREEN', 'Happy Green Distribution', 'National'),
  ('AHD', 'Australian Health Distributors', 'National'),
  ('COLES', 'Coles CFC', 'National'),
  ('SALTCO', 'Saltco', 'National')
ON CONFLICT (group_code) DO NOTHING;

-- ============================================================================
-- 4. Map customer accounts to distributor groups
-- ============================================================================

-- Oborne VIC
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'OBORNE_VIC'
) WHERE customer_code IN ('Clifford Hallam - Melb', 'Clifford Hallam Health');

-- Oborne NSW
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'OBORNE_NSW'
) WHERE customer_code IN ('CH2-NSW', 'CH2-BER');

-- Oborne QLD
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'OBORNE_QLD'
) WHERE customer_code IN ('Clifford Hallam - Bris', 'CH2- Lyt-QLD');

-- Oborne SA
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'OBORNE_SA'
) WHERE customer_code IN ('Clifford Hallam - Edinburgh', 'CH2-ADE');

-- Oborne WA
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'OBORNE_WA'
) WHERE customer_code = 'Clifford Hallam - Perth';

-- Vitalus Group (includes Complete Health and Global By Nature)
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'VITALUS'
) WHERE customer_code IN ('VITALUS', 'GLOB-BY-NAT', 'COMP-HEAL');

-- Waiva Clark
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'WAIVA_CLARK'
) WHERE customer_code = 'WAIVA-CLARK';

-- Muscle Worx Group
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'MUSCLE_WORX'
) WHERE customer_code ILIKE 'MUSC-WORX%' OR customer_code ILIKE 'SUP-%';

-- Perth Health
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'PERTH_HEALTH'
) WHERE customer_code = 'PER-HEALTH';

-- kikai
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'KIKAI'
) WHERE customer_code = 'KIKAI';

-- Happy Green
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'HAPPY_GREEN'
) WHERE customer_code = 'HAP-GREEN';

-- AHD
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'AHD'
) WHERE customer_code = 'AHD';

-- Coles
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'COLES'
) WHERE customer_code = 'Coles-CDC';

-- Saltco
UPDATE tlx_distributors SET is_distributor = TRUE, distributor_group_id = (
  SELECT id FROM tlx_distributor_groups WHERE group_code = 'SALTCO'
) WHERE customer_code = 'SALTO-CO';

-- ============================================================================
-- 5. Create summary view by distributor group
-- ============================================================================

CREATE OR REPLACE VIEW v_tlx_distributor_group_summary AS
SELECT
  dg.id as group_id,
  dg.group_code,
  dg.group_name,
  dg.region,
  COUNT(DISTINCT d.id) as account_count,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total), 0) as total_revenue,
  COALESCE(AVG(o.total), 0) as avg_order_value,
  MIN(o.order_date) as first_order_date,
  MAX(o.order_date) as last_order_date
FROM tlx_distributor_groups dg
LEFT JOIN tlx_distributors d ON d.distributor_group_id = dg.id AND d.is_distributor = TRUE
LEFT JOIN tlx_distributor_orders o ON o.distributor_id = d.id
GROUP BY dg.id, dg.group_code, dg.group_name, dg.region
ORDER BY total_revenue DESC;

-- ============================================================================
-- 6. Show results
-- ============================================================================

SELECT
  dg.group_name,
  dg.region,
  COUNT(DISTINCT d.id) as accounts,
  SUM(d.total_orders) as orders,
  ROUND(SUM(d.total_revenue)::numeric, 0) as revenue
FROM tlx_distributor_groups dg
LEFT JOIN tlx_distributors d ON d.distributor_group_id = dg.id AND d.is_distributor = TRUE
GROUP BY dg.id, dg.group_name, dg.region
HAVING COUNT(d.id) > 0
ORDER BY SUM(d.total_revenue) DESC NULLS LAST;
