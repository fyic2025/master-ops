-- ============================================================================
-- Performance Optimization: Missing Indexes
-- Generated: 2025-11-20
-- Purpose: Add critical indexes for frequently queried columns
-- ============================================================================

-- IMPORTANT: Run this migration during low-traffic periods
-- Estimated execution time: 5-15 minutes depending on table sizes
-- Impact: Will temporarily lock tables during index creation

BEGIN;

-- ============================================================================
-- INTEGRATION_LOGS TABLE INDEXES
-- ============================================================================

-- Index on source column (frequently filtered)
-- Use case: SELECT * FROM integration_logs WHERE source = 'hubspot'
CREATE INDEX IF NOT EXISTS idx_integration_logs_source
ON integration_logs(source);

-- Index on created_at for time-range queries
-- Use case: SELECT * FROM integration_logs WHERE created_at > NOW() - INTERVAL '24 hours'
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at
ON integration_logs(created_at DESC);

-- Index on business_id for business-specific queries
-- Use case: SELECT * FROM integration_logs WHERE business_id = 'uuid-here'
CREATE INDEX IF NOT EXISTS idx_integration_logs_business_id
ON integration_logs(business_id);

-- Index on level for error filtering
-- Use case: SELECT * FROM integration_logs WHERE level = 'error'
CREATE INDEX IF NOT EXISTS idx_integration_logs_level
ON integration_logs(level);

-- Composite index for common query pattern (source + time range)
-- Use case: integration_health_summary view, error rate calculations
CREATE INDEX IF NOT EXISTS idx_integration_logs_source_created
ON integration_logs(source, created_at DESC);

-- Composite index for business + time range queries
-- Use case: business_integration_health view
CREATE INDEX IF NOT EXISTS idx_integration_logs_business_created
ON integration_logs(business_id, created_at DESC);

-- JSONB GIN index for details_json queries
-- Use case: SELECT * FROM integration_logs WHERE details_json->>'key' = 'value'
CREATE INDEX IF NOT EXISTS idx_integration_logs_details_gin
ON integration_logs USING GIN (details_json);

-- ============================================================================
-- WORKFLOW_EXECUTION_LOGS TABLE INDEXES
-- ============================================================================

-- Index on status for failure filtering
-- Use case: SELECT * FROM workflow_execution_logs WHERE status = 'failed'
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status
ON workflow_execution_logs(status);

-- Index on business_id
-- Use case: SELECT * FROM workflow_execution_logs WHERE business_id = 'uuid-here'
CREATE INDEX IF NOT EXISTS idx_workflow_logs_business_id
ON workflow_execution_logs(business_id);

-- Index on workflow_name for grouping
-- Use case: workflow_performance_summary view
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_name
ON workflow_execution_logs(workflow_name);

-- Index on started_at for time-range queries
-- Use case: SELECT * FROM workflow_execution_logs WHERE started_at > NOW() - INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_workflow_logs_started_at
ON workflow_execution_logs(started_at DESC);

-- Index on finished_at (nullable) for completed workflows
-- Use case: Calculate duration, recent completions
CREATE INDEX IF NOT EXISTS idx_workflow_logs_finished_at
ON workflow_execution_logs(finished_at DESC)
WHERE finished_at IS NOT NULL;

-- Composite index for status + time filtering
-- Use case: recent_workflow_failures view
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status_finished
ON workflow_execution_logs(status, finished_at DESC);

-- JSONB GIN index for data_json queries
CREATE INDEX IF NOT EXISTS idx_workflow_logs_data_gin
ON workflow_execution_logs USING GIN (data_json);

-- ============================================================================
-- API_METRICS TABLE INDEXES
-- ============================================================================

-- Index on service for grouping
-- Use case: SELECT * FROM api_metrics WHERE service = 'hubspot'
CREATE INDEX IF NOT EXISTS idx_api_metrics_service
ON api_metrics(service);

-- Index on endpoint for specific endpoint analysis
-- Use case: SELECT * FROM api_metrics WHERE endpoint = '/api/contacts'
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint
ON api_metrics(endpoint);

-- Index on success for filtering errors
-- Use case: SELECT * FROM api_metrics WHERE success = false
CREATE INDEX IF NOT EXISTS idx_api_metrics_success
ON api_metrics(success);

-- Index on created_at for time-range queries
-- Use case: SELECT * FROM api_metrics WHERE created_at > NOW() - INTERVAL '24 hours'
CREATE INDEX IF NOT EXISTS idx_api_metrics_created_at
ON api_metrics(created_at DESC);

-- Composite index for service + endpoint performance analysis
-- Use case: api_performance_summary view
CREATE INDEX IF NOT EXISTS idx_api_metrics_service_endpoint
ON api_metrics(service, endpoint);

-- Composite index for business + time range
CREATE INDEX IF NOT EXISTS idx_api_metrics_business_created
ON api_metrics(business_id, created_at DESC);

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Index on status for filtering by task state
-- Use case: SELECT * FROM tasks WHERE status = 'failed'
CREATE INDEX IF NOT EXISTS idx_tasks_status
ON tasks(status);

-- Index on created_at for time-based queries
-- Use case: SELECT * FROM tasks WHERE created_at < NOW() - INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_tasks_created_at
ON tasks(created_at DESC);

-- Index on updated_at for recently modified tasks
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at
ON tasks(updated_at DESC);

-- Composite index for status + created_at (stale tasks)
-- Use case: tasks_needing_attention view, stale task detection
CREATE INDEX IF NOT EXISTS idx_tasks_status_created
ON tasks(status, created_at DESC);

-- Index on retry_count for retry logic
-- Use case: get_tasks_for_retry function
CREATE INDEX IF NOT EXISTS idx_tasks_retry_count
ON tasks(retry_count)
WHERE status IN ('failed', 'needs_fix');

-- JSONB GIN index for plan_json queries
CREATE INDEX IF NOT EXISTS idx_tasks_plan_gin
ON tasks USING GIN (plan_json);

-- ============================================================================
-- TASK_LOGS TABLE INDEXES
-- ============================================================================

-- Index on task_id (foreign key) for task history queries
-- Use case: SELECT * FROM task_logs WHERE task_id = 'uuid-here'
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id
ON task_logs(task_id);

-- Index on created_at for chronological ordering
-- Use case: tasks_with_latest_log view
CREATE INDEX IF NOT EXISTS idx_task_logs_created_at
ON task_logs(created_at DESC);

-- Composite index for task + time (efficient latest log retrieval)
-- Use case: Get most recent log for a task
CREATE INDEX IF NOT EXISTS idx_task_logs_task_created
ON task_logs(task_id, created_at DESC);

-- Index on status for filtering by log status
CREATE INDEX IF NOT EXISTS idx_task_logs_status
ON task_logs(status);

-- ============================================================================
-- BUSINESSES TABLE INDEXES
-- ============================================================================

-- Index on slug for lookups by slug (faster than full table scan)
-- Use case: SELECT * FROM businesses WHERE slug = 'teelixir'
CREATE INDEX IF NOT EXISTS idx_businesses_slug
ON businesses(slug);

-- Index on status for filtering active businesses
-- Use case: SELECT * FROM businesses WHERE status = 'active'
CREATE INDEX IF NOT EXISTS idx_businesses_status
ON businesses(status);

-- Index on hubspot_company_id for HubSpot sync queries
-- Use case: Check if business is synced to HubSpot
CREATE INDEX IF NOT EXISTS idx_businesses_hubspot_company_id
ON businesses(hubspot_company_id)
WHERE hubspot_company_id IS NOT NULL;

-- Index on unleashed_customer_code for Unleashed sync queries
CREATE INDEX IF NOT EXISTS idx_businesses_unleashed_customer_code
ON businesses(unleashed_customer_code)
WHERE unleashed_customer_code IS NOT NULL;

-- JSONB GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_businesses_metadata_gin
ON businesses USING GIN (metadata);

-- ============================================================================
-- AGENT TABLES INDEXES (Lower priority, add if agent tables become active)
-- ============================================================================

-- Lighthouse Audits
CREATE INDEX IF NOT EXISTS idx_lighthouse_audits_brand
ON lighthouse_audits(brand);

CREATE INDEX IF NOT EXISTS idx_lighthouse_audits_environment
ON lighthouse_audits(environment);

CREATE INDEX IF NOT EXISTS idx_lighthouse_audits_audit_timestamp
ON lighthouse_audits(audit_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_lighthouse_audits_brand_env
ON lighthouse_audits(brand, environment, audit_timestamp DESC);

-- Performance Alerts
CREATE INDEX IF NOT EXISTS idx_performance_alerts_brand
ON performance_alerts(brand);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_status
ON performance_alerts(status);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity
ON performance_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_brand_status
ON performance_alerts(brand, status);

-- Theme Changes
CREATE INDEX IF NOT EXISTS idx_theme_changes_brand
ON theme_changes(brand);

CREATE INDEX IF NOT EXISTS idx_theme_changes_deployed
ON theme_changes(deployed);

CREATE INDEX IF NOT EXISTS idx_theme_changes_created_at
ON theme_changes(created_at DESC);

-- SEO Implementation Tasks
CREATE INDEX IF NOT EXISTS idx_seo_tasks_brand
ON seo_implementation_tasks(brand);

CREATE INDEX IF NOT EXISTS idx_seo_tasks_status
ON seo_implementation_tasks(status);

CREATE INDEX IF NOT EXISTS idx_seo_tasks_priority
ON seo_implementation_tasks(priority);

-- Deployment History
CREATE INDEX IF NOT EXISTS idx_deployment_history_brand
ON deployment_history(brand);

CREATE INDEX IF NOT EXISTS idx_deployment_history_status
ON deployment_history(status);

CREATE INDEX IF NOT EXISTS idx_deployment_history_deployed_at
ON deployment_history(deployed_at DESC);

-- Agent Activity Log
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_agent_name
ON agent_activity_log(agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_brand
ON agent_activity_log(brand);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_started_at
ON agent_activity_log(started_at DESC);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage (requires pg_stat_statements)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- ROLLBACK SCRIPT (Save for emergencies)
-- ============================================================================

/*
-- To drop all indexes created by this migration:

BEGIN;

-- Integration Logs
DROP INDEX IF EXISTS idx_integration_logs_source;
DROP INDEX IF EXISTS idx_integration_logs_created_at;
DROP INDEX IF EXISTS idx_integration_logs_business_id;
DROP INDEX IF EXISTS idx_integration_logs_level;
DROP INDEX IF EXISTS idx_integration_logs_source_created;
DROP INDEX IF EXISTS idx_integration_logs_business_created;
DROP INDEX IF EXISTS idx_integration_logs_details_gin;

-- Workflow Execution Logs
DROP INDEX IF EXISTS idx_workflow_logs_status;
DROP INDEX IF EXISTS idx_workflow_logs_business_id;
DROP INDEX IF EXISTS idx_workflow_logs_workflow_name;
DROP INDEX IF EXISTS idx_workflow_logs_started_at;
DROP INDEX IF EXISTS idx_workflow_logs_finished_at;
DROP INDEX IF EXISTS idx_workflow_logs_status_finished;
DROP INDEX IF EXISTS idx_workflow_logs_data_gin;

-- API Metrics
DROP INDEX IF EXISTS idx_api_metrics_service;
DROP INDEX IF EXISTS idx_api_metrics_endpoint;
DROP INDEX IF EXISTS idx_api_metrics_success;
DROP INDEX IF EXISTS idx_api_metrics_created_at;
DROP INDEX IF EXISTS idx_api_metrics_service_endpoint;
DROP INDEX IF EXISTS idx_api_metrics_business_created;

-- Tasks
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_created_at;
DROP INDEX IF EXISTS idx_tasks_updated_at;
DROP INDEX IF EXISTS idx_tasks_status_created;
DROP INDEX IF EXISTS idx_tasks_retry_count;
DROP INDEX IF EXISTS idx_tasks_plan_gin;

-- Task Logs
DROP INDEX IF EXISTS idx_task_logs_task_id;
DROP INDEX IF EXISTS idx_task_logs_created_at;
DROP INDEX IF EXISTS idx_task_logs_task_created;
DROP INDEX IF EXISTS idx_task_logs_status;

-- Businesses
DROP INDEX IF EXISTS idx_businesses_slug;
DROP INDEX IF EXISTS idx_businesses_status;
DROP INDEX IF EXISTS idx_businesses_hubspot_company_id;
DROP INDEX IF EXISTS idx_businesses_unleashed_customer_code;
DROP INDEX IF EXISTS idx_businesses_metadata_gin;

-- Agent Tables
DROP INDEX IF EXISTS idx_lighthouse_audits_brand;
DROP INDEX IF EXISTS idx_lighthouse_audits_environment;
DROP INDEX IF EXISTS idx_lighthouse_audits_audit_timestamp;
DROP INDEX IF EXISTS idx_lighthouse_audits_brand_env;
DROP INDEX IF EXISTS idx_performance_alerts_brand;
DROP INDEX IF EXISTS idx_performance_alerts_status;
DROP INDEX IF EXISTS idx_performance_alerts_severity;
DROP INDEX IF EXISTS idx_performance_alerts_brand_status;
DROP INDEX IF EXISTS idx_theme_changes_brand;
DROP INDEX IF EXISTS idx_theme_changes_deployed;
DROP INDEX IF EXISTS idx_theme_changes_created_at;
DROP INDEX IF EXISTS idx_seo_tasks_brand;
DROP INDEX IF EXISTS idx_seo_tasks_status;
DROP INDEX IF EXISTS idx_seo_tasks_priority;
DROP INDEX IF EXISTS idx_deployment_history_brand;
DROP INDEX IF EXISTS idx_deployment_history_status;
DROP INDEX IF EXISTS idx_deployment_history_deployed_at;
DROP INDEX IF EXISTS idx_agent_activity_log_agent_name;
DROP INDEX IF EXISTS idx_agent_activity_log_brand;
DROP INDEX IF EXISTS idx_agent_activity_log_started_at;

COMMIT;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Performance Impact:
- Index creation will temporarily lock tables
- Total estimated time: 5-15 minutes
- Recommend running during low-traffic periods (e.g., Sunday 2-3 AM)

Index Maintenance:
- Indexes are automatically maintained by PostgreSQL
- Autovacuum will keep them optimized
- Monitor index usage with pg_stat_user_indexes

Next Steps After Migration:
1. Run ANALYZE on all tables to update query planner statistics
2. Monitor query performance improvements
3. Check index usage after 1 week with pg_stat_user_indexes
4. Drop unused indexes if any are identified
*/
