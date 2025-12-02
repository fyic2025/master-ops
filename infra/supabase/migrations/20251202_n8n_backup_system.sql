-- ============================================================================
-- n8n Backup System Schema
-- Daily backup of n8n workflows and executions for error analysis
-- Created: 2025-12-02
-- ============================================================================

-- ============================================================================
-- 1. n8n_workflows - Stores workflow definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS n8n_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    n8n_workflow_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,

    -- Workflow metadata
    created_at_n8n TIMESTAMPTZ,
    updated_at_n8n TIMESTAMPTZ,

    -- Full workflow definition (nodes, connections, settings)
    workflow_definition JSONB NOT NULL,

    -- Quick access fields
    node_count INTEGER DEFAULT 0,
    trigger_type TEXT,  -- webhook, schedule, manual, etc.
    tags TEXT[],

    -- Backup tracking
    first_backed_up_at TIMESTAMPTZ DEFAULT NOW(),
    last_backed_up_at TIMESTAMPTZ DEFAULT NOW(),
    backup_version INTEGER DEFAULT 1,

    -- Change tracking
    definition_hash TEXT,  -- MD5 hash to detect changes
    has_changed_since_last_backup BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_n8n_id ON n8n_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_active ON n8n_workflows(active);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_name ON n8n_workflows(name);

-- ============================================================================
-- 2. n8n_executions - Stores execution history for error analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS n8n_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    n8n_execution_id TEXT NOT NULL UNIQUE,
    n8n_workflow_id TEXT NOT NULL,
    workflow_name TEXT,

    -- Execution details
    status TEXT NOT NULL,  -- success, error, waiting, running, canceled
    mode TEXT,  -- manual, trigger, webhook, retry, etc.
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Error tracking (critical for analysis)
    has_error BOOLEAN DEFAULT false,
    error_message TEXT,
    error_node TEXT,  -- Which node failed
    error_type TEXT,  -- timeout, api_error, validation, etc.
    error_stack TEXT,

    -- Execution data (summarized for analysis)
    input_data_summary JSONB,  -- First 1KB of input data
    output_data_summary JSONB,  -- First 1KB of output data

    -- Node execution details
    nodes_executed INTEGER DEFAULT 0,
    nodes_failed INTEGER DEFAULT 0,
    node_execution_summary JSONB,  -- Summary of each node's status

    -- Retry tracking
    retry_of TEXT,  -- n8n_execution_id of original if this is a retry
    retry_count INTEGER DEFAULT 0,

    -- Backup tracking
    backed_up_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error analysis
CREATE INDEX IF NOT EXISTS idx_n8n_executions_workflow ON n8n_executions(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_status ON n8n_executions(status);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_has_error ON n8n_executions(has_error);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_error_type ON n8n_executions(error_type);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_started ON n8n_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_error_node ON n8n_executions(error_node);

-- ============================================================================
-- 3. n8n_backup_runs - Track backup job history
-- ============================================================================
CREATE TABLE IF NOT EXISTS n8n_backup_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',  -- running, success, partial, failed

    -- Stats
    workflows_backed_up INTEGER DEFAULT 0,
    workflows_changed INTEGER DEFAULT 0,
    executions_backed_up INTEGER DEFAULT 0,
    errors_found INTEGER DEFAULT 0,

    -- Details
    error_message TEXT,
    details JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Useful Views for Error Analysis
-- ============================================================================

-- View: Common errors by workflow
CREATE OR REPLACE VIEW n8n_error_summary AS
SELECT
    n8n_workflow_id,
    workflow_name,
    COUNT(*) FILTER (WHERE has_error) as total_errors,
    COUNT(*) FILTER (WHERE status = 'success') as total_success,
    ROUND(
        COUNT(*) FILTER (WHERE has_error)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as error_rate_pct,
    array_agg(DISTINCT error_type) FILTER (WHERE error_type IS NOT NULL) as error_types,
    array_agg(DISTINCT error_node) FILTER (WHERE error_node IS NOT NULL) as failing_nodes,
    MAX(started_at) as last_execution,
    MAX(started_at) FILTER (WHERE has_error) as last_error
FROM n8n_executions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY n8n_workflow_id, workflow_name
ORDER BY total_errors DESC;

-- View: Recent errors for troubleshooting
CREATE OR REPLACE VIEW n8n_recent_errors AS
SELECT
    e.n8n_execution_id,
    e.n8n_workflow_id,
    e.workflow_name,
    e.status,
    e.error_message,
    e.error_node,
    e.error_type,
    e.started_at,
    e.finished_at,
    e.duration_ms,
    e.nodes_executed,
    e.nodes_failed
FROM n8n_executions e
WHERE e.has_error = true
ORDER BY e.started_at DESC
LIMIT 100;

-- View: Workflow health dashboard
CREATE OR REPLACE VIEW n8n_workflow_health AS
SELECT
    w.n8n_workflow_id,
    w.name,
    w.active,
    w.is_archived,
    w.trigger_type,
    w.node_count,
    w.last_backed_up_at,
    COALESCE(stats.total_executions, 0) as total_executions_30d,
    COALESCE(stats.total_errors, 0) as total_errors_30d,
    COALESCE(stats.error_rate_pct, 0) as error_rate_pct,
    COALESCE(stats.avg_duration_ms, 0) as avg_duration_ms,
    stats.last_execution,
    stats.last_error
FROM n8n_workflows w
LEFT JOIN (
    SELECT
        n8n_workflow_id,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE has_error) as total_errors,
        ROUND(COUNT(*) FILTER (WHERE has_error)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as error_rate_pct,
        AVG(duration_ms)::INTEGER as avg_duration_ms,
        MAX(started_at) as last_execution,
        MAX(started_at) FILTER (WHERE has_error) as last_error
    FROM n8n_executions
    WHERE started_at > NOW() - INTERVAL '30 days'
    GROUP BY n8n_workflow_id
) stats ON w.n8n_workflow_id = stats.n8n_workflow_id
ORDER BY COALESCE(stats.total_errors, 0) DESC, w.name;

-- View: Error patterns (for identifying systemic issues)
CREATE OR REPLACE VIEW n8n_error_patterns AS
SELECT
    error_type,
    error_node,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT n8n_workflow_id) as affected_workflows,
    array_agg(DISTINCT workflow_name) as workflow_names,
    MIN(started_at) as first_seen,
    MAX(started_at) as last_seen
FROM n8n_executions
WHERE has_error = true
  AND started_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, error_node
HAVING COUNT(*) >= 2
ORDER BY occurrence_count DESC;

-- ============================================================================
-- 5. Trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_n8n_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_n8n_workflows_updated_at ON n8n_workflows;
CREATE TRIGGER trigger_n8n_workflows_updated_at
    BEFORE UPDATE ON n8n_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_workflows_updated_at();

-- ============================================================================
-- 6. RLS Policies (service role has full access)
-- ============================================================================
ALTER TABLE n8n_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_backup_runs ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access to n8n_workflows" ON n8n_workflows
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to n8n_executions" ON n8n_executions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to n8n_backup_runs" ON n8n_backup_runs
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. Comments
-- ============================================================================
COMMENT ON TABLE n8n_workflows IS 'Daily backup of n8n workflow definitions';
COMMENT ON TABLE n8n_executions IS 'n8n execution history for error analysis and troubleshooting';
COMMENT ON TABLE n8n_backup_runs IS 'Track daily backup job runs';
COMMENT ON VIEW n8n_error_summary IS 'Summarized error statistics by workflow';
COMMENT ON VIEW n8n_recent_errors IS 'Most recent 100 execution errors for troubleshooting';
COMMENT ON VIEW n8n_workflow_health IS 'Workflow health dashboard with execution stats';
COMMENT ON VIEW n8n_error_patterns IS 'Identify recurring error patterns across workflows';
