-- ============================================================================
-- Export ALL Beauty Leads from businesses table
-- INCLUDING Previously Contacted Leads
-- For Maximum 27K Email Blast - Ambassador Program Focus
-- ============================================================================
--
-- TARGET: Use full inventory to maximize 27K quota
-- SOURCE: businesses table
-- FILTER: lead_id LIKE 'beauty%' AND has valid email
-- INCLUDES: Previously contacted leads (going again with new offer)
--
-- ============================================================================

-- ============================================================================
-- CAMPAIGN 1: MASSAGE & SPA (Target: 2,000)
-- All massage/spa/wellness regardless of contact history
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
  COALESCE(total_emails_sent, 0) as previous_emails_sent,
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
    OR primary_category ILIKE '%day spa%'
  )

  -- Has valid email (regardless of contact history)
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND (business_name IS NOT NULL AND business_name != '')

ORDER BY
  -- Prioritize never-contacted first
  COALESCE(total_emails_sent, 0) ASC,
  -- Then by data quality
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 2000
) TO '/tmp/massage_spa_leads_all.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 2: HAIR & BEAUTY (Target: 1,500)
-- All hair/beauty salons regardless of contact history
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
  COALESCE(total_emails_sent, 0) as previous_emails_sent,
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
    OR primary_category ILIKE '%beauty salon%'
  )

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND (business_name IS NOT NULL AND business_name != '')

ORDER BY
  COALESCE(total_emails_sent, 0) ASC,
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 1500
) TO '/tmp/hair_beauty_leads_all.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 3: COSMETIC & AESTHETIC (Target: 450)
-- All cosmetic/aesthetic/skin regardless of contact history
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
  COALESCE(total_emails_sent, 0) as previous_emails_sent,
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
    OR primary_category ILIKE '%derma%'
  )

  -- Has valid email
  AND email IS NOT NULL
  AND email != ''
  AND email LIKE '%@%'

  -- Has business name
  AND (business_name IS NOT NULL AND business_name != '')

ORDER BY
  COALESCE(total_emails_sent, 0) ASC,
  CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN phone IS NOT NULL THEN 1 ELSE 2 END,
  created_at DESC

LIMIT 450
) TO '/tmp/cosmetic_aesthetic_leads_all.csv' WITH CSV HEADER;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to check counts
-- ============================================================================

-- Count massage & spa (all)
SELECT
  COUNT(*) as total_massage_spa,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%massage%' OR primary_category ILIKE '%spa%' OR primary_category ILIKE '%wellness%')
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count hair & beauty (all)
SELECT
  COUNT(*) as total_hair_beauty,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%hair%' OR primary_category ILIKE '%salon%' OR primary_category ILIKE '%barber%')
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count cosmetic (all)
SELECT
  COUNT(*) as total_cosmetic,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (primary_category ILIKE '%cosmetic%' OR primary_category ILIKE '%laser%' OR primary_category ILIKE '%aesthetic%')
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Total beauty leads available
SELECT
  COUNT(*) as total_beauty_with_email,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted,
  ROUND(COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as pct_previously_contacted
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- ============================================================================
-- EXPORT COMMAND (Run from terminal)
-- ============================================================================
--
-- psql "postgresql://postgres:[password]@qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" -f export-beauty-leads-ALL.sql
--
-- Or with environment variables:
-- psql $SUPABASE_URL -f scripts/export-beauty-leads-ALL.sql
--
-- Expected output files:
-- - /tmp/massage_spa_leads_all.csv (2,000 rows)
-- - /tmp/hair_beauty_leads_all.csv (1,500 rows)
-- - /tmp/cosmetic_aesthetic_leads_all.csv (450 rows)
--
-- Total: 3,950 leads × 6.84 emails avg = 27,018 emails (perfect for 27K quota)
--
-- ============================================================================

-- ============================================================================
-- WHY INCLUDING PREVIOUSLY CONTACTED LEADS WORKS
-- ============================================================================
--
-- 1. NEW OFFER: Ambassador program (not wholesale) - different value prop
-- 2. TIME GAP: Previous contacts likely months ago
-- 3. LOWER BARRIER: No inventory vs $200 order - easier yes
-- 4. MAXIMIZE QUOTA: Use full 27K before it expires
-- 5. PRIORITIZED: Never-contacted leads sent first (ORDER BY)
--
-- The sort order ensures fresh leads get Email 1 on Day 1, previously
-- contacted get Email 1 on Days 2-4 (still within blast window)
--
-- ============================================================================

-- ============================================================================
-- CSV FORMAT FOR SMARTLEAD IMPORT
-- ============================================================================
--
-- Columns exported:
-- - email (required)
-- - business_name (maps to {{company_name}} or {{business_name}})
-- - name (alternative company name)
-- - primary_category (maps to {{primary_category}})
-- - city (maps to {{city}})
-- - state (maps to {{state}})
-- - website (optional)
-- - phone_number (optional)
-- - lead_id (for tracking)
-- - previous_emails_sent (for reference, 0 = never contacted)
-- - segment (campaign identifier)
-- - priority (for ordering)
--
-- All data will sync to HubSpot via n8n workflow when emails are sent!
--
-- ============================================================================
