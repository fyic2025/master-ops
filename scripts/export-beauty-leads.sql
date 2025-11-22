-- Export Fresh Beauty Leads for 27K Email Blast
-- Targets leads with 'beauty' prefix that haven't been contacted yet
-- Prioritized by top-performing segments

-- ============================================================================
-- PRIORITY 1: MASSAGE & SPA (Target: 1,350 contacts)
-- Highest reply rate: 5.13%
-- ============================================================================

SELECT
  l.id as smartlead_lead_id,
  l.email,
  l.first_name,
  l.last_name,
  l.company_name,
  l.website,
  l.location,
  l.phone_number,
  l.custom_fields->>'lead_id' as custom_field_lead_id,
  l.custom_fields->>'primary_category' as custom_field_primary_category,
  l.custom_fields->>'assigned_category' as custom_field_assigned_category,
  'massage_spa' as export_segment,
  1 as priority
FROM smartlead_leads l
LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as email_count
  FROM smartlead_emails e
  WHERE e.lead_id = l.id
) emails ON true
WHERE
  -- Beauty leads only
  l.custom_fields->>'lead_id' LIKE 'beauty%'

  -- High-performing categories
  AND (
    l.custom_fields->>'primary_category' ILIKE '%massage%'
    OR l.custom_fields->>'primary_category' ILIKE '%spa%'
    OR l.custom_fields->>'primary_category' ILIKE '%wellness%'
  )

  -- Not already contacted or completed
  AND (
    l.status IS NULL
    OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED')
  )

  -- Never been emailed OR in campaigns with low send count
  AND (
    emails.email_count = 0
    OR (emails.email_count < 2 AND c.status != 'COMPLETED')
  )

  -- Has valid email
  AND l.email IS NOT NULL
  AND l.email != ''
  AND l.email LIKE '%@%'

  -- Has company name (better quality leads)
  AND l.company_name IS NOT NULL
  AND l.company_name != ''

ORDER BY
  -- Prioritize never-contacted
  emails.email_count ASC,
  -- Then by creation date (newest first)
  l.created_at DESC

LIMIT 1350;

-- ============================================================================
-- PRIORITY 2: HAIR & BEAUTY SALONS (Target: 900 contacts)
-- Reply rate: 3.13%
-- ============================================================================

SELECT
  l.id as smartlead_lead_id,
  l.email,
  l.first_name,
  l.last_name,
  l.company_name,
  l.website,
  l.location,
  l.phone_number,
  l.custom_fields->>'lead_id' as custom_field_lead_id,
  l.custom_fields->>'primary_category' as custom_field_primary_category,
  l.custom_fields->>'assigned_category' as custom_field_assigned_category,
  'hair_beauty' as export_segment,
  2 as priority
FROM smartlead_leads l
LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as email_count
  FROM smartlead_emails e
  WHERE e.lead_id = l.id
) emails ON true
WHERE
  l.custom_fields->>'lead_id' LIKE 'beauty%'

  AND (
    l.custom_fields->>'primary_category' ILIKE '%hair%'
    OR l.custom_fields->>'primary_category' ILIKE '%beauty salon%'
    OR l.custom_fields->>'primary_category' ILIKE '%hairdresser%'
    OR l.custom_fields->>'primary_category' ILIKE '%barber%'
  )

  AND (
    l.status IS NULL
    OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED')
  )

  AND (
    emails.email_count = 0
    OR (emails.email_count < 2 AND c.status != 'COMPLETED')
  )

  AND l.email IS NOT NULL
  AND l.email != ''
  AND l.email LIKE '%@%'

  AND l.company_name IS NOT NULL
  AND l.company_name != ''

ORDER BY
  emails.email_count ASC,
  l.created_at DESC

LIMIT 900;

-- ============================================================================
-- PRIORITY 3: COSMETIC/AESTHETIC (Target: 700 contacts)
-- Reply rate: 2.88%
-- ============================================================================

SELECT
  l.id as smartlead_lead_id,
  l.email,
  l.first_name,
  l.last_name,
  l.company_name,
  l.website,
  l.location,
  l.phone_number,
  l.custom_fields->>'lead_id' as custom_field_lead_id,
  l.custom_fields->>'primary_category' as custom_field_primary_category,
  l.custom_fields->>'assigned_category' as custom_field_assigned_category,
  'cosmetic_pro' as export_segment,
  3 as priority
FROM smartlead_leads l
LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as email_count
  FROM smartlead_emails e
  WHERE e.lead_id = l.id
) emails ON true
WHERE
  l.custom_fields->>'lead_id' LIKE 'beauty%'

  AND (
    l.custom_fields->>'primary_category' ILIKE '%cosmetic%'
    OR l.custom_fields->>'primary_category' ILIKE '%laser%'
    OR l.custom_fields->>'primary_category' ILIKE '%injectable%'
    OR l.custom_fields->>'primary_category' ILIKE '%aesthetic%'
    OR l.custom_fields->>'primary_category' ILIKE '%skin%'
    OR l.custom_fields->>'primary_category' ILIKE '%derma%'
  )

  AND (
    l.status IS NULL
    OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED')
  )

  AND (
    emails.email_count = 0
    OR (emails.email_count < 2 AND c.status != 'COMPLETED')
  )

  AND l.email IS NOT NULL
  AND l.email != ''
  AND l.email LIKE '%@%'

  AND l.company_name IS NOT NULL
  AND l.company_name != ''

ORDER BY
  emails.email_count ASC,
  l.created_at DESC

LIMIT 700;

-- ============================================================================
-- PRIORITY 4: MIXED BEAUTY (Target: 1,000 contacts)
-- Reply rate: 2.47% (average)
-- ============================================================================

SELECT
  l.id as smartlead_lead_id,
  l.email,
  l.first_name,
  l.last_name,
  l.company_name,
  l.website,
  l.location,
  l.phone_number,
  l.custom_fields->>'lead_id' as custom_field_lead_id,
  l.custom_fields->>'primary_category' as custom_field_primary_category,
  l.custom_fields->>'assigned_category' as custom_field_assigned_category,
  'mixed_beauty' as export_segment,
  4 as priority
FROM smartlead_leads l
LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as email_count
  FROM smartlead_emails e
  WHERE e.lead_id = l.id
) emails ON true
WHERE
  l.custom_fields->>'lead_id' LIKE 'beauty%'

  -- Everything not in Priority 1-3
  AND NOT (
    l.custom_fields->>'primary_category' ILIKE '%massage%'
    OR l.custom_fields->>'primary_category' ILIKE '%spa%'
    OR l.custom_fields->>'primary_category' ILIKE '%wellness%'
    OR l.custom_fields->>'primary_category' ILIKE '%hair%'
    OR l.custom_fields->>'primary_category' ILIKE '%beauty salon%'
    OR l.custom_fields->>'primary_category' ILIKE '%hairdresser%'
    OR l.custom_fields->>'primary_category' ILIKE '%cosmetic%'
    OR l.custom_fields->>'primary_category' ILIKE '%laser%'
    OR l.custom_fields->>'primary_category' ILIKE '%injectable%'
    OR l.custom_fields->>'primary_category' ILIKE '%aesthetic%'
  )

  AND (
    l.status IS NULL
    OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED')
  )

  AND (
    emails.email_count = 0
    OR (emails.email_count < 2 AND c.status != 'COMPLETED')
  )

  AND l.email IS NOT NULL
  AND l.email != ''
  AND l.email LIKE '%@%'

  AND l.company_name IS NOT NULL
  AND l.company_name != ''

ORDER BY
  emails.email_count ASC,
  l.created_at DESC

LIMIT 1000;

-- ============================================================================
-- COMBINED EXPORT (ALL 3,950 LEADS)
-- Use this for single export with priority ranking
-- ============================================================================

WITH prioritized_leads AS (
  -- Priority 1: Massage & Spa
  SELECT
    l.*,
    'massage_spa' as segment,
    1 as priority,
    COUNT(e.id) as emails_sent
  FROM smartlead_leads l
  LEFT JOIN smartlead_emails e ON l.id = e.lead_id
  LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
  WHERE
    l.custom_fields->>'lead_id' LIKE 'beauty%'
    AND (
      l.custom_fields->>'primary_category' ILIKE '%massage%'
      OR l.custom_fields->>'primary_category' ILIKE '%spa%'
      OR l.custom_fields->>'primary_category' ILIKE '%wellness%'
    )
    AND (l.status IS NULL OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED'))
    AND l.email IS NOT NULL AND l.email LIKE '%@%'
    AND l.company_name IS NOT NULL AND l.company_name != ''
  GROUP BY l.id
  HAVING COUNT(e.id) = 0 OR (COUNT(e.id) < 2 AND MAX(c.status) != 'COMPLETED')
  ORDER BY emails_sent ASC, l.created_at DESC
  LIMIT 1350

  UNION ALL

  -- Priority 2: Hair & Beauty
  SELECT
    l.*,
    'hair_beauty' as segment,
    2 as priority,
    COUNT(e.id) as emails_sent
  FROM smartlead_leads l
  LEFT JOIN smartlead_emails e ON l.id = e.lead_id
  LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
  WHERE
    l.custom_fields->>'lead_id' LIKE 'beauty%'
    AND (
      l.custom_fields->>'primary_category' ILIKE '%hair%'
      OR l.custom_fields->>'primary_category' ILIKE '%beauty salon%'
      OR l.custom_fields->>'primary_category' ILIKE '%hairdresser%'
    )
    AND (l.status IS NULL OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED'))
    AND l.email IS NOT NULL AND l.email LIKE '%@%'
    AND l.company_name IS NOT NULL AND l.company_name != ''
  GROUP BY l.id
  HAVING COUNT(e.id) = 0 OR (COUNT(e.id) < 2 AND MAX(c.status) != 'COMPLETED')
  ORDER BY emails_sent ASC, l.created_at DESC
  LIMIT 900

  UNION ALL

  -- Priority 3: Cosmetic/Aesthetic
  SELECT
    l.*,
    'cosmetic_pro' as segment,
    3 as priority,
    COUNT(e.id) as emails_sent
  FROM smartlead_leads l
  LEFT JOIN smartlead_emails e ON l.id = e.lead_id
  LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
  WHERE
    l.custom_fields->>'lead_id' LIKE 'beauty%'
    AND (
      l.custom_fields->>'primary_category' ILIKE '%cosmetic%'
      OR l.custom_fields->>'primary_category' ILIKE '%laser%'
      OR l.custom_fields->>'primary_category' ILIKE '%injectable%'
      OR l.custom_fields->>'primary_category' ILIKE '%aesthetic%'
    )
    AND (l.status IS NULL OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED'))
    AND l.email IS NOT NULL AND l.email LIKE '%@%'
    AND l.company_name IS NOT NULL AND l.company_name != ''
  GROUP BY l.id
  HAVING COUNT(e.id) = 0 OR (COUNT(e.id) < 2 AND MAX(c.status) != 'COMPLETED')
  ORDER BY emails_sent ASC, l.created_at DESC
  LIMIT 700

  UNION ALL

  -- Priority 4: Mixed Beauty
  SELECT
    l.*,
    'mixed_beauty' as segment,
    4 as priority,
    COUNT(e.id) as emails_sent
  FROM smartlead_leads l
  LEFT JOIN smartlead_emails e ON l.id = e.lead_id
  LEFT JOIN smartlead_campaigns c ON l.campaign_id = c.id
  WHERE
    l.custom_fields->>'lead_id' LIKE 'beauty%'
    AND NOT (
      l.custom_fields->>'primary_category' ILIKE '%massage%'
      OR l.custom_fields->>'primary_category' ILIKE '%spa%'
      OR l.custom_fields->>'primary_category' ILIKE '%wellness%'
      OR l.custom_fields->>'primary_category' ILIKE '%hair%'
      OR l.custom_fields->>'primary_category' ILIKE '%beauty salon%'
      OR l.custom_fields->>'primary_category' ILIKE '%cosmetic%'
      OR l.custom_fields->>'primary_category' ILIKE '%laser%'
      OR l.custom_fields->>'primary_category' ILIKE '%injectable%'
    )
    AND (l.status IS NULL OR l.status NOT IN ('COMPLETED', 'UNSUBSCRIBED', 'BLOCKED'))
    AND l.email IS NOT NULL AND l.email LIKE '%@%'
    AND l.company_name IS NOT NULL AND l.company_name != ''
  GROUP BY l.id
  HAVING COUNT(e.id) = 0 OR (COUNT(e.id) < 2 AND MAX(c.status) != 'COMPLETED')
  ORDER BY emails_sent ASC, l.created_at DESC
  LIMIT 1000
)
SELECT
  email,
  first_name,
  last_name,
  company_name,
  website,
  location,
  phone_number,
  custom_fields->>'lead_id' as custom_field_lead_id,
  custom_fields->>'primary_category' as custom_field_primary_category,
  custom_fields->>'assigned_category' as custom_field_assigned_category,
  segment,
  priority
FROM prioritized_leads
ORDER BY priority ASC, created_at DESC;

-- ============================================================================
-- EXPORT COMMAND
-- ============================================================================
--
-- To export to CSV for Smartlead import:
--
-- psql $SUPABASE_URL -c "\copy (SELECT ... FROM ...) TO '/tmp/beauty_blast_leads.csv' WITH CSV HEADER"
--
-- Then split by segment:
-- - massage_spa.csv (1,350 rows) → Campaign 1
-- - hair_beauty.csv (900 rows) → Campaign 2
-- - cosmetic_pro.csv (700 rows) → Campaign 3
-- - mixed_beauty.csv (1,000 rows) → Campaign 4
--
-- ============================================================================
