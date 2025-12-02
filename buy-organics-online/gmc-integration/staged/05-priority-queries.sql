-- ============================================
-- GMC ISSUE PRIORITIZATION QUERIES
-- ============================================
-- Use these queries to systematically work through issues
-- Run in Supabase SQL Editor or via API

-- ============================================
-- 1. EXECUTIVE SUMMARY
-- ============================================
-- Quick overview of current state
SELECT
    'Current Snapshot' as metric,
    snapshot_date::text as value
FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT 'Total Products', total_products::text FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT 'Approval Rate', ROUND(approved_count::numeric / NULLIF(total_products, 0) * 100, 1)::text || '%' FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT 'Disapproved', disapproved_count::text FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT 'Total Issues', total_issues::text FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT 'Missing from GMC', missing_from_gmc::text FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1;


-- ============================================
-- 2. PRIORITY 1: DISAPPROVED PRODUCTS
-- ============================================
-- These are losing sales - fix immediately
SELECT
    p.offer_id as sku,
    p.title,
    p.bc_match_status,
    COUNT(i.id) as issue_count,
    array_agg(DISTINCT i.issue_code) as issues,
    array_agg(DISTINCT i.description) as descriptions
FROM gmc_products p
JOIN gmc_product_issues i ON p.snapshot_id = i.snapshot_id AND p.gmc_product_id = i.gmc_product_id
WHERE p.snapshot_id = (SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
  AND p.status = 'disapproved'
GROUP BY p.offer_id, p.title, p.bc_match_status
ORDER BY issue_count DESC
LIMIT 50;


-- ============================================
-- 3. PRIORITY 2: MOST COMMON ISSUES
-- ============================================
-- Fix these to resolve many products at once
SELECT
    i.issue_code,
    i.description,
    i.issue_type,
    COUNT(DISTINCT i.offer_id) as affected_products,
    i.documentation_url,
    CASE
        WHEN COUNT(DISTINCT i.offer_id) > 100 THEN 'CRITICAL - Affects 100+ products'
        WHEN COUNT(DISTINCT i.offer_id) > 50 THEN 'HIGH - Affects 50+ products'
        WHEN COUNT(DISTINCT i.offer_id) > 20 THEN 'MEDIUM - Affects 20+ products'
        ELSE 'LOW'
    END as priority
FROM gmc_product_issues i
WHERE i.snapshot_id = (SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
GROUP BY i.issue_code, i.description, i.issue_type, i.documentation_url
ORDER BY affected_products DESC
LIMIT 20;


-- ============================================
-- 4. PRIORITY 3: PRODUCTS BY ISSUE TYPE
-- ============================================
-- Get all products with a specific issue (replace ISSUE_CODE)

-- Example: Missing GTIN
SELECT
    p.offer_id as sku,
    p.title,
    p.link,
    i.description,
    i.detail
FROM gmc_products p
JOIN gmc_product_issues i ON p.snapshot_id = i.snapshot_id AND p.gmc_product_id = i.gmc_product_id
WHERE p.snapshot_id = (SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
  AND i.issue_code = 'missing_gtin'  -- Change this to the issue code you want
ORDER BY p.title
LIMIT 100;


-- ============================================
-- 5. PRODUCTS MISSING FROM GMC
-- ============================================
-- In BigCommerce but not in Google Merchant Center
SELECT
    ep.sku,
    ep.name as title,
    ep.calculated_price as price,
    ep.availability
FROM ecommerce_products ep
LEFT JOIN gmc_products gp ON UPPER(gp.offer_id) = UPPER(ep.sku)
    AND gp.snapshot_id = (SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
WHERE gp.id IS NULL
  AND ep.is_visible = true
  AND ep.availability = 'available'
  AND ep.sku IS NOT NULL
ORDER BY ep.calculated_price DESC
LIMIT 50;


-- ============================================
-- 6. UNMATCHED GMC PRODUCTS
-- ============================================
-- In GMC but not matching BigCommerce SKUs
SELECT
    p.offer_id as gmc_sku,
    p.title,
    p.status,
    p.link
FROM gmc_products p
WHERE p.snapshot_id = (SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1)
  AND p.bc_match_status = 'unmatched'
ORDER BY p.title
LIMIT 50;


-- ============================================
-- 7. WEEK-OVER-WEEK PROGRESS
-- ============================================
-- Compare current to previous snapshot
WITH current AS (
    SELECT * FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
),
previous AS (
    SELECT * FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1 OFFSET 1
)
SELECT
    'Snapshot Date' as metric,
    p.snapshot_date::text as previous,
    c.snapshot_date::text as current,
    '' as change
FROM current c, previous p
UNION ALL
SELECT
    'Total Products',
    p.total_products::text,
    c.total_products::text,
    (c.total_products - p.total_products)::text
FROM current c, previous p
UNION ALL
SELECT
    'Approved',
    p.approved_count::text,
    c.approved_count::text,
    CASE
        WHEN c.approved_count > p.approved_count THEN '+' || (c.approved_count - p.approved_count)::text || ' ✓'
        WHEN c.approved_count < p.approved_count THEN (c.approved_count - p.approved_count)::text || ' ✗'
        ELSE '0'
    END
FROM current c, previous p
UNION ALL
SELECT
    'Disapproved',
    p.disapproved_count::text,
    c.disapproved_count::text,
    CASE
        WHEN c.disapproved_count < p.disapproved_count THEN (c.disapproved_count - p.disapproved_count)::text || ' ✓'
        WHEN c.disapproved_count > p.disapproved_count THEN '+' || (c.disapproved_count - p.disapproved_count)::text || ' ✗'
        ELSE '0'
    END
FROM current c, previous p
UNION ALL
SELECT
    'Total Issues',
    p.total_issues::text,
    c.total_issues::text,
    CASE
        WHEN c.total_issues < p.total_issues THEN (c.total_issues - p.total_issues)::text || ' ✓'
        WHEN c.total_issues > p.total_issues THEN '+' || (c.total_issues - p.total_issues)::text || ' ✗'
        ELSE '0'
    END
FROM current c, previous p
UNION ALL
SELECT
    'Approval Rate',
    ROUND(p.approved_count::numeric / NULLIF(p.total_products, 0) * 100, 1)::text || '%',
    ROUND(c.approved_count::numeric / NULLIF(c.total_products, 0) * 100, 1)::text || '%',
    ROUND((c.approved_count::numeric / NULLIF(c.total_products, 0) - p.approved_count::numeric / NULLIF(p.total_products, 0)) * 100, 1)::text || '%'
FROM current c, previous p;


-- ============================================
-- 8. NEW ISSUES (REGRESSIONS)
-- ============================================
-- Issues that appeared in current snapshot but not in previous
WITH current_snapshot AS (
    SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
),
previous_snapshot AS (
    SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1 OFFSET 1
)
SELECT
    ci.offer_id as sku,
    ci.issue_code,
    ci.description
FROM gmc_product_issues ci
WHERE ci.snapshot_id = (SELECT id FROM current_snapshot)
  AND NOT EXISTS (
    SELECT 1 FROM gmc_product_issues pi
    WHERE pi.snapshot_id = (SELECT id FROM previous_snapshot)
      AND pi.offer_id = ci.offer_id
      AND pi.issue_code = ci.issue_code
  )
ORDER BY ci.offer_id
LIMIT 50;


-- ============================================
-- 9. RESOLVED ISSUES (PROGRESS)
-- ============================================
-- Issues that were in previous snapshot but resolved in current
WITH current_snapshot AS (
    SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
),
previous_snapshot AS (
    SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1 OFFSET 1
)
SELECT
    pi.offer_id as sku,
    pi.issue_code,
    pi.description
FROM gmc_product_issues pi
WHERE pi.snapshot_id = (SELECT id FROM previous_snapshot)
  AND NOT EXISTS (
    SELECT 1 FROM gmc_product_issues ci
    WHERE ci.snapshot_id = (SELECT id FROM current_snapshot)
      AND ci.offer_id = pi.offer_id
      AND ci.issue_code = pi.issue_code
  )
ORDER BY pi.offer_id
LIMIT 50;


-- ============================================
-- 10. HISTORICAL TREND (LAST 8 WEEKS)
-- ============================================
SELECT
    snapshot_date,
    total_products,
    approved_count,
    disapproved_count,
    ROUND(approved_count::numeric / NULLIF(total_products, 0) * 100, 1) as approval_rate,
    total_issues,
    missing_from_gmc
FROM gmc_snapshots
WHERE status = 'completed'
ORDER BY snapshot_date DESC
LIMIT 8;
