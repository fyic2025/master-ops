-- ============================================================================
-- Unleashed API Discovery Tables
-- Created: 2025-12-06
-- Purpose: Store raw Unleashed API responses for field analysis
--          before designing final typed schema
-- ============================================================================

-- =============================================================================
-- RAW DISCOVERY TABLE
-- Store raw API responses as JSONB for analysis
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_raw_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,              -- 'teelixir', 'elevate'
  endpoint TEXT NOT NULL,           -- 'Products', 'StockOnHand', 'SalesOrders', etc.
  resource_guid TEXT,               -- Unleashed GUID if applicable (for single-record fetches)
  raw_response JSONB NOT NULL,      -- Full API response as-is
  record_count INTEGER,             -- Number of items in this response
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  page_number INTEGER,              -- For paginated responses
  total_pages INTEGER,              -- Total pages available

  -- Metadata
  api_version TEXT,                 -- Unleashed API version if available
  response_time_ms INTEGER,         -- How long the API call took

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying discovery data
CREATE INDEX IF NOT EXISTS idx_ul_raw_discovery_store ON ul_raw_discovery(store);
CREATE INDEX IF NOT EXISTS idx_ul_raw_discovery_endpoint ON ul_raw_discovery(endpoint);
CREATE INDEX IF NOT EXISTS idx_ul_raw_discovery_store_endpoint ON ul_raw_discovery(store, endpoint);
CREATE INDEX IF NOT EXISTS idx_ul_raw_discovery_fetched ON ul_raw_discovery(fetched_at);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_ul_raw_discovery_response ON ul_raw_discovery USING GIN (raw_response);

-- =============================================================================
-- FIELD ANALYSIS TABLE
-- Stores analysis of what fields exist and their population rates
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_field_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  field_path TEXT NOT NULL,         -- e.g., 'Customer.Email', 'SalesOrderLines[].Product.Barcode'
  field_type TEXT,                  -- 'string', 'number', 'boolean', 'object', 'array', 'null', 'mixed'

  -- Statistics
  null_count INTEGER DEFAULT 0,
  populated_count INTEGER DEFAULT 0,
  empty_string_count INTEGER DEFAULT 0,  -- For strings that are "" vs null
  total_records INTEGER DEFAULT 0,
  population_rate DECIMAL(5,2),     -- % of records with this field populated

  -- Sample values (up to 5 examples)
  sample_values JSONB,              -- Array of example values found

  -- Value statistics (for numeric fields)
  min_value DECIMAL(20,4),
  max_value DECIMAL(20,4),
  avg_value DECIMAL(20,4),

  -- String statistics
  max_length INTEGER,
  min_length INTEGER,

  -- Cardinality (unique value count)
  distinct_values INTEGER,

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, endpoint, field_path)
);

-- Indexes for field analysis queries
CREATE INDEX IF NOT EXISTS idx_ul_field_analysis_store ON ul_field_analysis(store);
CREATE INDEX IF NOT EXISTS idx_ul_field_analysis_endpoint ON ul_field_analysis(endpoint);
CREATE INDEX IF NOT EXISTS idx_ul_field_analysis_store_endpoint ON ul_field_analysis(store, endpoint);
CREATE INDEX IF NOT EXISTS idx_ul_field_analysis_population ON ul_field_analysis(population_rate DESC);

-- =============================================================================
-- DISCOVERY SYNC LOG
-- Track discovery runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Run info
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',    -- 'running', 'completed', 'failed', 'partial'

  -- Endpoints discovered
  endpoints_requested TEXT[],       -- Which endpoints were requested
  endpoints_completed TEXT[],       -- Which endpoints succeeded
  endpoints_failed TEXT[],          -- Which endpoints failed

  -- Statistics
  total_records_fetched INTEGER DEFAULT 0,
  total_pages_fetched INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  total_time_ms INTEGER,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ul_discovery_runs_store ON ul_discovery_runs(store);
CREATE INDEX IF NOT EXISTS idx_ul_discovery_runs_status ON ul_discovery_runs(status);

-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- View: Field population summary by endpoint
CREATE OR REPLACE VIEW v_ul_field_summary AS
SELECT
  store,
  endpoint,
  COUNT(*) as total_fields,
  COUNT(*) FILTER (WHERE population_rate >= 90) as highly_populated,
  COUNT(*) FILTER (WHERE population_rate >= 50 AND population_rate < 90) as moderately_populated,
  COUNT(*) FILTER (WHERE population_rate > 0 AND population_rate < 50) as sparsely_populated,
  COUNT(*) FILTER (WHERE population_rate = 0 OR population_rate IS NULL) as never_populated,
  ROUND(AVG(population_rate), 2) as avg_population_rate
FROM ul_field_analysis
GROUP BY store, endpoint
ORDER BY store, endpoint;

-- View: Discovery progress by store
CREATE OR REPLACE VIEW v_ul_discovery_progress AS
SELECT
  store,
  endpoint,
  COUNT(*) as pages_fetched,
  SUM(record_count) as total_records,
  MIN(fetched_at) as first_fetch,
  MAX(fetched_at) as last_fetch,
  MAX(total_pages) as expected_pages
FROM ul_raw_discovery
GROUP BY store, endpoint
ORDER BY store, endpoint;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE ul_raw_discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_field_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_discovery_runs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to ul_raw_discovery" ON ul_raw_discovery
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to ul_field_analysis" ON ul_field_analysis
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to ul_discovery_runs" ON ul_discovery_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "Authenticated read access to ul_raw_discovery" ON ul_raw_discovery
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read access to ul_field_analysis" ON ul_field_analysis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read access to ul_discovery_runs" ON ul_discovery_runs
  FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE ul_raw_discovery IS 'Raw Unleashed API responses stored as JSONB for field discovery and analysis';
COMMENT ON TABLE ul_field_analysis IS 'Analysis of field paths found in Unleashed API responses with population statistics';
COMMENT ON TABLE ul_discovery_runs IS 'Tracking of discovery sync runs';
COMMENT ON VIEW v_ul_field_summary IS 'Summary of field population rates by endpoint';
COMMENT ON VIEW v_ul_discovery_progress IS 'Progress of discovery data fetching';
