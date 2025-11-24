-- ============================================================================
-- Export ALL Beauty Leads - NO LIMITS
-- Maximum coverage of entire beauty database
-- ============================================================================
--
-- PURPOSE: Export EVERY available beauty lead with valid email
-- SOURCE: businesses table
-- FILTER: lead_id LIKE 'beauty%' AND has valid email
-- LIMITS: NONE - Get everything available
--
-- Based on documentation:
-- - Total beauty leads: 10,250
-- - With valid emails: 6,826
-- - Fresh (never contacted): ~6,824
--
-- ============================================================================

-- ============================================================================
-- CAMPAIGN 1: MASSAGE & SPA (ALL AVAILABLE)
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
    OR primary_category ILIKE '%retreat%'
  )

  -- Has valid email
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

-- NO LIMIT - GET EVERYTHING!
) TO '/tmp/massage_spa_leads_unlimited.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 2: HAIR & BEAUTY (ALL AVAILABLE)
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
    OR primary_category ILIKE '%beauty therapist%'
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

-- NO LIMIT - GET EVERYTHING!
) TO '/tmp/hair_beauty_leads_unlimited.csv' WITH CSV HEADER;

-- ============================================================================
-- CAMPAIGN 3: COSMETIC & AESTHETIC (ALL AVAILABLE)
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
    OR primary_category ILIKE '%botox%'
    OR primary_category ILIKE '%filler%'
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

-- NO LIMIT - GET EVERYTHING!
) TO '/tmp/cosmetic_aesthetic_leads_unlimited.csv' WITH CSV HEADER;

-- ============================================================================
-- VERIFICATION QUERIES - Run BEFORE export to see what you'll get
-- ============================================================================

-- Count massage & spa (all available)
SELECT
  COUNT(*) as total_massage_spa,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted,
  ROUND(100.0 * COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) / COUNT(*), 1) as pct_fresh
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (
    primary_category ILIKE '%massage%'
    OR primary_category ILIKE '%spa%'
    OR primary_category ILIKE '%wellness%'
    OR primary_category ILIKE '%day spa%'
    OR primary_category ILIKE '%retreat%'
  )
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count hair & beauty (all available)
SELECT
  COUNT(*) as total_hair_beauty,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted,
  ROUND(100.0 * COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) / COUNT(*), 1) as pct_fresh
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (
    primary_category ILIKE '%hair%'
    OR primary_category ILIKE '%salon%'
    OR primary_category ILIKE '%barber%'
    OR primary_category ILIKE '%hairdresser%'
    OR primary_category ILIKE '%beauty salon%'
  )
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- Count cosmetic (all available)
SELECT
  COUNT(*) as total_cosmetic,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted,
  ROUND(100.0 * COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) / COUNT(*), 1) as pct_fresh
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND (
    primary_category ILIKE '%cosmetic%'
    OR primary_category ILIKE '%laser%'
    OR primary_category ILIKE '%aesthetic%'
    OR primary_category ILIKE '%skin%'
    OR primary_category ILIKE '%injectable%'
    OR primary_category ILIKE '%derma%'
  )
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- TOTAL BEAUTY LEADS AVAILABLE
SELECT
  COUNT(*) as total_beauty_with_email,
  COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) as never_contacted,
  COUNT(CASE WHEN total_emails_sent > 0 THEN 1 END) as previously_contacted,
  ROUND(100.0 * COUNT(CASE WHEN total_emails_sent = 0 OR total_emails_sent IS NULL THEN 1 END) / COUNT(*), 1) as pct_fresh,
  COUNT(*) * 4 as estimated_total_emails
FROM businesses
WHERE lead_id LIKE 'beauty%'
  AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  AND business_name IS NOT NULL AND business_name != '';

-- ============================================================================
-- EXPORT COMMAND
-- ============================================================================
--
-- STEP 1: First run verification queries above to see counts
--
-- STEP 2: Run export (choose one method):
--
-- Method A: Using connection string
-- psql "postgresql://postgres:YOUR_PASSWORD@db.qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" -f scripts/export-beauty-leads-UNLIMITED.sql
--
-- Method B: Using .env credentials
-- Get Supabase password from .env then run:
-- psql "postgresql://postgres:$(grep SUPABASE_PASSWORD .env | cut -d '=' -f2)@db.qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" -f scripts/export-beauty-leads-UNLIMITED.sql
--
-- Expected output files in /tmp/:
-- - massage_spa_leads_unlimited.csv (estimated: 2,000-2,500 rows)
-- - hair_beauty_leads_unlimited.csv (estimated: 2,000-2,500 rows)
-- - cosmetic_aesthetic_leads_unlimited.csv (estimated: 500-800 rows)
--
-- Total estimated: 4,500-5,800 leads
-- Total emails (4 per lead): 18,000-23,200 emails
--
-- This will use 67-86% of your 27,000 monthly quota
--
-- ============================================================================

-- ============================================================================
-- WHY NO LIMITS?
-- ============================================================================
--
-- 1. MAXIMIZE REACH: Use all available beauty leads in database
-- 2. FRESH FIRST: ORDER BY prioritizes never-contacted leads
-- 3. NEW OFFER: Ambassador program (no inventory) - different value prop
-- 4. USE QUOTA: Better to use 27K quota than let it expire
-- 5. SCALE: This is your comprehensive beauty market campaign
--
-- The sort order (COALESCE(total_emails_sent, 0) ASC) ensures:
-- - Fresh leads (0 emails) get contacted first (Days 1-3)
-- - Previously contacted get contacted later (Days 4-7) if any exist
--
-- ============================================================================

-- ============================================================================
-- CSV FORMAT FOR SMARTLEAD IMPORT
-- ============================================================================
--
-- Columns exported:
-- - email (required)
-- - business_name (maps to {{company_name}} or {{business_name}})
-- - company_name (alternative name)
-- - primary_category (maps to {{primary_category}})
-- - city (maps to {{city}})
-- - state (maps to {{state}})
-- - website (optional)
-- - phone_number (optional)
-- - lead_id (for tracking)
-- - previous_emails_sent (0 = fresh, >0 = previously contacted)
-- - segment (campaign identifier)
-- - priority (for ordering)
--
-- All data will sync to HubSpot via n8n workflow when emails are sent!
--
-- ============================================================================
