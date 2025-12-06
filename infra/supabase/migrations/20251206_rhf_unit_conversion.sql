-- =============================================================================
-- RHF Unit Conversion Enhancement
-- Adds proper box → kg conversion support
-- =============================================================================
--
-- Context: RHF buys in BOXES from suppliers but sells by KG to customers
-- Example: Supplier sells "Bananas 11KG Box" @ $36
--          RHF sells "Bananas" @ $3.27/kg (calculated: $36 / 11kg)
--
-- This migration adds fields to properly track this relationship.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add weight_kg to supplier products
-- -----------------------------------------------------------------------------
-- This stores the parsed weight from unit descriptions like "11KG BOX"
ALTER TABLE rhf_supplier_products
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,3);

COMMENT ON COLUMN rhf_supplier_products.weight_kg IS
  'Weight in kg for box/tray items. Parsed from unit_size or entered manually. Used for cost-per-kg calculation.';

-- -----------------------------------------------------------------------------
-- 2. Enhance product mappings with clearer conversion fields
-- -----------------------------------------------------------------------------

-- Add supplier unit type (what form does supplier sell in)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS supplier_unit_type TEXT DEFAULT 'box';

COMMENT ON COLUMN rhf_product_mappings.supplier_unit_type IS
  'Unit type supplier sells: box, tray, each, kg, bunch, punnet, pack';

-- Add weight per supplier unit
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS supplier_unit_kg DECIMAL(10,3);

COMMENT ON COLUMN rhf_product_mappings.supplier_unit_kg IS
  'Weight in kg per supplier unit. E.g., 11 for "11KG Box". NULL if sold by each/bunch.';

-- Add sell unit type (how RHF sells to customers)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS sell_unit TEXT DEFAULT 'kg';

COMMENT ON COLUMN rhf_product_mappings.sell_unit IS
  'Unit type RHF sells: kg, each, bunch, punnet, pack';

-- Add calculated cost per sell unit
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS cost_per_sell_unit DECIMAL(10,4);

COMMENT ON COLUMN rhf_product_mappings.cost_per_sell_unit IS
  'Calculated cost per sell unit. For kg items: supplier_price / supplier_unit_kg';

-- Add margin percentage (for quick reference)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);

COMMENT ON COLUMN rhf_product_mappings.margin_percent IS
  'Target or actual margin percentage. Calculated: (sell_price - cost_per_sell_unit) / sell_price * 100';

-- -----------------------------------------------------------------------------
-- 3. Add helper view for cost calculations
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW rhf_product_costs AS
SELECT
  pm.id AS mapping_id,
  wp.woo_id,
  wp.name AS woo_product_name,
  wp.price AS sell_price,
  sp.name AS supplier_product_name,
  sp.cost_price AS supplier_price,
  s.name AS supplier_name,
  s.code AS supplier_code,
  pm.is_primary,
  pm.supplier_unit_type,
  pm.supplier_unit_kg,
  pm.sell_unit,
  -- Calculate cost per kg
  CASE
    WHEN pm.supplier_unit_kg IS NOT NULL AND pm.supplier_unit_kg > 0
    THEN sp.cost_price / pm.supplier_unit_kg
    WHEN sp.weight_kg IS NOT NULL AND sp.weight_kg > 0
    THEN sp.cost_price / sp.weight_kg
    ELSE sp.cost_price -- Fallback: assume 1:1
  END AS calculated_cost_per_kg,
  -- Calculate margin if we have sell price
  CASE
    WHEN wp.price IS NOT NULL AND wp.price > 0 AND pm.supplier_unit_kg IS NOT NULL AND pm.supplier_unit_kg > 0
    THEN ROUND(((wp.price - (sp.cost_price / pm.supplier_unit_kg)) / wp.price * 100)::numeric, 2)
    ELSE NULL
  END AS calculated_margin_percent
FROM rhf_product_mappings pm
JOIN rhf_woo_products wp ON pm.woo_product_id = wp.id
JOIN rhf_supplier_products sp ON pm.supplier_product_id = sp.id
JOIN rhf_suppliers s ON sp.supplier_id = s.id;

-- -----------------------------------------------------------------------------
-- 4. Add common unit weight reference table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rhf_unit_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_pattern TEXT NOT NULL, -- Regex or LIKE pattern to match product names
  default_unit_type TEXT NOT NULL, -- 'box', 'tray', 'punnet'
  default_weight_kg DECIMAL(10,3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rhf_unit_weights IS
  'Default weights for common products. Used to auto-fill weight_kg when parsing pricelists.';

-- Insert common defaults
INSERT INTO rhf_unit_weights (product_pattern, default_unit_type, default_weight_kg, notes) VALUES
  ('banana%', 'box', 13, 'Standard banana box ~13kg'),
  ('apple%', 'box', 18, 'Standard apple box ~18kg'),
  ('orange%', 'box', 15, 'Standard orange box ~15kg'),
  ('mandarin%', 'box', 10, 'Standard mandarin box ~10kg'),
  ('lemon%', 'box', 15, 'Standard lemon box ~15kg'),
  ('lime%', 'box', 10, 'Standard lime box ~10kg'),
  ('avocado%', 'tray', 5.5, 'Standard avocado tray ~5.5kg'),
  ('tomato%', 'box', 10, 'Standard tomato box ~10kg'),
  ('potato%', 'bag', 20, 'Standard potato bag ~20kg'),
  ('onion%', 'bag', 20, 'Standard onion bag ~20kg'),
  ('carrot%', 'bag', 10, 'Standard carrot bag ~10kg'),
  ('broccoli%', 'box', 8, 'Standard broccoli box ~8kg'),
  ('cauliflower%', 'box', 12, 'Standard cauliflower box ~12kg'),
  ('lettuce%', 'box', 6, 'Standard lettuce box ~6 heads'),
  ('spinach%', 'box', 1.5, 'Standard spinach box ~1.5kg'),
  ('capsicum%', 'box', 5, 'Standard capsicum box ~5kg'),
  ('cucumber%', 'box', 10, 'Standard cucumber box ~10kg'),
  ('zucchini%', 'box', 10, 'Standard zucchini box ~10kg'),
  ('pumpkin%', 'each', 3, 'Average pumpkin ~3kg each'),
  ('watermelon%', 'each', 8, 'Average watermelon ~8kg each'),
  ('rockmelon%', 'each', 1.5, 'Average rockmelon ~1.5kg each'),
  ('honeydew%', 'each', 2, 'Average honeydew ~2kg each'),
  ('strawberr%', 'punnet', 0.25, 'Standard strawberry punnet 250g'),
  ('blueberr%', 'punnet', 0.125, 'Standard blueberry punnet 125g'),
  ('raspberr%', 'punnet', 0.125, 'Standard raspberry punnet 125g'),
  ('grape%', 'box', 9, 'Standard grape box ~9kg'),
  ('mango%', 'tray', 7, 'Standard mango tray ~7kg'),
  ('pear%', 'box', 12, 'Standard pear box ~12kg'),
  ('kiwi%', 'box', 10, 'Standard kiwi box ~10kg'),
  ('peach%', 'box', 10, 'Standard peach box ~10kg'),
  ('nectarine%', 'box', 10, 'Standard nectarine box ~10kg'),
  ('plum%', 'box', 10, 'Standard plum box ~10kg'),
  ('cherr%', 'box', 5, 'Standard cherry box ~5kg'),
  ('apricot%', 'box', 10, 'Standard apricot box ~10kg'),
  ('fig%', 'punnet', 0.3, 'Standard fig punnet ~300g'),
  ('passionfruit%', 'tray', 2.5, 'Standard passionfruit tray ~2.5kg'),
  ('pineapple%', 'each', 1.5, 'Average pineapple ~1.5kg each'),
  ('coconut%', 'each', 0.5, 'Average coconut ~500g each'),
  ('sweet potato%', 'box', 20, 'Standard sweet potato box ~20kg'),
  ('eggplant%', 'box', 10, 'Standard eggplant box ~10kg'),
  ('bean%', 'box', 3, 'Standard bean box ~3kg'),
  ('pea%', 'bag', 1, 'Standard pea bag ~1kg'),
  ('corn%', 'box', 10, 'Standard corn box ~10 cobs'),
  ('asparagus%', 'bunch', 0.25, 'Standard asparagus bunch ~250g'),
  ('celery%', 'each', 0.7, 'Average celery ~700g each'),
  ('leek%', 'bunch', 0.5, 'Standard leek bunch ~500g'),
  ('spring onion%', 'bunch', 0.1, 'Standard spring onion bunch ~100g'),
  ('shallot%', 'bunch', 0.1, 'Standard shallot bunch ~100g'),
  ('ginger%', 'kg', 1, 'Sold by kg'),
  ('garlic%', 'kg', 1, 'Sold by kg'),
  ('mushroom%', 'box', 3, 'Standard mushroom box ~3kg'),
  ('herb%', 'bunch', 0.03, 'Standard herb bunch ~30g'),
  ('parsley%', 'bunch', 0.05, 'Standard parsley bunch ~50g'),
  ('basil%', 'bunch', 0.03, 'Standard basil bunch ~30g'),
  ('coriander%', 'bunch', 0.05, 'Standard coriander bunch ~50g'),
  ('mint%', 'bunch', 0.03, 'Standard mint bunch ~30g'),
  ('kale%', 'bunch', 0.3, 'Standard kale bunch ~300g'),
  ('chard%', 'bunch', 0.3, 'Standard chard bunch ~300g'),
  ('beetroot%', 'bunch', 0.5, 'Standard beetroot bunch ~500g with leaves'),
  ('radish%', 'bunch', 0.2, 'Standard radish bunch ~200g')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Grant access
-- -----------------------------------------------------------------------------
ALTER TABLE rhf_unit_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to rhf_unit_weights" ON rhf_unit_weights
  FOR SELECT USING (true);

-- Allow authenticated users to manage
CREATE POLICY "Allow auth users to manage rhf_unit_weights" ON rhf_unit_weights
  FOR ALL USING (auth.role() = 'authenticated');
