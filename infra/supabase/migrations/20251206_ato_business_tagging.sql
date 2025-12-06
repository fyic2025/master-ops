-- ============================================================================
-- ATO Rulings Business Tagging
-- ============================================================================
-- Purpose: Add column to track which of our 4 businesses each ruling applies to
--
-- Businesses:
--   - teelixir: Company, supplements/adaptogens
--   - boo: Trust, organic products marketplace
--   - elevate: Company, B2B wholesale
--   - rhf: Company, fresh produce delivery
--
-- Run after: 20251206_ato_fix_rls.sql
-- ============================================================================

-- Add applicable_businesses column
ALTER TABLE ato_rulings
ADD COLUMN IF NOT EXISTS applicable_businesses TEXT[] DEFAULT '{}';

-- Create index for efficient filtering by business
CREATE INDEX IF NOT EXISTS idx_ato_rulings_businesses
ON ato_rulings USING GIN(applicable_businesses);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN ato_rulings.applicable_businesses IS
  'Which businesses this ruling applies to: teelixir, boo, elevate, rhf';

-- ============================================================================
-- View: Rulings by Business
-- ============================================================================

CREATE OR REPLACE VIEW v_ato_rulings_by_business AS
SELECT
    ruling_id,
    ruling_type,
    title,
    publication_date,
    topics,
    applicable_businesses,
    url
FROM ato_rulings
WHERE relevance_status = 'relevant'
ORDER BY publication_date DESC;

-- ============================================================================
-- Helper function: Get rulings for a specific business
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rulings_for_business(business_slug TEXT)
RETURNS TABLE (
    ruling_id TEXT,
    ruling_type TEXT,
    title TEXT,
    publication_date DATE,
    topics TEXT[],
    summary TEXT,
    url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.ruling_id,
        r.ruling_type,
        r.title,
        r.publication_date,
        r.topics,
        r.summary,
        r.url
    FROM ato_rulings r
    WHERE r.relevance_status = 'relevant'
      AND business_slug = ANY(r.applicable_businesses)
    ORDER BY r.publication_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_rulings_for_business IS
  'Get all relevant rulings that apply to a specific business (teelixir, boo, elevate, rhf)';
