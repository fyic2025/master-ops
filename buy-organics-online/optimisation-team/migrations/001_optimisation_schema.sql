-- BOO Optimisation Team Database Schema
-- Version: 1.0.0
-- Platform: Supabase (PostgreSQL)

-- ============================================
-- Lighthouse Audits Table
-- Stores all performance audit results
-- ============================================
CREATE TABLE IF NOT EXISTS boo_lighthouse_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    page_id TEXT,
    page_name TEXT,
    device TEXT NOT NULL CHECK (device IN ('desktop', 'mobile')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Lighthouse Scores (0-100)
    performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
    accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
    best_practices_score INTEGER CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
    seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),

    -- Core Web Vitals
    lcp_ms INTEGER,  -- Largest Contentful Paint (milliseconds)
    fid_ms INTEGER,  -- First Input Delay (milliseconds)
    cls DECIMAL(5,3),  -- Cumulative Layout Shift
    tbt_ms INTEGER,  -- Total Blocking Time (milliseconds)
    fcp_ms INTEGER,  -- First Contentful Paint (milliseconds)
    si_ms INTEGER,   -- Speed Index (milliseconds)
    tti_ms INTEGER,  -- Time to Interactive (milliseconds)
    ttfb_ms INTEGER, -- Time to First Byte (milliseconds)

    -- Evaluation
    overall_status TEXT CHECK (overall_status IN ('good', 'warning', 'critical')),
    failing_audits JSONB,
    alerts JSONB,

    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_boo_lighthouse_audits_timestamp ON boo_lighthouse_audits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_boo_lighthouse_audits_page_device ON boo_lighthouse_audits(page_id, device);
CREATE INDEX IF NOT EXISTS idx_boo_lighthouse_audits_status ON boo_lighthouse_audits(overall_status);

-- ============================================
-- Performance Trends Table
-- Aggregated performance data over time
-- ============================================
CREATE TABLE IF NOT EXISTS boo_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    page_id TEXT,
    device TEXT CHECK (device IN ('desktop', 'mobile', 'combined')),

    -- Average scores for the day
    avg_performance_score DECIMAL(5,2),
    avg_accessibility_score DECIMAL(5,2),
    avg_best_practices_score DECIMAL(5,2),
    avg_seo_score DECIMAL(5,2),

    -- Average Core Web Vitals
    avg_lcp_ms DECIMAL(10,2),
    avg_fid_ms DECIMAL(10,2),
    avg_cls DECIMAL(5,3),
    avg_tbt_ms DECIMAL(10,2),
    avg_ttfb_ms DECIMAL(10,2),

    -- Trend indicators
    performance_trend TEXT CHECK (performance_trend IN ('improving', 'stable', 'declining')),
    audit_count INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(date, page_id, device)
);

CREATE INDEX IF NOT EXISTS idx_boo_performance_trends_date ON boo_performance_trends(date DESC);

-- ============================================
-- Optimisation Alerts Table
-- Performance alerts and notifications
-- ============================================
CREATE TABLE IF NOT EXISTS boo_optimisation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    page_id TEXT,
    device TEXT,
    metric TEXT,
    value DECIMAL(10,3),
    threshold DECIMAL(10,3),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),

    -- Resolution tracking
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_optimisation_alerts_status ON boo_optimisation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_boo_optimisation_alerts_severity ON boo_optimisation_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_boo_optimisation_alerts_created ON boo_optimisation_alerts(created_at DESC);

-- ============================================
-- Fix History Table
-- Track all recommended and applied fixes
-- ============================================
CREATE TABLE IF NOT EXISTS boo_fix_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id TEXT,
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    fix_details JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),

    -- Impact tracking
    estimated_impact TEXT,
    actual_impact TEXT,
    before_score INTEGER,
    after_score INTEGER,

    -- Timeline
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    applied_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_boo_fix_history_status ON boo_fix_history(status);
CREATE INDEX IF NOT EXISTS idx_boo_fix_history_priority ON boo_fix_history(priority);
CREATE INDEX IF NOT EXISTS idx_boo_fix_history_created ON boo_fix_history(created_at DESC);

-- ============================================
-- Comparison Reports Table
-- Period-over-period comparison data
-- ============================================
CREATE TABLE IF NOT EXISTS boo_comparison_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Period data
    current_period_avg JSONB,
    previous_period_avg JSONB,
    comparison_data JSONB,

    -- Summary
    regressions_count INTEGER DEFAULT 0,
    improvements_count INTEGER DEFAULT 0,
    overall_trend TEXT CHECK (overall_trend IN ('improving', 'stable', 'regressing')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_comparison_reports_period ON boo_comparison_reports(period_type);
CREATE INDEX IF NOT EXISTS idx_boo_comparison_reports_generated ON boo_comparison_reports(generated_at DESC);

-- ============================================
-- Agent Activity Log
-- Track all agent activities
-- ============================================
CREATE TABLE IF NOT EXISTS boo_agent_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    details JSONB,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_agent_activity_log_agent ON boo_agent_activity_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_boo_agent_activity_log_created ON boo_agent_activity_log(created_at DESC);

-- ============================================
-- Views for Easy Querying
-- ============================================

-- Latest scores per page/device
CREATE OR REPLACE VIEW boo_latest_lighthouse_scores AS
SELECT DISTINCT ON (page_id, device)
    page_id,
    page_name,
    device,
    timestamp,
    performance_score,
    accessibility_score,
    best_practices_score,
    seo_score,
    lcp_ms,
    fid_ms,
    cls,
    tbt_ms,
    overall_status
FROM boo_lighthouse_audits
ORDER BY page_id, device, timestamp DESC;

-- Open alerts summary
CREATE OR REPLACE VIEW boo_active_alerts AS
SELECT
    severity,
    COUNT(*) as count,
    array_agg(message) as messages
FROM boo_optimisation_alerts
WHERE status = 'open'
GROUP BY severity
ORDER BY
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END;

-- Performance summary by device
CREATE OR REPLACE VIEW boo_performance_summary AS
SELECT
    device,
    COUNT(*) as total_audits,
    ROUND(AVG(performance_score), 1) as avg_performance,
    ROUND(AVG(accessibility_score), 1) as avg_accessibility,
    ROUND(AVG(best_practices_score), 1) as avg_best_practices,
    ROUND(AVG(seo_score), 1) as avg_seo,
    ROUND(AVG(lcp_ms), 0) as avg_lcp_ms,
    ROUND(AVG(cls)::numeric, 3) as avg_cls,
    ROUND(AVG(tbt_ms), 0) as avg_tbt_ms
FROM boo_lighthouse_audits
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY device;

-- Pending fixes summary
CREATE OR REPLACE VIEW boo_pending_fixes AS
SELECT
    category,
    priority,
    COUNT(*) as count,
    array_agg(title) as titles
FROM boo_fix_history
WHERE status = 'pending'
GROUP BY category, priority
ORDER BY
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END;

-- ============================================
-- Row Level Security (RLS) Policies
-- Enable if using Supabase Auth
-- ============================================

-- Enable RLS on all tables (uncomment if needed)
-- ALTER TABLE boo_lighthouse_audits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boo_performance_trends ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boo_optimisation_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boo_fix_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boo_comparison_reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE boo_agent_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE boo_lighthouse_audits IS 'Stores all Lighthouse audit results for Buy Organics Online';
COMMENT ON TABLE boo_performance_trends IS 'Daily aggregated performance trends';
COMMENT ON TABLE boo_optimisation_alerts IS 'Performance alerts and notifications';
COMMENT ON TABLE boo_fix_history IS 'History of recommended and applied fixes';
COMMENT ON TABLE boo_comparison_reports IS 'Period-over-period comparison data';
COMMENT ON TABLE boo_agent_activity_log IS 'Agent activity tracking';

-- ============================================
-- Grant Permissions (for service role)
-- ============================================

-- Service role should have full access
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
