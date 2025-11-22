-- ============================================================================
-- Export Fresh Beauty Leads from businesses table
-- For 27K Email Blast - Ambassador Program Focus
-- ============================================================================
--
-- TARGET: 4,293 fresh beauty leads
-- SOURCE: businesses table (not smartlead_leads)
-- FILTER: lead_id LIKE 'beauty%' AND total_emails_sent = 0
--
-- ============================================================================

-- ============================================================================
-- CAMPAIGN 1: MASSAGE & SPA (Target: All 1,821 available)
-- Best performing segment: 5.13% reply rate historically
-- ============================================================================

\copy (
SELECT
  email,
  business_name,
  name as company_name,
  primary_category,
  city,
  state,
  website,
  phone as phone_number,
  lead_id,
  'massage_spa' as segment,
  1 as priority
FROM businesses
WHERE
  -- Beauty leads only
  lead_id LIKE 'beauty%'

  -- Massage, spa & wellness categories
  AND (
    primary_category ILIKE '%massage%'
    OR primary_category ILIKE '%spa%'
    OR primary_category ILIKE '%wellness%'
  )

  -- Never sent emails
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND business_name IS NOT NULL
  AND business_name != ''

ORDER BY
  -- Prioritize businesses with more data
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 1821
) TO '/tmp/massage_spa_leads.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 2: HAIR & BEAUTY (Target: 1,200)
-- Reply rate: 3.13% historically
-- ============================================================================

\copy (
SELECT
  email,
  business_name,
  name as company_name,
  primary_category,
  city,
  state,
  website,
  phone as phone_number,
  lead_id,
  'hair_beauty' as segment,
  2 as priority
FROM businesses
WHERE
  lead_id LIKE 'beauty%'

  -- Hair & beauty categories
  AND (
    primary_category ILIKE '%hair%'
    OR primary_category ILIKE '%salon%'
    OR primary_category ILIKE '%barber%'
    OR primary_category ILIKE '%hairdresser%'
  )

  -- Never sent emails
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND business_name IS NOT NULL
  AND business_name != ''

ORDER BY
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 1200
) TO '/tmp/hair_beauty_leads.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 3: COSMETIC & AESTHETIC (Target: All 272 available)
-- Reply rate: 2.88% historically
-- ============================================================================

\copy (
SELECT
  email,
  business_name,
  name as company_name,
  primary_category,
  city,
  state,
  website,
  phone as phone_number,
  lead_id,
  'cosmetic_aesthetic' as segment,
  3 as priority
FROM businesses
WHERE
  lead_id LIKE 'beauty%'

  -- Cosmetic & aesthetic categories
  AND (
    primary_category ILIKE '%cosmetic%'
    OR primary_category ILIKE '%laser%'
    OR primary_category ILIKE '%aesthetic%'
    OR primary_category ILIKE '%skin%'
    OR primary_category ILIKE '%injectable%'
  )

  -- Never sent emails
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND business_name IS NOT NULL
  AND business_name != ''

ORDER BY
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 272
) TO '/tmp/cosmetic_aesthetic_leads.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 4: MIXED BEAUTY (Target: 1,000)
-- Everything else not in campaigns 1-3
-- ============================================================================

\copy (
SELECT
  email,
  business_name,
  name as company_name,
  primary_category,
  city,
  state,
  website,
  phone as phone_number,
  lead_id,
  'mixed_beauty' as segment,
  4 as priority
FROM businesses
WHERE
  lead_id LIKE 'beauty%'

  -- Exclude categories already in campaigns 1-3
  AND NOT (
    primary_category ILIKE '%massage%'
    OR primary_category ILIKE '%spa%'
    OR primary_category ILIKE '%wellness%'
    OR primary_category ILIKE '%hair%'
    OR primary_category ILIKE '%salon%'
    OR primary_category ILIKE '%barber%'
    OR primary_category ILIKE '%hairdresser%'
    OR primary_category ILIKE '%cosmetic%'
    OR primary_category ILIKE '%laser%'
    OR primary_category ILIKE '%aesthetic%'
    OR primary_category ILIKE '%skin%'
    OR primary_category ILIKE '%injectable%'
  )

  -- Never sent emails
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND business_name IS NOT NULL
  AND business_name != ''

ORDER BY
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 1000
) TO '/tmp/mixed_beauty_leads.csv' WITH CSV HEADER;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to check export counts before importing to Smartlead
-- ============================================================================

-- Count massage & spa leads
SELECT COUNT(*) as massage_spa_count
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%massage%' OR primary_category ILIKE '%spa%' OR primary_category ILIKE '%wellness%')
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count hair & beauty leads
SELECT COUNT(*) as hair_beauty_count
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%hair%' OR primary_category ILIKE '%salon%' OR primary_category ILIKE '%barber%')
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count cosmetic leads
SELECT COUNT(*) as cosmetic_count
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%cosmetic%' OR primary_category ILIKE '%laser%' OR primary_category ILIKE '%aesthetic%')
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count mixed beauty leads
SELECT COUNT(*) as mixed_beauty_count
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND NOT (
    primary_category ILIKE '%massage%' OR primary_category ILIKE '%spa%' OR primary_category ILIKE '%wellness%'
    OR primary_category ILIKE '%hair%' OR primary_category ILIKE '%salon%' OR primary_category ILIKE '%barber%'
    OR primary_category ILIKE '%cosmetic%' OR primary_category ILIKE '%laser%' OR primary_category ILIKE '%aesthetic%'
  )
  AND (total_emails_sent IS NULL OR total_emails_sent = 0)
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- ============================================================================
-- EXPORT COMMAND (Run from terminal)
-- ============================================================================
--
-- psql "postgresql://postgres:[password]@qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" -f export-beauty-leads-FINAL.sql
--
-- Or with environment variables:
-- psql $SUPABASE_URL -f scripts/export-beauty-leads-FINAL.sql
--
-- Expected output files:
-- - /tmp/massage_spa_leads.csv (1,821 rows)
-- - /tmp/hair_beauty_leads.csv (1,200 rows)
-- - /tmp/cosmetic_aesthetic_leads.csv (272 rows)
-- - /tmp/mixed_beauty_leads.csv (1,000 rows)
--
-- Total: 4,293 leads
--
-- ============================================================================

-- ============================================================================
-- CSV FORMAT FOR SMARTLEAD IMPORT
-- ============================================================================
--
-- Required columns (from businesses table):
-- - email (required)
-- - business_name (maps to {{company_name}} or {{business_name}})
-- - name (alternative company name)
-- - primary_category (maps to {{primary_category}})
-- - city (maps to {{city}})
-- - state (maps to {{state}})
-- - website (optional)
-- - phone_number (optional)
-- - lead_id (for tracking)
-- - segment (campaign identifier)
-- - priority (for ordering)
--
-- ============================================================================
