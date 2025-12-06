-- =============================================================================
-- RHF Box Composition Rules
-- Quantity ranges, substitutes, priorities for automatic box building
-- Created: 2025-12-06
-- =============================================================================

-- =============================================================================
-- SUBSTITUTE GROUPS (Interchangeable products)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_substitute_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  group_name TEXT NOT NULL UNIQUE,       -- e.g., 'leafy_greens', 'berries', 'stone_fruit'
  description TEXT,

  -- Selection rules when substituting
  prefer_in_season BOOLEAN DEFAULT TRUE, -- Prefer seasonal items
  prefer_local BOOLEAN DEFAULT TRUE,     -- Prefer local origin
  prefer_lower_cost BOOLEAN DEFAULT FALSE, -- Prefer cost savings

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link products to substitute groups
CREATE TABLE IF NOT EXISTS rhf_product_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_name TEXT NOT NULL,            -- Matches rhf_product_box_suitability.product_name
  substitute_group_id UUID NOT NULL REFERENCES rhf_substitute_groups(id) ON DELETE CASCADE,

  -- Priority within group (1 = highest/preferred, 10 = lowest/last resort)
  priority INTEGER DEFAULT 5,

  -- Substitution constraints
  min_sub_priority INTEGER DEFAULT 1,    -- Can substitute for items with priority >= this
  max_sub_priority INTEGER DEFAULT 10,   -- Can substitute for items with priority <= this

  -- Notes
  substitution_notes TEXT,               -- e.g., "Only substitute in winter"

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_name, substitute_group_id)
);

CREATE INDEX IF NOT EXISTS idx_rhf_ps_group ON rhf_product_substitutes(substitute_group_id);
CREATE INDEX IF NOT EXISTS idx_rhf_ps_product ON rhf_product_substitutes(product_name);
CREATE INDEX IF NOT EXISTS idx_rhf_ps_priority ON rhf_product_substitutes(priority);

-- =============================================================================
-- BOX COMPOSITION RULES (What goes in each box type)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_box_composition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  box_type TEXT NOT NULL,                -- 'fruit_veg', 'keto', 'fodmap', 'salad'

  -- Category requirements
  category TEXT,                         -- 'vegetable', 'fruit', 'herbs', etc.
  subcategory TEXT,                      -- 'leafy', 'root', 'berries', etc.
  substitute_group TEXT,                 -- Alternative: use substitute group name

  -- Quantity per box (how much of this category/group)
  min_items INTEGER DEFAULT 1,           -- Minimum items of this type
  max_items INTEGER DEFAULT 3,           -- Maximum items of this type
  target_items INTEGER DEFAULT 2,        -- Ideal number of items

  -- Weight-based rules (for veg/fruit that sell by weight)
  min_weight_grams INTEGER,              -- Minimum total weight
  max_weight_grams INTEGER,              -- Maximum total weight
  target_weight_grams INTEGER,           -- Target weight

  -- Value-based rules (for cost control)
  min_cost_percent DECIMAL(5,2),         -- Min % of box cost for this category
  max_cost_percent DECIMAL(5,2),         -- Max % of box cost
  target_cost_percent DECIMAL(5,2),      -- Target % of box cost

  -- Priority for filling box
  fill_priority INTEGER DEFAULT 5,       -- 1=fill first, 10=fill last
  is_required BOOLEAN DEFAULT FALSE,     -- Must include (vs nice-to-have)

  -- Seasonal adjustments
  apply_in_months INTEGER[],             -- Only apply rule in these months (NULL = all)

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(box_type, category, subcategory, substitute_group)
);

CREATE INDEX IF NOT EXISTS idx_rhf_bcr_box ON rhf_box_composition_rules(box_type);
CREATE INDEX IF NOT EXISTS idx_rhf_bcr_category ON rhf_box_composition_rules(category);

-- =============================================================================
-- PRODUCT BOX QUANTITIES (Specific product amounts per box type)
-- =============================================================================
ALTER TABLE rhf_product_box_suitability
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 5,              -- 1=premium/preferred, 10=filler
ADD COLUMN IF NOT EXISTS substitute_group_id UUID,
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'each',                 -- 'each', 'kg', 'bunch', 'punnet', 'pack'
ADD COLUMN IF NOT EXISTS typical_unit_weight_g INTEGER,                 -- Weight per unit in grams
ADD COLUMN IF NOT EXISTS min_qty_per_box DECIMAL(5,2) DEFAULT 1,        -- Minimum quantity when included
ADD COLUMN IF NOT EXISTS max_qty_per_box DECIMAL(5,2) DEFAULT 2,        -- Maximum quantity when included
ADD COLUMN IF NOT EXISTS typical_qty_per_box DECIMAL(5,2) DEFAULT 1,    -- Typical/ideal quantity
ADD COLUMN IF NOT EXISTS cost_tier TEXT DEFAULT 'medium';               -- 'budget', 'medium', 'premium'

-- =============================================================================
-- SEED: Substitute Groups
-- =============================================================================
INSERT INTO rhf_substitute_groups (group_name, description) VALUES
-- Leafy Greens
('leafy_lettuce', 'Lettuces - cos, iceberg, butter, oak leaf, mixed'),
('leafy_cooking', 'Cooking greens - spinach, silverbeet, kale'),
('leafy_asian', 'Asian greens - bok choy, choy sum, gai lan, wombok'),
('leafy_salad', 'Salad leaves - rocket, watercress, endive, radicchio'),

-- Brassicas
('brassica_heads', 'Head brassicas - broccoli, cauliflower'),
('brassica_cabbage', 'Cabbages - green, red, savoy, wombok'),
('brassica_sprouts', 'Small brassicas - brussels sprouts, broccolini'),

-- Alliums
('allium_onion', 'Onions - brown, red, white'),
('allium_mild', 'Mild alliums - leek, spring onion, chives'),

-- Nightshades
('nightshade_tomato', 'Tomatoes - round, cherry, roma, truss, heirloom'),
('nightshade_capsicum', 'Capsicums - red, green, yellow, mixed'),
('nightshade_eggplant', 'Eggplants - large, lebanese'),
('nightshade_chilli', 'Chillies - red, green'),

-- Cucurbits
('cucurbit_zucchini', 'Zucchinis - green, yellow'),
('cucurbit_cucumber', 'Cucumbers - lebanese, telegraph, apple'),
('cucurbit_pumpkin', 'Pumpkins - butternut, jap, QLD blue'),
('cucurbit_squash', 'Summer squash - yellow, button'),

-- Root Vegetables
('root_carrot', 'Carrots - regular, baby, rainbow'),
('root_potato', 'Potatoes - washed, baby, sweet'),
('root_beetroot', 'Beetroot - regular, baby, golden'),
('root_radish', 'Radishes - red, daikon, watermelon'),
('root_turnip', 'Turnips and relatives - turnip, swede, parsnip'),

-- Legumes & Pods
('legume_beans', 'Green beans - green, butter'),
('legume_peas', 'Peas and pods - snow peas, sugar snap, peas'),

-- Stalks
('stalk_celery', 'Celery and fennel'),
('stalk_asparagus', 'Asparagus'),

-- Mushrooms
('mushroom_common', 'Common mushrooms - button, cup, flat, swiss brown'),
('mushroom_specialty', 'Specialty mushrooms - oyster, shiitake, enoki, king'),

-- Herbs
('herb_leafy', 'Leafy herbs - parsley, coriander, basil'),
('herb_woody', 'Woody herbs - thyme, rosemary, sage, oregano'),
('herb_fresh', 'Fresh herbs - mint, dill, tarragon'),

-- Berries
('berry_common', 'Common berries - strawberry, blueberry, raspberry'),
('berry_specialty', 'Specialty berries - blackberry, mulberry, boysenberry'),

-- Stone Fruit
('stone_peach', 'Peaches and nectarines'),
('stone_plum', 'Plums and apricots'),
('stone_cherry', 'Cherries'),
('stone_tropical', 'Tropical stone fruit - mango'),

-- Citrus
('citrus_eating', 'Eating citrus - orange, mandarin, tangelo'),
('citrus_cooking', 'Cooking citrus - lemon, lime, grapefruit'),

-- Pome
('pome_apple', 'Apples - granny smith, pink lady, fuji, gala, jazz'),
('pome_pear', 'Pears - packham, bosc, nashi, corella'),

-- Tropical
('tropical_banana', 'Bananas - cavendish, lady finger'),
('tropical_exotic', 'Exotic tropical - pineapple, papaya, passionfruit, dragon fruit'),

-- Melons
('melon_water', 'Watermelon'),
('melon_rock', 'Rockmelons and honeydews'),

-- Grapes
('grape_all', 'Grapes - green, red, black'),

-- Other Fruits
('fruit_avocado', 'Avocados - hass, shepard'),
('fruit_kiwi', 'Kiwifruit'),

-- Dairy
('dairy_milk', 'Milk - full cream, A2, lactose free'),
('dairy_cheese_hard', 'Hard cheese - cheddar'),
('dairy_cheese_soft', 'Soft cheese - feta, goat, ricotta, halloumi'),
('dairy_cream', 'Cream and butter'),
('dairy_yoghurt', 'Yoghurt'),

-- Eggs
('eggs_chicken', 'Chicken eggs - free range, pastured'),
('eggs_specialty', 'Specialty eggs - duck, quail')

ON CONFLICT (group_name) DO UPDATE SET description = EXCLUDED.description;

-- =============================================================================
-- SEED: Link Products to Substitute Groups
-- =============================================================================
INSERT INTO rhf_product_substitutes (product_name, substitute_group_id, priority, substitution_notes)
SELECT p.product_name, g.id,
  CASE
    -- Assign priorities within groups
    WHEN p.product_name IN ('Lettuce Cos', 'Spinach Baby', 'Broccoli', 'Tomato', 'Capsicum Red',
                            'Zucchini', 'Cucumber Lebanese', 'Carrot', 'Mushroom Button',
                            'Strawberries', 'Apples Pink Lady', 'Oranges', 'Bananas', 'Avocado') THEN 1
    WHEN p.product_name LIKE '%Baby%' OR p.product_name LIKE '%Cherry%' THEN 2
    WHEN p.product_name LIKE '%Heirloom%' OR p.product_name LIKE '%Heritage%' THEN 4
    ELSE 3
  END,
  NULL
FROM rhf_product_box_suitability p
CROSS JOIN rhf_substitute_groups g
WHERE
  -- Leafy lettuces
  (g.group_name = 'leafy_lettuce' AND p.product_name IN ('Lettuce Cos', 'Lettuce Iceberg', 'Lettuce Butter', 'Lettuce Oak Leaf', 'Lettuce Mixed'))
  OR (g.group_name = 'leafy_cooking' AND p.product_name IN ('Spinach Baby', 'Spinach Bunch', 'Kale', 'Kale Tuscan', 'Silverbeet'))
  OR (g.group_name = 'leafy_asian' AND p.product_name IN ('Bok Choy', 'Bok Choy Baby', 'Choy Sum', 'Gai Lan', 'Wombok'))
  OR (g.group_name = 'leafy_salad' AND p.product_name IN ('Rocket', 'Watercress', 'Endive', 'Radicchio'))

  -- Brassicas
  OR (g.group_name = 'brassica_heads' AND p.product_name IN ('Broccoli', 'Cauliflower'))
  OR (g.group_name = 'brassica_cabbage' AND p.product_name IN ('Cabbage Green', 'Cabbage Red', 'Cabbage Savoy', 'Wombok'))
  OR (g.group_name = 'brassica_sprouts' AND p.product_name IN ('Brussels Sprouts', 'Broccoli Broccolini'))

  -- Alliums
  OR (g.group_name = 'allium_onion' AND p.product_name IN ('Onion Brown', 'Onion Red', 'Onion White'))
  OR (g.group_name = 'allium_mild' AND p.product_name IN ('Leek', 'Onion Spring', 'Chives', 'Shallots French'))

  -- Nightshades
  OR (g.group_name = 'nightshade_tomato' AND p.product_name IN ('Tomato', 'Tomato Cherry', 'Tomato Roma', 'Tomato Truss', 'Tomato Heirloom'))
  OR (g.group_name = 'nightshade_capsicum' AND p.product_name IN ('Capsicum Red', 'Capsicum Green', 'Capsicum Yellow', 'Capsicum Mixed'))
  OR (g.group_name = 'nightshade_eggplant' AND p.product_name IN ('Eggplant', 'Eggplant Lebanese'))
  OR (g.group_name = 'nightshade_chilli' AND p.product_name IN ('Chilli Red', 'Chilli Green'))

  -- Cucurbits
  OR (g.group_name = 'cucurbit_zucchini' AND p.product_name IN ('Zucchini', 'Zucchini Yellow'))
  OR (g.group_name = 'cucurbit_cucumber' AND p.product_name IN ('Cucumber Lebanese', 'Cucumber Telegraph', 'Cucumber Apple'))
  OR (g.group_name = 'cucurbit_pumpkin' AND p.product_name IN ('Pumpkin Butternut', 'Pumpkin Jap', 'Pumpkin Queensland Blue', 'Pumpkin Baby'))
  OR (g.group_name = 'cucurbit_squash' AND p.product_name IN ('Squash Yellow', 'Squash Button'))

  -- Roots
  OR (g.group_name = 'root_carrot' AND p.product_name IN ('Carrot', 'Carrot Baby', 'Carrot Rainbow'))
  OR (g.group_name = 'root_potato' AND p.product_name IN ('Potato', 'Potato Baby', 'Potato Sweet Orange', 'Potato Sweet Purple'))
  OR (g.group_name = 'root_beetroot' AND p.product_name IN ('Beetroot', 'Beetroot Baby', 'Beetroot Golden'))
  OR (g.group_name = 'root_radish' AND p.product_name IN ('Radish', 'Radish Daikon', 'Radish Watermelon'))
  OR (g.group_name = 'root_turnip' AND p.product_name IN ('Turnip', 'Parsnip', 'Swede', 'Celeriac'))

  -- Legumes
  OR (g.group_name = 'legume_beans' AND p.product_name IN ('Beans Green', 'Beans Butter', 'Beans Broad'))
  OR (g.group_name = 'legume_peas' AND p.product_name IN ('Snow Peas', 'Sugar Snap Peas', 'Peas'))

  -- Stalks
  OR (g.group_name = 'stalk_celery' AND p.product_name IN ('Celery', 'Fennel'))
  OR (g.group_name = 'stalk_asparagus' AND p.product_name IN ('Asparagus'))

  -- Mushrooms
  OR (g.group_name = 'mushroom_common' AND p.product_name IN ('Mushroom Button', 'Mushroom Cup', 'Mushroom Flat', 'Mushroom Swiss Brown'))
  OR (g.group_name = 'mushroom_specialty' AND p.product_name IN ('Mushroom Oyster', 'Mushroom Shiitake', 'Mushroom Enoki', 'Mushroom King Oyster'))

  -- Herbs
  OR (g.group_name = 'herb_leafy' AND p.product_name IN ('Parsley Flat', 'Parsley Curly', 'Coriander', 'Basil'))
  OR (g.group_name = 'herb_woody' AND p.product_name IN ('Thyme', 'Rosemary', 'Sage', 'Oregano'))
  OR (g.group_name = 'herb_fresh' AND p.product_name IN ('Mint', 'Dill', 'Tarragon'))

  -- Berries
  OR (g.group_name = 'berry_common' AND p.product_name IN ('Strawberries', 'Blueberries', 'Raspberries'))
  OR (g.group_name = 'berry_specialty' AND p.product_name IN ('Blackberries', 'Mulberries', 'Boysenberries'))

  -- Stone Fruit
  OR (g.group_name = 'stone_peach' AND p.product_name IN ('Peaches', 'Nectarines'))
  OR (g.group_name = 'stone_plum' AND p.product_name IN ('Plums', 'Apricots'))
  OR (g.group_name = 'stone_cherry' AND p.product_name IN ('Cherries'))
  OR (g.group_name = 'stone_tropical' AND p.product_name IN ('Mangoes'))

  -- Citrus
  OR (g.group_name = 'citrus_eating' AND p.product_name IN ('Oranges', 'Mandarins', 'Tangelos', 'Blood Oranges'))
  OR (g.group_name = 'citrus_cooking' AND p.product_name IN ('Lemons', 'Limes', 'Grapefruit', 'Cumquats'))

  -- Pome
  OR (g.group_name = 'pome_apple' AND p.product_name IN ('Apples Granny Smith', 'Apples Pink Lady', 'Apples Fuji', 'Apples Royal Gala', 'Apples Jazz'))
  OR (g.group_name = 'pome_pear' AND p.product_name IN ('Pears Packham', 'Pears Beurre Bosc', 'Pears Nashi', 'Pears Corella'))

  -- Tropical
  OR (g.group_name = 'tropical_banana' AND p.product_name IN ('Bananas', 'Bananas Lady Finger'))
  OR (g.group_name = 'tropical_exotic' AND p.product_name IN ('Pineapple', 'Papaya', 'Passionfruit', 'Kiwifruit', 'Dragon Fruit', 'Lychees', 'Coconut'))

  -- Melons
  OR (g.group_name = 'melon_water' AND p.product_name IN ('Watermelon'))
  OR (g.group_name = 'melon_rock' AND p.product_name IN ('Rockmelon', 'Honeydew'))

  -- Grapes
  OR (g.group_name = 'grape_all' AND p.product_name IN ('Grapes Green', 'Grapes Red', 'Grapes Black'))

  -- Other
  OR (g.group_name = 'fruit_avocado' AND p.product_name IN ('Avocado', 'Avocado Shepard'))
  OR (g.group_name = 'fruit_kiwi' AND p.product_name IN ('Kiwifruit'))

  -- Dairy
  OR (g.group_name = 'dairy_milk' AND p.product_name IN ('Milk Full Cream', 'Milk A2', 'Milk Lactose Free'))
  OR (g.group_name = 'dairy_cheese_hard' AND p.product_name IN ('Cheese Cheddar'))
  OR (g.group_name = 'dairy_cheese_soft' AND p.product_name IN ('Cheese Feta', 'Cheese Goat', 'Cheese Ricotta', 'Cheese Halloumi'))
  OR (g.group_name = 'dairy_cream' AND p.product_name IN ('Cream', 'Butter'))
  OR (g.group_name = 'dairy_yoghurt' AND p.product_name IN ('Yoghurt Natural', 'Yoghurt Lactose Free'))

  -- Eggs
  OR (g.group_name = 'eggs_chicken' AND p.product_name IN ('Eggs Free Range', 'Eggs Pasture Raised'))
  OR (g.group_name = 'eggs_specialty' AND p.product_name IN ('Eggs Duck', 'Eggs Quail'))

ON CONFLICT (product_name, substitute_group_id) DO UPDATE SET priority = EXCLUDED.priority;

-- =============================================================================
-- SEED: Box Composition Rules
-- =============================================================================
INSERT INTO rhf_box_composition_rules (
  box_type, category, subcategory, substitute_group,
  min_items, max_items, target_items,
  target_weight_grams, fill_priority, is_required, notes
) VALUES

-- =============================================================================
-- FRUIT & VEG BOXES ($50 single, $80 family)
-- =============================================================================
-- Fruit content
('fruit_veg', 'fruit', NULL, NULL, 3, 6, 4, NULL, 1, TRUE, 'Must have fruit selection'),
('fruit_veg', 'fruit', 'berries', 'berry_common', 0, 2, 1, NULL, 2, FALSE, 'Berries when in season'),
('fruit_veg', 'fruit', 'citrus', NULL, 1, 2, 1, NULL, 3, FALSE, 'Citrus for vitamin C'),
('fruit_veg', 'fruit', 'pome', NULL, 1, 3, 2, NULL, 3, FALSE, 'Apples/pears - pantry staple'),
('fruit_veg', NULL, NULL, 'tropical_banana', 1, 1, 1, NULL, 2, TRUE, 'Bananas are essential'),
('fruit_veg', NULL, NULL, 'fruit_avocado', 0, 2, 1, NULL, 3, FALSE, 'Avocado when available'),

-- Veg content
('fruit_veg', 'vegetable', NULL, NULL, 5, 10, 7, NULL, 1, TRUE, 'Must have vegetable selection'),
('fruit_veg', 'vegetable', 'leafy', NULL, 1, 3, 2, NULL, 1, TRUE, 'Leafy greens essential'),
('fruit_veg', 'vegetable', 'root', NULL, 2, 4, 3, NULL, 2, TRUE, 'Root veg for substance'),
('fruit_veg', NULL, NULL, 'nightshade_tomato', 1, 2, 1, NULL, 2, FALSE, 'Tomatoes when in season'),
('fruit_veg', NULL, NULL, 'nightshade_capsicum', 0, 2, 1, NULL, 3, FALSE, 'Capsicums add colour'),
('fruit_veg', NULL, NULL, 'allium_onion', 1, 2, 1, NULL, 2, TRUE, 'Onions are pantry essential'),
('fruit_veg', NULL, NULL, 'cucurbit_zucchini', 0, 2, 1, NULL, 4, FALSE, 'Zucchini when in season'),
('fruit_veg', NULL, NULL, 'brassica_heads', 0, 2, 1, NULL, 3, FALSE, 'Broccoli/cauli'),
('fruit_veg', NULL, NULL, 'mushroom_common', 0, 1, 1, NULL, 5, FALSE, 'Mushrooms optional'),

-- =============================================================================
-- KETO BOXES (Low carb focus)
-- =============================================================================
('keto', 'vegetable', 'leafy', NULL, 3, 5, 4, NULL, 1, TRUE, 'Leafy greens are keto staple'),
('keto', NULL, NULL, 'fruit_avocado', 1, 2, 2, NULL, 1, TRUE, 'Avocado essential for keto'),
('keto', NULL, NULL, 'cucurbit_zucchini', 1, 2, 2, NULL, 2, TRUE, 'Zucchini for pasta substitute'),
('keto', NULL, NULL, 'cucurbit_cucumber', 1, 2, 1, NULL, 2, FALSE, 'Cucumber for crunch'),
('keto', NULL, NULL, 'nightshade_capsicum', 1, 2, 1, NULL, 3, FALSE, 'Capsicum adds variety'),
('keto', NULL, NULL, 'brassica_heads', 1, 2, 1, NULL, 2, TRUE, 'Cauliflower for rice'),
('keto', NULL, NULL, 'mushroom_common', 1, 2, 1, NULL, 3, FALSE, 'Mushrooms low carb'),
('keto', NULL, NULL, 'berry_common', 0, 1, 1, NULL, 4, FALSE, 'Berries in small amounts'),
('keto', NULL, NULL, 'nightshade_eggplant', 0, 1, 1, NULL, 5, FALSE, 'Eggplant optional'),
('keto', 'herbs', NULL, NULL, 1, 2, 1, NULL, 5, FALSE, 'Fresh herbs'),

-- =============================================================================
-- FODMAP BOXES (Low FODMAP diet)
-- =============================================================================
('fodmap', 'vegetable', 'leafy', 'leafy_lettuce', 1, 2, 1, NULL, 2, TRUE, 'Safe leafy greens'),
('fodmap', NULL, NULL, 'leafy_cooking', 1, 2, 1, NULL, 2, TRUE, 'Spinach/kale OK'),
('fodmap', NULL, NULL, 'root_carrot', 1, 2, 1, NULL, 1, TRUE, 'Carrots safe'),
('fodmap', NULL, NULL, 'nightshade_capsicum', 1, 2, 1, NULL, 2, TRUE, 'Capsicum safe'),
('fodmap', NULL, NULL, 'cucurbit_zucchini', 1, 2, 1, NULL, 2, FALSE, 'Zucchini in moderation'),
('fodmap', NULL, NULL, 'cucurbit_cucumber', 1, 2, 1, NULL, 2, FALSE, 'Cucumber safe'),
('fodmap', NULL, NULL, 'nightshade_tomato', 1, 1, 1, NULL, 3, FALSE, 'Tomato - 1 small'),
('fodmap', NULL, NULL, 'berry_common', 0, 1, 1, NULL, 3, FALSE, 'Berries - limited'),
('fodmap', NULL, NULL, 'citrus_cooking', 1, 2, 1, NULL, 3, FALSE, 'Lemon/lime safe'),
('fodmap', NULL, NULL, 'tropical_banana', 0, 1, 1, NULL, 4, FALSE, 'Lady Finger banana only'),
('fodmap', NULL, NULL, 'fruit_kiwi', 0, 2, 1, NULL, 4, FALSE, 'Kiwi OK'),
('fodmap', NULL, NULL, 'grape_all', 0, 1, 1, NULL, 5, FALSE, 'Grapes limited'),

-- =============================================================================
-- SALAD BOXES
-- =============================================================================
('salad', 'vegetable', 'leafy', NULL, 3, 5, 4, NULL, 1, TRUE, 'Leafy base essential'),
('salad', NULL, NULL, 'leafy_lettuce', 1, 2, 2, NULL, 1, TRUE, 'Lettuce base'),
('salad', NULL, NULL, 'leafy_salad', 1, 2, 1, NULL, 2, TRUE, 'Rocket/watercress'),
('salad', NULL, NULL, 'nightshade_tomato', 1, 2, 1, NULL, 1, TRUE, 'Tomatoes essential'),
('salad', NULL, NULL, 'cucurbit_cucumber', 1, 2, 1, NULL, 1, TRUE, 'Cucumber essential'),
('salad', NULL, NULL, 'nightshade_capsicum', 0, 2, 1, NULL, 3, FALSE, 'Capsicum adds colour'),
('salad', NULL, NULL, 'fruit_avocado', 0, 1, 1, NULL, 2, FALSE, 'Avocado for richness'),
('salad', NULL, NULL, 'root_radish', 0, 1, 1, NULL, 4, FALSE, 'Radish for crunch'),
('salad', NULL, NULL, 'herb_leafy', 1, 2, 1, NULL, 3, FALSE, 'Fresh herbs'),
('salad', NULL, NULL, 'berry_common', 0, 1, 1, NULL, 5, FALSE, 'Strawberries for salad')

ON CONFLICT (box_type, category, subcategory, substitute_group) DO UPDATE SET
  min_items = EXCLUDED.min_items,
  max_items = EXCLUDED.max_items,
  target_items = EXCLUDED.target_items,
  fill_priority = EXCLUDED.fill_priority,
  is_required = EXCLUDED.is_required,
  notes = EXCLUDED.notes;

-- =============================================================================
-- UPDATE PRODUCT QUANTITIES
-- =============================================================================
UPDATE rhf_product_box_suitability SET
  unit_type = 'bunch',
  typical_unit_weight_g = 250,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE subcategory = 'leafy';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 300,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE product_name IN ('Broccoli', 'Cauliflower', 'Cabbage Green', 'Cabbage Red');

UPDATE rhf_product_box_suitability SET
  unit_type = 'kg',
  typical_unit_weight_g = 1000,
  min_qty_per_box = 0.5,
  max_qty_per_box = 1.5,
  typical_qty_per_box = 1
WHERE product_name IN ('Carrot', 'Potato', 'Onion Brown', 'Onion Red');

UPDATE rhf_product_box_suitability SET
  unit_type = 'punnet',
  typical_unit_weight_g = 250,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE subcategory = 'berries';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 180,
  min_qty_per_box = 1,
  max_qty_per_box = 4,
  typical_qty_per_box = 2
WHERE product_name LIKE 'Apple%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 200,
  min_qty_per_box = 2,
  max_qty_per_box = 6,
  typical_qty_per_box = 4
WHERE product_name = 'Bananas';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 250,
  min_qty_per_box = 1,
  max_qty_per_box = 3,
  typical_qty_per_box = 2
WHERE product_name IN ('Avocado', 'Avocado Shepard');

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 200,
  min_qty_per_box = 1,
  max_qty_per_box = 3,
  typical_qty_per_box = 2
WHERE product_name LIKE 'Capsicum%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 100,
  min_qty_per_box = 3,
  max_qty_per_box = 6,
  typical_qty_per_box = 4
WHERE product_name LIKE 'Tomato%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 200,
  min_qty_per_box = 1,
  max_qty_per_box = 3,
  typical_qty_per_box = 2
WHERE product_name LIKE 'Zucchini%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 200,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE product_name LIKE 'Cucumber%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'each',
  typical_unit_weight_g = 150,
  min_qty_per_box = 4,
  max_qty_per_box = 8,
  typical_qty_per_box = 6
WHERE product_name LIKE 'Orange%' OR product_name LIKE 'Mandarin%';

UPDATE rhf_product_box_suitability SET
  unit_type = 'pack',
  typical_unit_weight_g = 200,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE subcategory = 'mushroom';

UPDATE rhf_product_box_suitability SET
  unit_type = 'bunch',
  typical_unit_weight_g = 30,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE category = 'herbs';

UPDATE rhf_product_box_suitability SET
  unit_type = 'dozen',
  typical_unit_weight_g = 720,
  min_qty_per_box = 1,
  max_qty_per_box = 2,
  typical_qty_per_box = 1
WHERE category = 'eggs';

-- =============================================================================
-- SET PRIORITY SCORES
-- =============================================================================
-- Premium/preferred items (priority 1-2)
UPDATE rhf_product_box_suitability SET priority_score = 1, cost_tier = 'premium'
WHERE product_name IN (
  'Avocado', 'Berries', 'Strawberries', 'Raspberries', 'Blueberries',
  'Asparagus', 'Broccolini', 'Baby Spinach', 'Cherry Tomatoes',
  'Heirloom Tomatoes', 'Eggs Pasture Raised'
);

UPDATE rhf_product_box_suitability SET priority_score = 2, cost_tier = 'medium'
WHERE product_name IN (
  'Spinach Baby', 'Rocket', 'Lettuce Cos', 'Broccoli', 'Capsicum Red',
  'Zucchini', 'Cucumber Lebanese', 'Mushroom Swiss Brown', 'Apples Pink Lady',
  'Bananas', 'Oranges', 'Lemons', 'Eggs Free Range'
);

-- Standard items (priority 3-4)
UPDATE rhf_product_box_suitability SET priority_score = 3
WHERE priority_score IS NULL OR priority_score = 5;

-- Budget/filler items (priority 5-6)
UPDATE rhf_product_box_suitability SET priority_score = 5, cost_tier = 'budget'
WHERE product_name IN (
  'Cabbage Green', 'Potato', 'Onion Brown', 'Carrot', 'Pumpkin Jap',
  'Pumpkin Queensland Blue', 'Celery'
);

-- =============================================================================
-- VIEWS FOR BOX BUILDING
-- =============================================================================

-- View: Available products for box type with quantities
CREATE OR REPLACE VIEW v_rhf_box_product_options AS
SELECT
  pbs.product_name,
  pbs.category,
  pbs.subcategory,
  pbs.is_keto,
  pbs.is_fodmap_safe,
  pbs.is_salad_suitable,
  pbs.suitable_box_types,
  pbs.priority_score,
  pbs.cost_tier,
  pbs.unit_type,
  pbs.typical_unit_weight_g,
  pbs.min_qty_per_box,
  pbs.max_qty_per_box,
  pbs.typical_qty_per_box,
  pbs.is_year_round,
  pbs.peak_months,
  CASE
    WHEN pbs.is_year_round THEN TRUE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER = ANY(pbs.peak_months) THEN TRUE
    ELSE FALSE
  END as is_in_season,
  sg.group_name as substitute_group,
  ps.priority as substitute_priority
FROM rhf_product_box_suitability pbs
LEFT JOIN rhf_product_substitutes ps ON pbs.product_name = ps.product_name
LEFT JOIN rhf_substitute_groups sg ON ps.substitute_group_id = sg.id
ORDER BY pbs.priority_score, pbs.category, pbs.subcategory;

-- View: Box composition summary
CREATE OR REPLACE VIEW v_rhf_box_composition AS
SELECT
  bcr.box_type,
  bcr.category,
  bcr.subcategory,
  bcr.substitute_group,
  bcr.min_items,
  bcr.max_items,
  bcr.target_items,
  bcr.fill_priority,
  bcr.is_required,
  COUNT(DISTINCT pbs.product_name) as available_products
FROM rhf_box_composition_rules bcr
LEFT JOIN rhf_product_box_suitability pbs ON (
  (bcr.category IS NULL OR pbs.category = bcr.category)
  AND (bcr.subcategory IS NULL OR pbs.subcategory = bcr.subcategory)
  AND bcr.box_type = ANY(pbs.suitable_box_types)
)
GROUP BY bcr.id, bcr.box_type, bcr.category, bcr.subcategory, bcr.substitute_group,
         bcr.min_items, bcr.max_items, bcr.target_items, bcr.fill_priority, bcr.is_required
ORDER BY bcr.box_type, bcr.fill_priority;

-- =============================================================================
-- FUNCTION: Get substitutes for a product
-- =============================================================================
CREATE OR REPLACE FUNCTION rhf_get_substitutes(p_product_name TEXT)
RETURNS TABLE (
  substitute_name TEXT,
  substitute_priority INTEGER,
  is_in_season BOOLEAN,
  cost_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pbs2.product_name,
    ps2.priority,
    CASE
      WHEN pbs2.is_year_round THEN TRUE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER = ANY(pbs2.peak_months) THEN TRUE
      ELSE FALSE
    END,
    pbs2.cost_tier
  FROM rhf_product_substitutes ps1
  JOIN rhf_product_substitutes ps2 ON ps1.substitute_group_id = ps2.substitute_group_id
  JOIN rhf_product_box_suitability pbs2 ON ps2.product_name = pbs2.product_name
  WHERE ps1.product_name = p_product_name
    AND ps2.product_name != p_product_name
  ORDER BY ps2.priority, pbs2.product_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE rhf_substitute_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_product_substitutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_box_composition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON rhf_substitute_groups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON rhf_substitute_groups FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access" ON rhf_product_substitutes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON rhf_product_substitutes FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access" ON rhf_box_composition_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON rhf_box_composition_rules FOR SELECT TO anon USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE rhf_substitute_groups IS 'Groups of interchangeable products (e.g., all lettuces can substitute for each other)';
COMMENT ON TABLE rhf_product_substitutes IS 'Links products to their substitute groups with priority';
COMMENT ON TABLE rhf_box_composition_rules IS 'Rules for what categories/groups go in each box type';
COMMENT ON COLUMN rhf_product_box_suitability.priority_score IS '1=premium/preferred, 5=standard, 10=filler';
COMMENT ON COLUMN rhf_box_composition_rules.fill_priority IS '1=fill first, 10=fill last';
