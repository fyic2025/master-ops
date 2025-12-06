-- =============================================================================
-- RHF Product Box Suitability
-- Master reference for which products can go in which box types
-- All RHF products are organic by default
-- Created: 2025-12-06
-- =============================================================================

CREATE TABLE IF NOT EXISTS rhf_product_box_suitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product identification
  product_name TEXT NOT NULL UNIQUE,    -- Normalized name for matching
  aliases TEXT[],                       -- Alternative names for fuzzy matching

  -- Category hierarchy
  category TEXT NOT NULL,               -- 'vegetable', 'fruit', 'herbs', 'dairy', 'eggs', 'pantry'
  subcategory TEXT,                     -- 'leafy', 'root', 'brassica', 'allium', 'berries', etc.

  -- Diet suitability flags
  is_keto BOOLEAN DEFAULT FALSE,        -- Low-carb suitable (<5g net carbs/100g typical)
  is_fodmap_safe BOOLEAN DEFAULT FALSE, -- Monash University low FODMAP certified
  is_salad_suitable BOOLEAN DEFAULT FALSE, -- Can be eaten raw in salads
  is_juice_suitable BOOLEAN DEFAULT FALSE, -- Good for juicing
  is_smoothie_suitable BOOLEAN DEFAULT FALSE, -- Good for smoothies

  -- Box type eligibility (array of box_type values)
  suitable_box_types TEXT[] DEFAULT ARRAY['fruit_veg'],

  -- Seasonality (Australian - 1=Jan, 12=Dec)
  peak_months INTEGER[],                -- Peak availability months
  available_months INTEGER[],           -- All available months (may be imported/stored)
  is_year_round BOOLEAN DEFAULT FALSE,  -- Available all year

  -- Nutritional notes
  carbs_per_100g DECIMAL(5,1),          -- For keto calculations
  fiber_per_100g DECIMAL(5,1),          -- Net carbs = carbs - fiber

  -- Diet-specific notes
  keto_notes TEXT,                      -- e.g., "Limit to 50g per serve"
  fodmap_notes TEXT,                    -- e.g., "Green part only, avoid white"

  -- Shelf life for operations
  typical_shelf_days INTEGER,           -- Days from delivery to expiry
  storage_type TEXT DEFAULT 'cool',     -- 'cool', 'cold', 'room_temp', 'frozen'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_pbs_category ON rhf_product_box_suitability(category);
CREATE INDEX IF NOT EXISTS idx_rhf_pbs_subcategory ON rhf_product_box_suitability(subcategory);
CREATE INDEX IF NOT EXISTS idx_rhf_pbs_keto ON rhf_product_box_suitability(is_keto) WHERE is_keto = TRUE;
CREATE INDEX IF NOT EXISTS idx_rhf_pbs_fodmap ON rhf_product_box_suitability(is_fodmap_safe) WHERE is_fodmap_safe = TRUE;
CREATE INDEX IF NOT EXISTS idx_rhf_pbs_salad ON rhf_product_box_suitability(is_salad_suitable) WHERE is_salad_suitable = TRUE;

-- RLS
ALTER TABLE rhf_product_box_suitability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON rhf_product_box_suitability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON rhf_product_box_suitability FOR SELECT TO anon USING (true);

-- =============================================================================
-- SEED DATA: Comprehensive Organic Produce Range
-- =============================================================================

INSERT INTO rhf_product_box_suitability (
  product_name, aliases, category, subcategory,
  is_keto, is_fodmap_safe, is_salad_suitable, is_juice_suitable, is_smoothie_suitable,
  suitable_box_types, peak_months, is_year_round, carbs_per_100g, fiber_per_100g,
  typical_shelf_days, storage_type, keto_notes, fodmap_notes
) VALUES

-- =============================================================================
-- LEAFY GREENS (All excellent for keto, fodmap, salad)
-- =============================================================================
('Spinach Baby', ARRAY['baby spinach', 'spinach leaves'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[3,4,5,9,10,11], TRUE, 1.4, 2.2,
  5, 'cold', NULL, NULL),

('Spinach Bunch', ARRAY['spinach', 'english spinach'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[3,4,5,9,10,11], TRUE, 1.4, 2.2,
  4, 'cold', NULL, NULL),

('Kale', ARRAY['curly kale', 'kale bunch'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], TRUE, 4.4, 4.1,
  7, 'cold', NULL, NULL),

('Kale Tuscan', ARRAY['cavolo nero', 'tuscan kale', 'black kale', 'lacinato'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], TRUE, 4.4, 4.1,
  7, 'cold', NULL, NULL),

('Silverbeet', ARRAY['swiss chard', 'chard', 'rainbow chard'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[3,4,5,6,7,8,9,10], TRUE, 2.1, 2.1,
  5, 'cold', NULL, NULL),

('Lettuce Cos', ARRAY['cos lettuce', 'romaine', 'romaine lettuce'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.2, 1.0,
  5, 'cold', NULL, NULL),

('Lettuce Iceberg', ARRAY['iceberg', 'iceberg lettuce'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.4, 0.9,
  7, 'cold', NULL, NULL),

('Lettuce Butter', ARRAY['butter lettuce', 'butterhead'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.1, 0.9,
  4, 'cold', NULL, NULL),

('Lettuce Oak Leaf', ARRAY['oak leaf', 'oakleaf lettuce'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.2, 1.0,
  4, 'cold', NULL, NULL),

('Lettuce Mixed', ARRAY['mixed leaves', 'mesclun', 'salad mix', 'spring mix'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.5, 1.2,
  4, 'cold', NULL, NULL),

('Rocket', ARRAY['arugula', 'roquette', 'rocket leaves'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 2.0, 1.6,
  4, 'cold', NULL, NULL),

('Watercress', ARRAY['watercress bunch'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[9,10,11,3,4,5], FALSE, 0.8, 0.5,
  3, 'cold', NULL, NULL),

('Endive', ARRAY['belgian endive', 'witlof', 'chicory'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], FALSE, 0.3, 3.1,
  7, 'cold', NULL, NULL),

('Radicchio', ARRAY['red chicory'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], FALSE, 3.6, 0.9,
  7, 'cold', NULL, NULL),

('Bok Choy', ARRAY['pak choy', 'pak choi', 'chinese cabbage'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.2, 1.0,
  4, 'cold', NULL, NULL),

('Bok Choy Baby', ARRAY['baby bok choy', 'shanghai bok choy'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.2, 1.0,
  4, 'cold', NULL, NULL),

('Choy Sum', ARRAY['chinese flowering cabbage'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 1.7, 1.2,
  3, 'cold', NULL, NULL),

('Gai Lan', ARRAY['chinese broccoli', 'kai lan'], 'vegetable', 'leafy',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 3.5, 2.0,
  4, 'cold', NULL, NULL),

('Wombok', ARRAY['napa cabbage', 'chinese cabbage', 'wong bok'], 'vegetable', 'leafy',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], TRUE, 1.2, 1.0,
  10, 'cold', NULL, NULL),

-- =============================================================================
-- BRASSICAS (Cruciferous - mostly keto, watch FODMAP)
-- =============================================================================
('Broccoli', ARRAY['broccoli head', 'broccoli crown'], 'vegetable', 'brassica',
  TRUE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8,9], TRUE, 4.0, 2.4,
  7, 'cold', NULL, 'High FODMAP - limit to 75g'),

('Broccoli Broccolini', ARRAY['broccolini', 'baby broccoli', 'asparation'], 'vegetable', 'brassica',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[5,6,7,8,9], TRUE, 4.0, 2.4,
  5, 'cold', NULL, 'Low FODMAP in 1/2 cup serves'),

('Cauliflower', ARRAY['cauliflower head', 'cauli'], 'vegetable', 'brassica',
  TRUE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8,9], TRUE, 3.0, 2.0,
  10, 'cold', 'Excellent rice substitute', 'High FODMAP - limit to 1/2 cup'),

('Cabbage Green', ARRAY['green cabbage', 'cabbage'], 'vegetable', 'brassica',
  TRUE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8,9,10], TRUE, 3.3, 2.3,
  14, 'cold', NULL, 'High FODMAP in large serves'),

('Cabbage Red', ARRAY['red cabbage', 'purple cabbage'], 'vegetable', 'brassica',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8,9,10], TRUE, 4.2, 2.0,
  14, 'cold', NULL, 'Low FODMAP up to 3/4 cup'),

('Cabbage Savoy', ARRAY['savoy cabbage'], 'vegetable', 'brassica',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[5,6,7,8], FALSE, 3.0, 2.8,
  10, 'cold', NULL, NULL),

('Brussels Sprouts', ARRAY['brussels', 'sprouts'], 'vegetable', 'brassica',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8], FALSE, 5.0, 3.8,
  7, 'cold', NULL, 'High FODMAP'),

('Kohlrabi', ARRAY['german turnip'], 'vegetable', 'brassica',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8,9], FALSE, 2.6, 1.7,
  14, 'cold', NULL, NULL),

-- =============================================================================
-- ALLIUMS (Keto OK, but HIGH FODMAP - avoid for FODMAP boxes)
-- =============================================================================
('Onion Brown', ARRAY['brown onion', 'onion', 'yellow onion'], 'vegetable', 'allium',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], NULL, TRUE, 7.3, 1.4,
  21, 'room_temp', NULL, 'HIGH FODMAP - avoid'),

('Onion Red', ARRAY['red onion', 'spanish onion'], 'vegetable', 'allium',
  TRUE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg'], NULL, TRUE, 7.9, 1.7,
  14, 'room_temp', 'Small amounts OK', 'HIGH FODMAP - avoid'),

('Onion White', ARRAY['white onion'], 'vegetable', 'allium',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], NULL, TRUE, 7.6, 1.1,
  21, 'room_temp', NULL, 'HIGH FODMAP - avoid'),

('Onion Spring', ARRAY['spring onion', 'scallion', 'green onion', 'shallots'], 'vegetable', 'allium',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 4.7, 1.8,
  7, 'cold', NULL, 'Green part ONLY is low FODMAP'),

('Leek', ARRAY['leeks'], 'vegetable', 'allium',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8,9], TRUE, 6.3, 1.8,
  10, 'cold', NULL, 'HIGH FODMAP - green leaves only OK'),

('Garlic', ARRAY['garlic bulb', 'garlic head'], 'vegetable', 'allium',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], NULL, TRUE, 28.0, 2.1,
  30, 'room_temp', 'Small amounts OK on keto', 'HIGH FODMAP - avoid or use garlic oil'),

('Shallots French', ARRAY['french shallots', 'eschalots', 'eschallots'], 'vegetable', 'allium',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6], FALSE, 13.8, 0.0,
  30, 'room_temp', NULL, 'HIGH FODMAP - avoid'),

('Chives', ARRAY['chive'], 'herbs', 'allium',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.9, 2.5,
  7, 'cold', NULL, 'Low FODMAP'),

-- =============================================================================
-- NIGHTSHADES (Tomato, Capsicum, Eggplant, Chilli)
-- =============================================================================
('Tomato', ARRAY['tomatoes', 'round tomato', 'field tomato'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2,3], TRUE, 2.7, 0.9,
  5, 'room_temp', NULL, 'Low FODMAP up to 1 small'),

('Tomato Cherry', ARRAY['cherry tomatoes', 'grape tomatoes'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2,3], TRUE, 3.9, 1.2,
  7, 'room_temp', NULL, 'Low FODMAP up to 4 cherry'),

('Tomato Roma', ARRAY['roma tomatoes', 'plum tomatoes', 'paste tomatoes'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2,3], TRUE, 2.5, 1.0,
  7, 'room_temp', NULL, NULL),

('Tomato Truss', ARRAY['truss tomatoes', 'vine tomatoes', 'tomatoes on vine'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2,3], TRUE, 2.7, 0.9,
  5, 'room_temp', NULL, NULL),

('Tomato Heirloom', ARRAY['heirloom tomatoes', 'heritage tomatoes'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2,3], FALSE, 2.7, 0.9,
  4, 'room_temp', NULL, NULL),

('Capsicum Red', ARRAY['red capsicum', 'red pepper', 'red bell pepper'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 4.6, 1.7,
  10, 'cold', NULL, NULL),

('Capsicum Green', ARRAY['green capsicum', 'green pepper', 'green bell pepper'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 2.9, 1.7,
  10, 'cold', NULL, NULL),

('Capsicum Yellow', ARRAY['yellow capsicum', 'yellow pepper', 'yellow bell pepper'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 5.4, 0.9,
  10, 'cold', NULL, NULL),

('Capsicum Mixed', ARRAY['mixed capsicums', 'traffic light capsicums'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 4.3, 1.4,
  10, 'cold', NULL, NULL),

('Eggplant', ARRAY['aubergine', 'eggplant large'], 'vegetable', 'nightshade',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[12,1,2,3], TRUE, 2.4, 3.4,
  7, 'cool', NULL, 'Low FODMAP up to 1 cup'),

('Eggplant Lebanese', ARRAY['lebanese eggplant', 'baby eggplant'], 'vegetable', 'nightshade',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[12,1,2,3], TRUE, 2.4, 3.4,
  5, 'cool', NULL, NULL),

('Chilli Red', ARRAY['red chilli', 'red chillies', 'cayenne'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[12,1,2,3], TRUE, 5.3, 1.5,
  14, 'cold', NULL, NULL),

('Chilli Green', ARRAY['green chilli', 'green chillies', 'jalapeno'], 'vegetable', 'nightshade',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[12,1,2,3], TRUE, 4.0, 1.4,
  14, 'cold', NULL, NULL),

-- =============================================================================
-- CUCURBITS (Zucchini, Cucumber, Pumpkin, Squash)
-- =============================================================================
('Zucchini', ARRAY['zucchini green', 'courgette', 'green zucchini'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 2.1, 1.0,
  7, 'cold', 'Excellent pasta substitute', 'Low FODMAP up to 65g'),

('Zucchini Yellow', ARRAY['yellow zucchini', 'golden zucchini'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], FALSE, 2.1, 1.0,
  7, 'cold', NULL, NULL),

('Cucumber Lebanese', ARRAY['lebanese cucumber', 'continental cucumber'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 1.5, 0.7,
  7, 'cold', NULL, NULL),

('Cucumber Telegraph', ARRAY['telegraph cucumber', 'english cucumber', 'long cucumber'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 1.5, 0.7,
  7, 'cold', NULL, NULL),

('Cucumber Apple', ARRAY['apple cucumber', 'crystal apple cucumber'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2], FALSE, 1.5, 0.7,
  5, 'cold', NULL, NULL),

('Pumpkin Butternut', ARRAY['butternut pumpkin', 'butternut squash'], 'vegetable', 'cucurbit',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6,7,8], TRUE, 8.3, 3.2,
  30, 'room_temp', 'Too high carb for keto', 'High FODMAP'),

('Pumpkin Jap', ARRAY['jap pumpkin', 'kent pumpkin', 'kabocha'], 'vegetable', 'cucurbit',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6,7,8], TRUE, 6.0, 1.5,
  30, 'room_temp', 'Too high carb for keto', 'High FODMAP'),

('Pumpkin Queensland Blue', ARRAY['QLD blue pumpkin', 'blue pumpkin'], 'vegetable', 'cucurbit',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6,7,8], TRUE, 6.0, 1.5,
  60, 'room_temp', NULL, 'High FODMAP'),

('Pumpkin Baby', ARRAY['baby pumpkin', 'golden nugget pumpkin'], 'vegetable', 'cucurbit',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6], FALSE, 6.0, 1.5,
  21, 'room_temp', NULL, NULL),

('Squash Yellow', ARRAY['yellow squash', 'crookneck squash', 'summer squash'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], FALSE, 2.0, 1.1,
  7, 'cold', NULL, NULL),

('Squash Button', ARRAY['button squash', 'pattypan squash', 'scallop squash'], 'vegetable', 'cucurbit',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[11,12,1,2,3], FALSE, 2.0, 1.1,
  7, 'cold', NULL, NULL),

-- =============================================================================
-- ROOT VEGETABLES
-- =============================================================================
('Carrot', ARRAY['carrots', 'carrot bunch'], 'vegetable', 'root',
  FALSE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], NULL, TRUE, 6.7, 2.4,
  21, 'cold', 'Too high carb for strict keto', NULL),

('Carrot Baby', ARRAY['baby carrots', 'dutch carrots'], 'vegetable', 'root',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[9,10,11,3,4,5], FALSE, 5.3, 2.9,
  14, 'cold', NULL, NULL),

('Carrot Rainbow', ARRAY['rainbow carrots', 'heirloom carrots', 'purple carrots'], 'vegetable', 'root',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[9,10,11,3,4,5], FALSE, 6.7, 2.4,
  14, 'cold', NULL, NULL),

('Beetroot', ARRAY['beets', 'beet', 'red beet'], 'vegetable', 'root',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[4,5,6,7,8,9,10], TRUE, 7.0, 2.0,
  21, 'cold', 'Too high carb for keto', 'High FODMAP'),

('Beetroot Baby', ARRAY['baby beetroot', 'baby beets'], 'vegetable', 'root',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[4,5,6,7,8,9,10], FALSE, 7.0, 2.0,
  14, 'cold', NULL, 'High FODMAP'),

('Beetroot Golden', ARRAY['golden beets', 'yellow beetroot'], 'vegetable', 'root',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[4,5,6,7,8,9,10], FALSE, 7.0, 2.0,
  14, 'cold', NULL, 'High FODMAP'),

('Radish', ARRAY['radishes', 'red radish'], 'vegetable', 'root',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.8, 1.6,
  10, 'cold', NULL, NULL),

('Radish Daikon', ARRAY['daikon', 'white radish', 'japanese radish'], 'vegetable', 'root',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], FALSE, 2.5, 1.4,
  14, 'cold', NULL, NULL),

('Radish Watermelon', ARRAY['watermelon radish'], 'vegetable', 'root',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8], FALSE, 2.5, 1.4,
  10, 'cold', NULL, NULL),

('Turnip', ARRAY['turnips', 'white turnip'], 'vegetable', 'root',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[5,6,7,8,9], FALSE, 4.6, 1.8,
  14, 'cold', NULL, NULL),

('Parsnip', ARRAY['parsnips'], 'vegetable', 'root',
  FALSE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], ARRAY[5,6,7,8,9], FALSE, 13.0, 4.9,
  21, 'cold', 'Too high carb for keto', NULL),

('Swede', ARRAY['rutabaga', 'swedish turnip'], 'vegetable', 'root',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[5,6,7,8,9], FALSE, 5.3, 1.8,
  21, 'cold', NULL, NULL),

('Celeriac', ARRAY['celery root'], 'vegetable', 'root',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[5,6,7,8,9], FALSE, 5.9, 1.8,
  21, 'cold', NULL, 'High FODMAP'),

('Potato', ARRAY['potatoes', 'washed potato'], 'vegetable', 'root',
  FALSE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], NULL, TRUE, 15.4, 2.4,
  21, 'room_temp', 'Not keto friendly', NULL),

('Potato Baby', ARRAY['baby potatoes', 'chats', 'new potatoes'], 'vegetable', 'root',
  FALSE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], ARRAY[9,10,11,12], FALSE, 15.4, 2.4,
  14, 'cool', NULL, NULL),

('Potato Sweet Orange', ARRAY['sweet potato', 'orange sweet potato', 'kumara'], 'vegetable', 'root',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], NULL, TRUE, 17.1, 2.5,
  21, 'room_temp', 'Not keto friendly', 'High FODMAP'),

('Potato Sweet Purple', ARRAY['purple sweet potato'], 'vegetable', 'root',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[3,4,5,6], FALSE, 17.1, 2.5,
  21, 'room_temp', NULL, 'High FODMAP'),

('Ginger', ARRAY['ginger root', 'fresh ginger'], 'vegetable', 'root',
  TRUE, TRUE, FALSE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 15.8, 2.0,
  21, 'cold', 'Small amounts OK', 'Low FODMAP in small amounts'),

('Turmeric', ARRAY['turmeric root', 'fresh turmeric'], 'vegetable', 'root',
  TRUE, TRUE, FALSE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 4.8, 2.1,
  21, 'cold', NULL, NULL),

-- =============================================================================
-- LEGUMES & PODS
-- =============================================================================
('Beans Green', ARRAY['green beans', 'french beans', 'string beans'], 'vegetable', 'legume',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 4.2, 3.4,
  5, 'cold', NULL, 'Low FODMAP up to 15 beans'),

('Beans Butter', ARRAY['butter beans', 'lima beans'], 'vegetable', 'legume',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[12,1,2,3], FALSE, 15.3, 7.0,
  5, 'cold', 'Too high carb', 'High FODMAP'),

('Beans Broad', ARRAY['broad beans', 'fava beans'], 'vegetable', 'legume',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[9,10,11,12], FALSE, 8.6, 5.4,
  5, 'cold', NULL, 'High FODMAP'),

('Snow Peas', ARRAY['snowpeas', 'mange tout'], 'vegetable', 'legume',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[9,10,11], TRUE, 4.3, 2.6,
  4, 'cold', NULL, 'Low FODMAP up to 10 pods'),

('Sugar Snap Peas', ARRAY['snap peas', 'sugar snaps'], 'vegetable', 'legume',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[9,10,11], FALSE, 4.8, 2.6,
  4, 'cold', NULL, 'Low FODMAP up to 10 pods'),

('Peas', ARRAY['green peas', 'shelling peas', 'garden peas'], 'vegetable', 'legume',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[9,10,11], FALSE, 9.4, 5.5,
  3, 'cold', 'Too high carb', 'High FODMAP'),

('Corn', ARRAY['sweet corn', 'corn cob', 'corn on cob'], 'vegetable', 'legume',
  FALSE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], ARRAY[12,1,2,3], TRUE, 16.3, 2.0,
  4, 'cold', 'Too high carb for keto', 'Low FODMAP up to 1/2 cob'),

('Corn Baby', ARRAY['baby corn'], 'vegetable', 'legume',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 4.7, 2.9,
  5, 'cold', NULL, NULL),

-- =============================================================================
-- STALKS & STEMS
-- =============================================================================
('Celery', ARRAY['celery bunch', 'celery sticks'], 'vegetable', 'stalk',
  TRUE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'salad'], NULL, TRUE, 1.4, 1.6,
  14, 'cold', 'Very low carb', 'High FODMAP'),

('Asparagus', ARRAY['asparagus bunch', 'green asparagus'], 'vegetable', 'stalk',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[9,10,11], FALSE, 2.0, 1.8,
  4, 'cold', NULL, 'Low FODMAP up to 1 spear'),

('Fennel', ARRAY['fennel bulb', 'florence fennel'], 'vegetable', 'stalk',
  TRUE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'salad'], ARRAY[4,5,6,7,8], FALSE, 4.2, 3.1,
  10, 'cold', NULL, 'High FODMAP'),

('Rhubarb', ARRAY['rhubarb stalks'], 'vegetable', 'stalk',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[9,10,11,12], FALSE, 2.7, 1.8,
  7, 'cold', NULL, NULL),

('Artichoke Globe', ARRAY['globe artichoke', 'artichoke'], 'vegetable', 'stalk',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], ARRAY[9,10,11], FALSE, 5.1, 5.4,
  7, 'cold', NULL, 'High FODMAP'),

-- =============================================================================
-- MUSHROOMS
-- =============================================================================
('Mushroom Button', ARRAY['button mushrooms', 'white mushrooms', 'champignon'], 'vegetable', 'mushroom',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 0.3, 1.0,
  5, 'cold', 'Excellent for keto', 'Low FODMAP up to 75g'),

('Mushroom Cup', ARRAY['cup mushrooms'], 'vegetable', 'mushroom',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 0.3, 1.0,
  5, 'cold', NULL, NULL),

('Mushroom Flat', ARRAY['flat mushrooms', 'field mushrooms', 'portobello'], 'vegetable', 'mushroom',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 0.3, 1.0,
  4, 'cold', NULL, NULL),

('Mushroom Swiss Brown', ARRAY['swiss browns', 'cremini', 'brown mushrooms'], 'vegetable', 'mushroom',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 0.3, 1.0,
  5, 'cold', NULL, NULL),

('Mushroom Oyster', ARRAY['oyster mushrooms'], 'vegetable', 'mushroom',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 3.3, 2.3,
  4, 'cold', NULL, NULL),

('Mushroom Shiitake', ARRAY['shiitake', 'chinese mushroom'], 'vegetable', 'mushroom',
  TRUE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto'], NULL, TRUE, 4.3, 2.5,
  7, 'cold', NULL, 'High FODMAP'),

('Mushroom Enoki', ARRAY['enoki', 'enokitake'], 'vegetable', 'mushroom',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 5.1, 2.7,
  7, 'cold', NULL, NULL),

('Mushroom King Oyster', ARRAY['king oyster', 'trumpet mushroom'], 'vegetable', 'mushroom',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 3.3, 2.3,
  7, 'cold', NULL, NULL),

-- =============================================================================
-- HERBS (Fresh)
-- =============================================================================
('Parsley Flat', ARRAY['flat leaf parsley', 'italian parsley', 'continental parsley'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 3.0, 3.3,
  7, 'cold', NULL, NULL),

('Parsley Curly', ARRAY['curly parsley'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 3.0, 3.3,
  7, 'cold', NULL, NULL),

('Coriander', ARRAY['cilantro', 'fresh coriander'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 0.9, 2.8,
  5, 'cold', NULL, NULL),

('Basil', ARRAY['sweet basil', 'fresh basil'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 0.6, 1.6,
  5, 'cold', NULL, NULL),

('Mint', ARRAY['fresh mint', 'spearmint'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 5.3, 6.8,
  5, 'cold', NULL, NULL),

('Dill', ARRAY['fresh dill'], 'herbs', 'herb',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 4.9, 2.1,
  5, 'cold', NULL, NULL),

('Thyme', ARRAY['fresh thyme'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 14.1, 14.0,
  7, 'cold', NULL, NULL),

('Rosemary', ARRAY['fresh rosemary'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 6.6, 14.1,
  14, 'cold', NULL, NULL),

('Sage', ARRAY['fresh sage'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 6.0, 10.6,
  7, 'cold', NULL, NULL),

('Oregano', ARRAY['fresh oregano'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 4.1, 9.0,
  7, 'cold', NULL, NULL),

('Tarragon', ARRAY['french tarragon'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, FALSE, 5.0, 3.0,
  7, 'cold', NULL, NULL),

('Lemongrass', ARRAY['lemon grass'], 'herbs', 'herb',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 25.0, 0.0,
  14, 'cold', 'Small amounts OK', NULL),

-- =============================================================================
-- FRUITS - BERRIES (Many are keto-friendly in moderation)
-- =============================================================================
('Strawberries', ARRAY['strawberry', 'strawberries punnet'], 'fruit', 'berries',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[10,11,12,1], TRUE, 5.7, 2.0,
  4, 'cold', 'Limit to 1/2 cup', NULL),

('Blueberries', ARRAY['blueberry', 'blueberries punnet'], 'fruit', 'berries',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[11,12,1,2], FALSE, 12.1, 2.4,
  7, 'cold', 'Limit to 1/4 cup', 'Low FODMAP up to 20 berries'),

('Raspberries', ARRAY['raspberry', 'raspberries punnet'], 'fruit', 'berries',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2], FALSE, 5.4, 6.5,
  3, 'cold', 'One of lowest sugar berries', 'Low FODMAP up to 30 berries'),

('Blackberries', ARRAY['blackberry', 'blackberries punnet'], 'fruit', 'berries',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[12,1,2], FALSE, 4.3, 5.3,
  3, 'cold', 'Excellent for keto', NULL),

('Mulberries', ARRAY['mulberry'], 'fruit', 'berries',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[11,12,1], FALSE, 8.1, 1.7,
  2, 'cold', NULL, NULL),

('Boysenberries', ARRAY['boysenberry'], 'fruit', 'berries',
  TRUE, TRUE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[12,1], FALSE, 6.8, 5.3,
  2, 'cold', NULL, NULL),

-- =============================================================================
-- FRUITS - STONE FRUIT (Generally NOT keto due to sugar)
-- =============================================================================
('Peaches', ARRAY['peach', 'white peach', 'yellow peach'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[12,1,2], FALSE, 8.4, 1.5,
  5, 'room_temp', 'Too high in sugar', 'High FODMAP'),

('Nectarines', ARRAY['nectarine', 'white nectarine', 'yellow nectarine'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[12,1,2], FALSE, 8.9, 1.7,
  5, 'room_temp', 'Too high in sugar', 'High FODMAP'),

('Plums', ARRAY['plum', 'blood plum', 'sugar plum'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[1,2,3], FALSE, 9.9, 1.4,
  5, 'room_temp', NULL, 'High FODMAP'),

('Apricots', ARRAY['apricot'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[11,12,1], FALSE, 9.1, 2.0,
  5, 'room_temp', NULL, 'High FODMAP'),

('Cherries', ARRAY['cherry', 'sweet cherries'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[11,12,1], FALSE, 12.2, 2.1,
  5, 'cold', 'Too high in sugar', 'High FODMAP'),

('Mangoes', ARRAY['mango', 'kensington pride', 'r2e2', 'calypso'], 'fruit', 'stone_fruit',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[11,12,1,2,3], FALSE, 14.9, 1.6,
  5, 'room_temp', 'Too high in sugar', 'High FODMAP'),

-- =============================================================================
-- FRUITS - CITRUS (Keto OK in moderation, mostly FODMAP safe)
-- =============================================================================
('Oranges', ARRAY['orange', 'navel orange', 'valencia orange'], 'fruit', 'citrus',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[5,6,7,8,9], TRUE, 9.4, 2.4,
  14, 'room_temp', 'Too high for strict keto', NULL),

('Mandarins', ARRAY['mandarin', 'imperial mandarin', 'clementine'], 'fruit', 'citrus',
  FALSE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], ARRAY[5,6,7,8], TRUE, 10.6, 1.8,
  10, 'room_temp', 'Too high for strict keto', NULL),

('Lemons', ARRAY['lemon', 'meyer lemon', 'eureka lemon'], 'fruit', 'citrus',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[5,6,7,8,9], TRUE, 6.5, 2.8,
  21, 'room_temp', 'Low sugar - keto friendly', NULL),

('Limes', ARRAY['lime', 'tahitian lime'], 'fruit', 'citrus',
  TRUE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 7.7, 2.8,
  14, 'room_temp', 'Low sugar - keto friendly', NULL),

('Grapefruit', ARRAY['pink grapefruit', 'ruby grapefruit'], 'fruit', 'citrus',
  TRUE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[6,7,8,9], FALSE, 6.9, 1.1,
  14, 'room_temp', 'Lower sugar citrus', NULL),

('Blood Oranges', ARRAY['blood orange'], 'fruit', 'citrus',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[7,8,9], FALSE, 9.4, 2.4,
  14, 'room_temp', NULL, NULL),

('Tangelos', ARRAY['tangelo', 'minneola'], 'fruit', 'citrus',
  FALSE, TRUE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'fodmap'], ARRAY[6,7,8], FALSE, 10.0, 1.8,
  10, 'room_temp', NULL, NULL),

('Cumquats', ARRAY['kumquat', 'cumquat'], 'fruit', 'citrus',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], ARRAY[6,7,8,9], FALSE, 9.4, 6.5,
  14, 'cold', 'Eat whole - fiber offsets carbs', NULL),

-- =============================================================================
-- FRUITS - POME (Apples, Pears - NOT keto, watch FODMAP)
-- =============================================================================
('Apples Granny Smith', ARRAY['granny smith', 'green apple'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 11.4, 2.4,
  30, 'cold', 'Too high in sugar', 'High FODMAP'),

('Apples Pink Lady', ARRAY['pink lady', 'cripps pink'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 12.8, 2.4,
  30, 'cold', NULL, 'High FODMAP'),

('Apples Fuji', ARRAY['fuji apple'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 13.8, 2.1,
  30, 'cold', NULL, 'High FODMAP'),

('Apples Royal Gala', ARRAY['royal gala', 'gala apple'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 12.8, 2.4,
  30, 'cold', NULL, 'High FODMAP'),

('Apples Jazz', ARRAY['jazz apple'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 12.8, 2.4,
  30, 'cold', NULL, 'High FODMAP'),

('Pears Packham', ARRAY['packham pear', 'williams pear'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], TRUE, 10.0, 3.1,
  14, 'room_temp', 'Too high in sugar', 'High FODMAP'),

('Pears Beurre Bosc', ARRAY['bosc pear', 'brown pear'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], FALSE, 10.0, 3.1,
  14, 'room_temp', NULL, 'High FODMAP'),

('Pears Nashi', ARRAY['nashi', 'asian pear', 'japanese pear'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], FALSE, 8.6, 3.6,
  14, 'cold', NULL, 'High FODMAP'),

('Pears Corella', ARRAY['corella pear'], 'fruit', 'pome',
  FALSE, FALSE, TRUE, TRUE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[3,4,5,6], FALSE, 10.0, 3.1,
  14, 'room_temp', NULL, 'High FODMAP'),

('Quinces', ARRAY['quince'], 'fruit', 'pome',
  FALSE, FALSE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg'], ARRAY[4,5,6], FALSE, 6.3, 1.9,
  30, 'room_temp', NULL, NULL),

-- =============================================================================
-- FRUITS - TROPICAL
-- =============================================================================
('Bananas', ARRAY['banana', 'cavendish banana'], 'fruit', 'tropical',
  FALSE, FALSE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'salad'], NULL, TRUE, 20.2, 2.6,
  5, 'room_temp', 'Not keto friendly', 'High FODMAP when ripe'),

('Bananas Lady Finger', ARRAY['lady finger banana', 'sugar banana'], 'fruit', 'tropical',
  FALSE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], NULL, TRUE, 20.2, 2.6,
  5, 'room_temp', NULL, 'Low FODMAP - 1 medium'),

('Pineapple', ARRAY['pineapple whole', 'pineapple half'], 'fruit', 'tropical',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[11,12,1,2,3], TRUE, 11.8, 1.4,
  5, 'room_temp', 'Too high in sugar', 'Low FODMAP up to 1 cup'),

('Papaya', ARRAY['pawpaw', 'red papaya'], 'fruit', 'tropical',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[1,2,3,4,5], TRUE, 7.8, 1.7,
  5, 'room_temp', NULL, NULL),

('Passionfruit', ARRAY['passion fruit', 'granadilla'], 'fruit', 'tropical',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[11,12,1,2,3,4,5], TRUE, 9.5, 10.4,
  7, 'room_temp', 'High fiber offsets carbs', NULL),

('Kiwifruit', ARRAY['kiwi', 'green kiwi', 'gold kiwi'], 'fruit', 'tropical',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[4,5,6,7,8,9], TRUE, 11.1, 3.0,
  14, 'cold', 'Too high for keto', 'Low FODMAP - 2 small'),

('Dragon Fruit', ARRAY['dragonfruit', 'pitaya'], 'fruit', 'tropical',
  FALSE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[1,2,3,4], FALSE, 9.0, 1.0,
  5, 'cold', NULL, NULL),

('Lychees', ARRAY['lychee', 'litchi'], 'fruit', 'tropical',
  FALSE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[11,12,1], FALSE, 15.2, 1.3,
  5, 'cold', 'High sugar', 'High FODMAP'),

('Coconut', ARRAY['young coconut', 'coconut fresh'], 'fruit', 'tropical',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 6.2, 9.0,
  14, 'cold', 'Excellent healthy fat source', NULL),

-- =============================================================================
-- FRUITS - MELONS
-- =============================================================================
('Watermelon', ARRAY['watermelon whole', 'watermelon half', 'seedless watermelon'], 'fruit', 'melon',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[12,1,2,3], TRUE, 7.1, 0.4,
  7, 'cold', 'High GI, not keto', 'High FODMAP'),

('Rockmelon', ARRAY['cantaloupe', 'musk melon'], 'fruit', 'melon',
  FALSE, TRUE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[12,1,2,3], TRUE, 7.3, 0.9,
  5, 'cold', NULL, 'Low FODMAP up to 3/4 cup'),

('Honeydew', ARRAY['honeydew melon', 'honey dew'], 'fruit', 'melon',
  FALSE, FALSE, TRUE, TRUE, TRUE,
  ARRAY['fruit_veg', 'salad'], ARRAY[12,1,2,3], TRUE, 8.1, 0.8,
  7, 'cold', NULL, 'High FODMAP'),

-- =============================================================================
-- FRUITS - OTHER
-- =============================================================================
('Grapes Green', ARRAY['green grapes', 'sultana grapes', 'thompson seedless'], 'fruit', 'vine',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[2,3,4,5], TRUE, 16.3, 0.9,
  7, 'cold', 'Very high in sugar', 'Low FODMAP up to 6 grapes'),

('Grapes Red', ARRAY['red grapes', 'crimson seedless'], 'fruit', 'vine',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[2,3,4,5], TRUE, 16.3, 0.9,
  7, 'cold', 'Very high in sugar', NULL),

('Grapes Black', ARRAY['black grapes'], 'fruit', 'vine',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[2,3,4,5], FALSE, 16.3, 0.9,
  7, 'cold', NULL, NULL),

('Figs', ARRAY['fresh figs', 'black figs'], 'fruit', 'other',
  FALSE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'salad'], ARRAY[2,3,4], FALSE, 16.3, 2.9,
  3, 'cold', 'High sugar', 'High FODMAP'),

('Pomegranate', ARRAY['pomegranate seeds', 'pomegranate arils'], 'fruit', 'other',
  FALSE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'fodmap', 'salad'], ARRAY[3,4,5,6], FALSE, 14.7, 4.0,
  14, 'cold', 'High carb', 'Low FODMAP - small serve'),

('Avocado', ARRAY['avocado hass', 'hass avocado', 'avo'], 'fruit', 'other',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[9,10,11,12,1,2,3,4,5], TRUE, 1.8, 6.7,
  5, 'room_temp', 'PERFECT for keto - healthy fats', 'Low FODMAP - 1/8 avocado'),

('Avocado Shepard', ARRAY['shepard avocado', 'green avocado'], 'fruit', 'other',
  TRUE, TRUE, TRUE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[2,3,4,5], FALSE, 1.8, 6.7,
  5, 'room_temp', 'Excellent for keto', NULL),

('Olives', ARRAY['green olives', 'kalamata olives', 'black olives'], 'fruit', 'other',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], ARRAY[4,5,6], FALSE, 0.5, 2.5,
  21, 'cold', 'Excellent healthy fat source', NULL),

-- =============================================================================
-- DAIRY (If supplied by BDM)
-- =============================================================================
('Milk Full Cream', ARRAY['full cream milk', 'whole milk'], 'dairy', 'milk',
  FALSE, FALSE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg'], NULL, TRUE, 4.6, 0.0,
  10, 'cold', 'Contains lactose - limit on keto', 'High FODMAP'),

('Milk A2', ARRAY['a2 milk'], 'dairy', 'milk',
  FALSE, FALSE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg'], NULL, TRUE, 4.6, 0.0,
  10, 'cold', NULL, 'High FODMAP'),

('Milk Lactose Free', ARRAY['lactose free milk'], 'dairy', 'milk',
  FALSE, TRUE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg', 'fodmap'], NULL, TRUE, 4.6, 0.0,
  10, 'cold', NULL, 'Low FODMAP'),

('Cream', ARRAY['pure cream', 'thickened cream', 'pouring cream'], 'dairy', 'cream',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 2.8, 0.0,
  14, 'cold', 'Excellent for keto', 'Low FODMAP small serves'),

('Butter', ARRAY['butter unsalted', 'butter salted'], 'dairy', 'butter',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 0.1, 0.0,
  30, 'cold', 'Perfect for keto', 'Low FODMAP'),

('Cheese Cheddar', ARRAY['cheddar', 'tasty cheese'], 'dairy', 'cheese',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 0.4, 0.0,
  60, 'cold', 'Excellent for keto', 'Low FODMAP - aged'),

('Cheese Feta', ARRAY['feta', 'greek feta'], 'dairy', 'cheese',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.4, 0.0,
  30, 'cold', NULL, 'Low FODMAP'),

('Cheese Halloumi', ARRAY['halloumi', 'haloumi'], 'dairy', 'cheese',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 1.0, 0.0,
  30, 'cold', NULL, NULL),

('Cheese Ricotta', ARRAY['ricotta', 'fresh ricotta'], 'dairy', 'cheese',
  TRUE, FALSE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'salad'], NULL, TRUE, 1.6, 0.0,
  7, 'cold', NULL, 'High FODMAP'),

('Cheese Goat', ARRAY['goat cheese', 'chevre'], 'dairy', 'cheese',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap', 'salad'], NULL, TRUE, 0.1, 0.0,
  14, 'cold', NULL, 'Low FODMAP'),

('Yoghurt Natural', ARRAY['natural yoghurt', 'greek yoghurt'], 'dairy', 'yoghurt',
  TRUE, FALSE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto'], NULL, TRUE, 3.2, 0.0,
  21, 'cold', 'Full fat only for keto', 'High FODMAP'),

('Yoghurt Lactose Free', ARRAY['lactose free yoghurt'], 'dairy', 'yoghurt',
  TRUE, TRUE, FALSE, FALSE, TRUE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 3.2, 0.0,
  21, 'cold', NULL, 'Low FODMAP'),

-- =============================================================================
-- EGGS
-- =============================================================================
('Eggs Free Range', ARRAY['free range eggs', 'eggs dozen', 'eggs 12pk'], 'eggs', 'eggs',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 0.4, 0.0,
  28, 'cold', 'Perfect for keto', 'Low FODMAP'),

('Eggs Pasture Raised', ARRAY['pasture raised eggs', 'pastured eggs'], 'eggs', 'eggs',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, TRUE, 0.4, 0.0,
  28, 'cold', 'Best quality eggs', NULL),

('Eggs Duck', ARRAY['duck eggs'], 'eggs', 'eggs',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, FALSE, 0.4, 0.0,
  21, 'cold', NULL, NULL),

('Eggs Quail', ARRAY['quail eggs'], 'eggs', 'eggs',
  TRUE, TRUE, FALSE, FALSE, FALSE,
  ARRAY['fruit_veg', 'keto', 'fodmap'], NULL, FALSE, 0.4, 0.0,
  21, 'cold', NULL, NULL)

ON CONFLICT (product_name) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  is_keto = EXCLUDED.is_keto,
  is_fodmap_safe = EXCLUDED.is_fodmap_safe,
  is_salad_suitable = EXCLUDED.is_salad_suitable,
  is_juice_suitable = EXCLUDED.is_juice_suitable,
  is_smoothie_suitable = EXCLUDED.is_smoothie_suitable,
  suitable_box_types = EXCLUDED.suitable_box_types,
  peak_months = EXCLUDED.peak_months,
  is_year_round = EXCLUDED.is_year_round,
  carbs_per_100g = EXCLUDED.carbs_per_100g,
  fiber_per_100g = EXCLUDED.fiber_per_100g,
  typical_shelf_days = EXCLUDED.typical_shelf_days,
  storage_type = EXCLUDED.storage_type,
  keto_notes = EXCLUDED.keto_notes,
  fodmap_notes = EXCLUDED.fodmap_notes,
  updated_at = NOW();

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View: Products suitable for KETO boxes
CREATE OR REPLACE VIEW v_rhf_keto_products AS
SELECT product_name, category, subcategory, carbs_per_100g, fiber_per_100g, keto_notes
FROM rhf_product_box_suitability
WHERE is_keto = TRUE
ORDER BY category, subcategory, product_name;

-- View: Products suitable for FODMAP boxes
CREATE OR REPLACE VIEW v_rhf_fodmap_products AS
SELECT product_name, category, subcategory, fodmap_notes
FROM rhf_product_box_suitability
WHERE is_fodmap_safe = TRUE
ORDER BY category, subcategory, product_name;

-- View: Products suitable for SALAD boxes
CREATE OR REPLACE VIEW v_rhf_salad_products AS
SELECT product_name, category, subcategory
FROM rhf_product_box_suitability
WHERE is_salad_suitable = TRUE
ORDER BY category, subcategory, product_name;

-- View: Products by box type eligibility
CREATE OR REPLACE VIEW v_rhf_products_by_box_type AS
SELECT
  product_name,
  category,
  subcategory,
  is_keto,
  is_fodmap_safe,
  is_salad_suitable,
  suitable_box_types,
  peak_months,
  is_year_round
FROM rhf_product_box_suitability
ORDER BY category, subcategory, product_name;

-- View: Seasonal products for current month
CREATE OR REPLACE VIEW v_rhf_in_season_now AS
SELECT
  product_name,
  category,
  subcategory,
  peak_months,
  is_year_round,
  suitable_box_types
FROM rhf_product_box_suitability
WHERE is_year_round = TRUE
   OR EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER = ANY(peak_months)
ORDER BY category, subcategory, product_name;

-- =============================================================================
-- FUNCTION: Match supplier product to suitability
-- =============================================================================
CREATE OR REPLACE FUNCTION rhf_match_product_suitability(p_supplier_product_name TEXT)
RETURNS TABLE (
  suitability_id UUID,
  matched_name TEXT,
  match_score INTEGER,
  is_keto BOOLEAN,
  is_fodmap_safe BOOLEAN,
  is_salad_suitable BOOLEAN,
  suitable_box_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pbs.id,
    pbs.product_name,
    CASE
      WHEN LOWER(pbs.product_name) = LOWER(p_supplier_product_name) THEN 100
      WHEN LOWER(p_supplier_product_name) = ANY(SELECT LOWER(unnest(pbs.aliases))) THEN 90
      WHEN LOWER(pbs.product_name) ILIKE '%' || LOWER(p_supplier_product_name) || '%' THEN 70
      WHEN LOWER(p_supplier_product_name) ILIKE '%' || LOWER(pbs.product_name) || '%' THEN 60
      ELSE 0
    END as match_score,
    pbs.is_keto,
    pbs.is_fodmap_safe,
    pbs.is_salad_suitable,
    pbs.suitable_box_types
  FROM rhf_product_box_suitability pbs
  WHERE
    LOWER(pbs.product_name) = LOWER(p_supplier_product_name)
    OR LOWER(p_supplier_product_name) = ANY(SELECT LOWER(unnest(pbs.aliases)))
    OR LOWER(pbs.product_name) ILIKE '%' || LOWER(p_supplier_product_name) || '%'
    OR LOWER(p_supplier_product_name) ILIKE '%' || LOWER(pbs.product_name) || '%'
  ORDER BY match_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE rhf_product_box_suitability IS 'Master reference for which organic products can go in which box types (keto, fodmap, salad, etc)';
COMMENT ON COLUMN rhf_product_box_suitability.is_keto IS 'Suitable for KETO boxes - generally <5g net carbs per 100g';
COMMENT ON COLUMN rhf_product_box_suitability.is_fodmap_safe IS 'Monash University certified low FODMAP';
COMMENT ON COLUMN rhf_product_box_suitability.peak_months IS 'Australian peak season months (1=Jan, 12=Dec)';
COMMENT ON COLUMN rhf_product_box_suitability.suitable_box_types IS 'Box types this product is eligible for';
