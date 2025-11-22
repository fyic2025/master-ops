-- ============================================================================
-- AI Agent Team Database Schema for Supabase
-- Purpose: Track all agent activities, audits, changes, and deployments
-- Version: 1.0.0
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LIGHTHOUSE AUDITS
-- Stores all Lighthouse audit results from the Lighthouse Audit Agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS lighthouse_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'production')),
    page_url TEXT NOT NULL,
    page_type TEXT, -- homepage, product, collection, etc.

    -- Lighthouse scores (0-100)
    performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
    accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
    best_practices_score INTEGER CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
    seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),

    -- Core Web Vitals
    lcp_value DECIMAL(10,2), -- Largest Contentful Paint (seconds)
    fid_value DECIMAL(10,2), -- First Input Delay (milliseconds)
    cls_value DECIMAL(10,3), -- Cumulative Layout Shift
    tti_value DECIMAL(10,2), -- Time to Interactive (seconds)
    tbt_value DECIMAL(10,2), -- Total Blocking Time (milliseconds)
    si_value DECIMAL(10,2), -- Speed Index (seconds)
    fcp_value DECIMAL(10,2), -- First Contentful Paint (seconds)

    -- Detailed results
    failing_audits JSONB, -- Array of failing audit objects
    opportunities JSONB, -- Performance optimization opportunities
    diagnostics JSONB, -- Diagnostic information

    -- Metadata
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile')),
    lighthouse_version TEXT,
    user_agent TEXT,

    -- Relationships
    change_id UUID, -- Links to theme_changes if this audit is for a change
    deployment_id UUID, -- Links to deployment_history if part of deployment

    -- Indexing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lighthouse_audits
CREATE INDEX idx_lighthouse_brand_env ON lighthouse_audits(brand, environment);
CREATE INDEX idx_lighthouse_timestamp ON lighthouse_audits(timestamp DESC);
CREATE INDEX idx_lighthouse_change_id ON lighthouse_audits(change_id);
CREATE INDEX idx_lighthouse_scores ON lighthouse_audits(performance_score, accessibility_score, best_practices_score, seo_score);

-- ============================================================================
-- PERFORMANCE TRENDS
-- Aggregated performance data for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_trends (
    trend_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'production')),
    page_type TEXT,

    -- Averaged scores (from multiple audits)
    avg_performance INTEGER,
    avg_accessibility INTEGER,
    avg_best_practices INTEGER,
    avg_seo INTEGER,

    -- Averaged Core Web Vitals
    avg_lcp DECIMAL(10,2),
    avg_fid DECIMAL(10,2),
    avg_cls DECIMAL(10,3),

    -- Trend direction
    performance_trend TEXT CHECK (performance_trend IN ('improving', 'stable', 'declining')),

    -- Metadata
    audit_count INTEGER, -- Number of audits averaged
    period TEXT, -- daily, weekly, monthly

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_trends_brand ON performance_trends(brand, timestamp DESC);

-- ============================================================================
-- PERFORMANCE ALERTS
-- Critical performance issues that require immediate attention
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'production')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

    -- Alert details
    alert_type TEXT NOT NULL, -- score_drop, core_vital_failure, regression, etc.
    title TEXT NOT NULL,
    description TEXT,

    -- Related data
    audit_id UUID REFERENCES lighthouse_audits(audit_id),
    page_url TEXT,

    -- Metrics
    metric_name TEXT, -- performance_score, lcp, cls, etc.
    previous_value DECIMAL(10,3),
    current_value DECIMAL(10,3),
    threshold_value DECIMAL(10,3),

    -- Status
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,

    -- Notification
    notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_alerts_brand ON performance_alerts(brand, status, severity);
CREATE INDEX idx_performance_alerts_timestamp ON performance_alerts(timestamp DESC);

-- ============================================================================
-- THEME CHANGES
-- All theme modifications made by Theme Optimizer Agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS theme_changes (
    change_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),

    -- Change metadata
    agent_name TEXT NOT NULL, -- Which agent made the change
    change_type TEXT NOT NULL CHECK (change_type IN ('optimization', 'feature', 'fix', 'refactor', 'seo', 'accessibility')),
    title TEXT NOT NULL,
    description TEXT,

    -- Files affected
    files_modified JSONB NOT NULL, -- Array of file paths
    lines_added INTEGER,
    lines_removed INTEGER,

    -- Performance impact
    lighthouse_before JSONB, -- Scores before change
    lighthouse_after JSONB, -- Scores after change
    performance_impact JSONB, -- Detailed impact analysis

    -- Git integration
    git_commit_hash TEXT,
    git_branch TEXT,

    -- Deployment status
    deployed BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    deployment_id UUID,

    -- Validation
    validated BOOLEAN DEFAULT FALSE,
    validation_results JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theme_changes_brand ON theme_changes(brand, timestamp DESC);
CREATE INDEX idx_theme_changes_deployed ON theme_changes(deployed);
CREATE INDEX idx_theme_changes_git ON theme_changes(git_commit_hash);

-- ============================================================================
-- ACCESSIBILITY AUDITS
-- Accessibility validation results from Accessibility Agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS accessibility_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    environment TEXT NOT NULL CHECK (environment IN ('dev', 'staging', 'production')),
    page_url TEXT NOT NULL,

    -- Tools used
    tool_name TEXT, -- axe-core, pa11y, lighthouse
    tool_version TEXT,

    -- Results
    violations_critical INTEGER DEFAULT 0,
    violations_high INTEGER DEFAULT 0,
    violations_medium INTEGER DEFAULT 0,
    violations_low INTEGER DEFAULT 0,
    violations_total INTEGER DEFAULT 0,

    -- Detailed violations
    violations JSONB, -- Array of violation objects

    -- WCAG compliance
    wcag_level_a_compliant BOOLEAN,
    wcag_level_aa_compliant BOOLEAN,
    wcag_level_aaa_compliant BOOLEAN,

    -- Testing coverage
    automated_coverage INTEGER, -- Percentage
    manual_testing_completed BOOLEAN DEFAULT FALSE,

    -- Relationships
    change_id UUID REFERENCES theme_changes(change_id),
    deployment_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accessibility_audits_brand ON accessibility_audits(brand, timestamp DESC);
CREATE INDEX idx_accessibility_audits_violations ON accessibility_audits(violations_total, violations_critical);

-- ============================================================================
-- SEO IMPLEMENTATION TASKS
-- SEO tasks received from SEO team and implemented by SEO Implementation Agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS seo_implementation_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),

    -- Task details
    ticket_reference TEXT, -- Reference from SEO team ticket system
    category TEXT NOT NULL CHECK (category IN ('schema', 'meta-tags', 'structure', 'links', 'technical')),
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    title TEXT NOT NULL,
    requirements TEXT,

    -- Implementation
    pages_affected JSONB, -- Array of URLs or patterns
    implementation_details TEXT,
    files_modified JSONB,

    -- Validation
    validation_results JSONB,
    lighthouse_seo_before INTEGER,
    lighthouse_seo_after INTEGER,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    completed_date TIMESTAMPTZ,

    -- Communication
    seo_team_notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,

    -- Relationships
    change_id UUID REFERENCES theme_changes(change_id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_tasks_brand ON seo_implementation_tasks(brand, status);
CREATE INDEX idx_seo_tasks_priority ON seo_implementation_tasks(priority, status);

-- ============================================================================
-- DEPLOYMENT HISTORY
-- All deployments orchestrated by Deployment & Validation Agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS deployment_history (
    deployment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    environment TEXT NOT NULL CHECK (environment IN ('staging', 'production')),

    -- Deployment details
    theme_version TEXT, -- Git commit hash
    changes_included JSONB, -- Array of change_ids

    -- Validation gates
    validation_results JSONB, -- Results from all 6 gates
    all_gates_passed BOOLEAN,

    -- Lighthouse scores
    lighthouse_scores_before JSONB,
    lighthouse_scores_after JSONB,

    -- Approval (for production)
    approval_required BOOLEAN,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,

    -- Deployment execution
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deployment_duration_seconds INTEGER,

    -- Post-deployment
    post_deployment_validation TEXT CHECK (post_deployment_validation IN ('pass', 'fail')),
    issues_detected JSONB,

    -- Rollback
    rollback_point TEXT, -- Git tag or commit for rollback
    rolled_back BOOLEAN DEFAULT FALSE,
    rolled_back_at TIMESTAMPTZ,
    rollback_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deployment_history_brand ON deployment_history(brand, environment, timestamp DESC);
CREATE INDEX idx_deployment_history_status ON deployment_history(status);

-- ============================================================================
-- AGENT ACTIVITY LOG
-- General activity log for all agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_activity_log (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_name TEXT NOT NULL,
    brand TEXT CHECK (brand IN ('teelixir', 'elevate', 'both', 'system')),

    -- Activity details
    activity_type TEXT NOT NULL,
    description TEXT,
    details JSONB,

    -- Status
    status TEXT CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
    duration_seconds INTEGER,

    -- Relationships
    related_change_id UUID,
    related_deployment_id UUID,
    related_audit_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_activity_agent ON agent_activity_log(agent_name, timestamp DESC);
CREATE INDEX idx_agent_activity_brand ON agent_activity_log(brand, timestamp DESC);

-- ============================================================================
-- PERFORMANCE BUDGETS
-- Performance budget tracking per page type
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_budgets (
    budget_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL CHECK (brand IN ('teelixir', 'elevate')),
    page_type TEXT NOT NULL, -- homepage, product, collection, etc.

    -- Budget thresholds
    metric_name TEXT NOT NULL,
    threshold_value DECIMAL(10,3) NOT NULL,
    current_value DECIMAL(10,3),

    -- Status
    status TEXT CHECK (status IN ('pass', 'warning', 'fail')),
    last_checked TIMESTAMPTZ,

    -- Metadata
    unit TEXT, -- KB, seconds, score, etc.
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(brand, page_type, metric_name)
);

CREATE INDEX idx_performance_budgets_brand ON performance_budgets(brand, page_type);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Latest Lighthouse scores per brand/environment
CREATE OR REPLACE VIEW latest_lighthouse_scores AS
SELECT DISTINCT ON (brand, environment, page_type)
    brand,
    environment,
    page_type,
    page_url,
    performance_score,
    accessibility_score,
    best_practices_score,
    seo_score,
    lcp_value,
    cls_value,
    timestamp
FROM lighthouse_audits
ORDER BY brand, environment, page_type, timestamp DESC;

-- Active performance alerts
CREATE OR REPLACE VIEW active_performance_alerts AS
SELECT
    alert_id,
    brand,
    environment,
    severity,
    title,
    description,
    metric_name,
    current_value,
    threshold_value,
    timestamp
FROM performance_alerts
WHERE status IN ('open', 'investigating')
ORDER BY severity DESC, timestamp DESC;

-- Recent deployments
CREATE OR REPLACE VIEW recent_deployments AS
SELECT
    deployment_id,
    brand,
    environment,
    status,
    all_gates_passed,
    approved_by,
    timestamp,
    deployment_duration_seconds
FROM deployment_history
ORDER BY timestamp DESC
LIMIT 50;

-- Agent performance summary
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT
    agent_name,
    DATE(timestamp) as date,
    COUNT(*) as activities,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    AVG(duration_seconds) as avg_duration_seconds
FROM agent_activity_log
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY agent_name, DATE(timestamp)
ORDER BY date DESC, agent_name;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_lighthouse_audits_updated_at BEFORE UPDATE ON lighthouse_audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_changes_updated_at BEFORE UPDATE ON theme_changes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_alerts_updated_at BEFORE UPDATE ON performance_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_tasks_updated_at BEFORE UPDATE ON seo_implementation_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployment_history_updated_at BEFORE UPDATE ON deployment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_budgets_updated_at BEFORE UPDATE ON performance_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for multi-tenant security
-- ============================================================================

ALTER TABLE lighthouse_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_implementation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_budgets ENABLE ROW LEVEL SECURITY;

-- Policies will be created based on your authentication setup
-- Example: Allow service role full access
-- CREATE POLICY "Service role has full access" ON lighthouse_audits
--     FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default performance budgets
INSERT INTO performance_budgets (brand, page_type, metric_name, threshold_value, unit, description) VALUES
    ('teelixir', 'homepage', 'lcp', 2.5, 'seconds', 'Largest Contentful Paint'),
    ('teelixir', 'homepage', 'fid', 100, 'milliseconds', 'First Input Delay'),
    ('teelixir', 'homepage', 'cls', 0.1, 'score', 'Cumulative Layout Shift'),
    ('teelixir', 'homepage', 'performance_score', 95, 'score', 'Lighthouse Performance Score'),

    ('teelixir', 'product', 'lcp', 2.5, 'seconds', 'Largest Contentful Paint'),
    ('teelixir', 'product', 'fid', 100, 'milliseconds', 'First Input Delay'),
    ('teelixir', 'product', 'cls', 0.1, 'score', 'Cumulative Layout Shift'),
    ('teelixir', 'product', 'performance_score', 95, 'score', 'Lighthouse Performance Score'),

    ('elevate', 'homepage', 'lcp', 2.5, 'seconds', 'Largest Contentful Paint'),
    ('elevate', 'homepage', 'fid', 100, 'milliseconds', 'First Input Delay'),
    ('elevate', 'homepage', 'cls', 0.1, 'score', 'Cumulative Layout Shift'),
    ('elevate', 'homepage', 'performance_score', 95, 'score', 'Lighthouse Performance Score')
ON CONFLICT (brand, page_type, metric_name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE lighthouse_audits IS 'Stores all Lighthouse audit results from the Lighthouse Audit Agent';
COMMENT ON TABLE performance_trends IS 'Aggregated performance data for trend analysis over time';
COMMENT ON TABLE performance_alerts IS 'Critical performance issues requiring immediate attention';
COMMENT ON TABLE theme_changes IS 'All theme modifications made by Theme Optimizer Agent';
COMMENT ON TABLE accessibility_audits IS 'Accessibility validation results from Accessibility Agent';
COMMENT ON TABLE seo_implementation_tasks IS 'SEO tasks from SEO team implemented by SEO Implementation Agent';
COMMENT ON TABLE deployment_history IS 'All deployments orchestrated by Deployment & Validation Agent';
COMMENT ON TABLE agent_activity_log IS 'General activity log for all AI agents';
COMMENT ON TABLE performance_budgets IS 'Performance budget tracking per page type';
