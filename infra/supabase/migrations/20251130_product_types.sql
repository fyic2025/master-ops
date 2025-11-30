-- Add product_type to tlx_products for categorization
-- Run in Supabase SQL Editor

-- 1. Add product_type column
ALTER TABLE tlx_products ADD COLUMN IF NOT EXISTS product_type TEXT;

-- 2. Add cost_price column if missing (for margin calculation)
ALTER TABLE tlx_products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_tlx_products_type ON tlx_products(product_type) WHERE is_sellable = TRUE;

-- 4. Classify products based on name patterns (46 product types)
UPDATE tlx_products SET product_type =
  CASE
    -- Lions Mane (fuzzy: lion's, lions, lion)
    WHEN (product_name ILIKE '%lions mane%' OR product_name ILIKE '%lion''s mane%' OR product_name ILIKE '%lion mane%') AND product_name ILIKE '%pure%' THEN 'Lions Mane Pure'
    WHEN product_name ILIKE '%lions mane%' OR product_name ILIKE '%lion''s mane%' OR product_name ILIKE '%lion mane%' THEN 'Lions Mane'

    -- Ashwagandha (fuzzy: ashwa, ashwaganda)
    WHEN (product_name ILIKE '%ashwa%' OR product_name ILIKE '%ashwagan%') AND product_name ILIKE '%pure%' THEN 'Ashwagandha Pure'
    WHEN product_name ILIKE '%ashwa%' OR product_name ILIKE '%ashwagan%' THEN 'Ashwagandha'

    -- Reishi
    WHEN product_name ILIKE '%reishi%' AND product_name ILIKE '%pure%' THEN 'Reishi Pure'
    WHEN product_name ILIKE '%reishi%' THEN 'Reishi'

    -- Chaga
    WHEN product_name ILIKE '%chaga%' AND product_name ILIKE '%pure%' THEN 'Chaga Pure'
    WHEN product_name ILIKE '%chaga%' THEN 'Chaga'

    -- Cordyceps
    WHEN product_name ILIKE '%cordyceps%' AND product_name ILIKE '%pure%' THEN 'Cordyceps Pure'
    WHEN product_name ILIKE '%cordyceps%' THEN 'Cordyceps'

    -- Tremella
    WHEN product_name ILIKE '%tremella%' THEN 'Tremella'

    -- Maitake
    WHEN product_name ILIKE '%maitake%' THEN 'Maitake'

    -- Shiitake
    WHEN product_name ILIKE '%shiitake%' THEN 'Shiitake'

    -- Turkey Tail
    WHEN product_name ILIKE '%turkey tail%' THEN 'Turkey Tail'

    -- Pearl (oyster mushroom/pearl)
    WHEN product_name ILIKE '%pearl%' THEN 'Pearl'

    -- Immunity products
    WHEN product_name ILIKE '%immun%' THEN 'Immunity'

    -- Cans (Sparkling Elixir drinks)
    WHEN product_name ILIKE '%sparkling%' AND product_name ILIKE '%elixir%' THEN 'Cans'

    -- Latte flavours (4 variants - must come before generic patterns)
    WHEN product_name ILIKE '%cacao%' AND product_name ILIKE '%latte%' THEN 'Latte - Cacao Rose'
    WHEN product_name ILIKE '%turmeric%' AND product_name ILIKE '%latte%' THEN 'Latte - Turmeric'
    WHEN product_name ILIKE '%beet%' AND product_name ILIKE '%latte%' THEN 'Latte - Beet'
    WHEN product_name ILIKE '%matcha%' AND product_name ILIKE '%latte%' THEN 'Latte - Matcha'

    -- Japanese Matcha (standalone, not latte)
    WHEN product_name ILIKE '%japanese matcha%' THEN 'Japanese Matcha'

    -- Body Build / Body Repair blends
    WHEN product_name ILIKE '%body build%' THEN 'Body Build'
    WHEN product_name ILIKE '%body repair%' THEN 'Body Repair'

    -- Siberian Ginseng
    WHEN product_name ILIKE '%siberian ginseng%' THEN 'Siberian Ginseng'

    -- Bee Pollen
    WHEN product_name ILIKE '%bee pollen%' THEN 'Bee Pollen'

    -- Fulvic Acid
    WHEN product_name ILIKE '%fulvic%' THEN 'Fulvic Acid'

    -- Resveratrol
    WHEN product_name ILIKE '%resveratrol%' THEN 'Resveratrol'

    -- Schizandra/Schisandra (both spellings)
    WHEN product_name ILIKE '%schizandra%' OR product_name ILIKE '%schisandra%' THEN 'Schizandra'

    -- Red Pine Needle Oil
    WHEN product_name ILIKE '%red pine%' OR product_name ILIKE '%pine needle%' THEN 'Red Pine Needle'

    -- Camu Camu
    WHEN product_name ILIKE '%camu camu%' THEN 'Camu Camu'

    -- Spirulina
    WHEN product_name ILIKE '%spirulina%' THEN 'Spirulina'

    -- Stress Less (but not bundle)
    WHEN product_name ILIKE '%stress less%' AND product_name NOT ILIKE '%bundle%' THEN 'Stress Less'

    -- Maca
    WHEN product_name ILIKE '%maca%' THEN 'Maca'

    -- Shilajit
    WHEN product_name ILIKE '%shilajit%' THEN 'Shilajit'

    -- He Shou Wu
    WHEN product_name ILIKE '%he shou wu%' OR product_name ILIKE '%fo-ti%' THEN 'He Shou Wu'

    -- Astragalus
    WHEN product_name ILIKE '%astragalus%' THEN 'Astragalus'

    -- Goji
    WHEN product_name ILIKE '%goji%' THEN 'Goji'

    -- Eucommia
    WHEN product_name ILIKE '%eucommia%' THEN 'Eucommia'

    -- Gynostemma
    WHEN product_name ILIKE '%gynostemma%' THEN 'Gynostemma'

    -- Mucuna
    WHEN product_name ILIKE '%mucuna%' THEN 'Mucuna'

    -- Rhodiola
    WHEN product_name ILIKE '%rhodiola%' THEN 'Rhodiola'

    -- Tocos (rice bran)
    WHEN product_name ILIKE '%tocos%' THEN 'Tocos'

    -- Deer Antler
    WHEN product_name ILIKE '%deer antler%' OR product_name ILIKE '%velvet antler%' THEN 'Deer Antler'

    -- Pine Pollen
    WHEN product_name ILIKE '%pine pollen%' THEN 'Pine Pollen'

    -- Beauty / Skin products
    WHEN product_name ILIKE '%beauty%' OR product_name ILIKE '%skin%' OR product_name ILIKE '%glow%' THEN 'Beauty'

    ELSE 'Other'
  END
WHERE is_sellable = TRUE
  -- Exclude raw materials, packaging
  AND product_name NOT ILIKE '%raw%'
  AND product_name NOT ILIKE '%packaging%'
  AND product_name NOT ILIKE '%material%'
  -- Exclude non-products
  AND product_name NOT ILIKE '%carbon%'
  AND product_name NOT ILIKE '%gift card%'
  AND product_name NOT ILIKE '%ebook%'
  AND product_name NOT ILIKE '%bundle%'
  AND product_name NOT ILIKE '%membership%'
  AND product_name NOT ILIKE '%cap%'
  AND product_name NOT ILIKE '%bottle%'
  AND product_name NOT ILIKE '%frother%'
  AND product_name NOT ILIKE '%mixer%'
  AND product_name NOT ILIKE '%shipper%'
  AND product_name NOT ILIKE '%box%'
  AND product_name NOT ILIKE '%probiotic%';

-- 5. Show results
SELECT
  product_type,
  COUNT(*) as product_count,
  STRING_AGG(product_name, ', ' ORDER BY product_name) as sample_products
FROM tlx_products
WHERE product_type IS NOT NULL
GROUP BY product_type
ORDER BY product_count DESC;
