-- Monitoring Dashboards - SQL Queries
--
-- Ready-to-use SQL queries for building monitoring dashboards
-- Can be used with Metabase, Grafana, Retool, or custom dashboards
--
-- Usage:
-- 1. Copy desired query
-- 2. Paste into your dashboard tool
-- 3. Configure refresh interval
-- 4. Add visualizations (charts, tables, metrics)

-- =============================================================================
-- REAL-TIME SYSTEM HEALTH
-- =============================================================================

-- Dashboard 1: System Health Overview
-- Use for: Main dashboard header with key metrics
SELECT
  (SELECT COUNT(DISTINCT source) FROM integration_logs WHERE created_at > NOW() - INTERVAL '5 minutes') as active_services,
  (SELECT COUNT(*) FROM integration_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
  (SELECT COUNT(*) FROM workflow_execution_logs WHERE status = 'running') as workflows_running,
  (SELECT ROUND(AVG(duration_ms)) FROM integration_logs WHERE created_at > NOW() - INTERVAL '1 hour' AND duration_ms IS NOT NULL) as avg_response_time_ms,
  (SELECT COUNT(*) FROM businesses WHERE status = 'active') as active_businesses,
  NOW() as last_updated;

-- Dashboard 2: Service Health Status
-- Use for: Traffic light indicators for each service
SELECT
  source,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  ROUND((COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as error_rate_pct,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  MAX(created_at) as last_activity,
  CASE
    WHEN MAX(created_at) < NOW() - INTERVAL '30 minutes' THEN 'stale'
    WHEN (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) > 0.1 THEN 'critical'
    WHEN (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) > 0.05 THEN 'warning'
    ELSE 'healthy'
  END as health_status
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '15 minutes'
GROUP BY source
ORDER BY error_rate_pct DESC;

-- Dashboard 3: Error Trends (Hourly)
-- Use for: Line chart showing errors over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  source,
  COUNT(*) as error_count
FROM integration_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, source
ORDER BY hour DESC, source;

-- Dashboard 4: Response Time Distribution
-- Use for: Histogram or box plot
SELECT
  source,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50_ms,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_ms) as p75_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY duration_ms) as p90_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_ms,
  MAX(duration_ms) as max_ms
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND duration_ms IS NOT NULL
GROUP BY source
ORDER BY p95_ms DESC;

-- =============================================================================
-- BUSINESS METRICS
-- =============================================================================

-- Dashboard 5: Business Performance Scorecard
-- Use for: Business KPI cards
SELECT
  b.name as business_name,
  COUNT(il.*) as total_operations,
  ROUND((COUNT(*) FILTER (WHERE il.status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate_pct,
  COUNT(*) FILTER (WHERE il.level = 'error') as errors,
  COUNT(DISTINCT il.source) as active_integrations,
  MAX(il.created_at) as last_activity,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE b.status = 'active'
  AND (il.created_at > NOW() - INTERVAL '24 hours' OR il.created_at IS NULL)
GROUP BY b.name
ORDER BY success_rate_pct DESC;

-- Dashboard 6: Business Activity Heatmap
-- Use for: Heatmap showing activity by business and hour
SELECT
  b.name as business_name,
  EXTRACT(HOUR FROM il.created_at) as hour_of_day,
  COUNT(*) as operation_count,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms
FROM businesses b
JOIN integration_logs il ON il.business_id = b.id::text
WHERE il.created_at > NOW() - INTERVAL '7 days'
GROUP BY b.name, hour_of_day
ORDER BY b.name, hour_of_day;

-- =============================================================================
-- WORKFLOW MONITORING
-- =============================================================================

-- Dashboard 7: Workflow Execution Status
-- Use for: Table showing recent workflow runs
SELECT
  workflow_name,
  execution_id,
  status,
  started_at,
  finished_at,
  duration_ms,
  nodes_executed,
  nodes_failed,
  CASE
    WHEN status = 'error' THEN 'critical'
    WHEN status = 'running' AND started_at < NOW() - INTERVAL '1 hour' THEN 'warning'
    WHEN status = 'success' THEN 'success'
    ELSE 'info'
  END as alert_level
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 50;

-- Dashboard 8: Workflow Performance Trends
-- Use for: Line chart showing workflow duration over time
SELECT
  DATE_TRUNC('hour', started_at) as hour,
  workflow_name,
  COUNT(*) as executions,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  COUNT(*) FILTER (WHERE status = 'error') as failures
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY hour, workflow_name
ORDER BY hour DESC, workflow_name;

-- Dashboard 9: Workflow Success Rate
-- Use for: Gauge chart or percentage display
SELECT
  workflow_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate_pct,
  CASE
    WHEN (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) >= 0.95 THEN 'excellent'
    WHEN (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) >= 0.85 THEN 'good'
    WHEN (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) >= 0.70 THEN 'fair'
    ELSE 'poor'
  END as performance_rating
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY workflow_name
ORDER BY success_rate_pct DESC;

-- =============================================================================
-- API PERFORMANCE
-- =============================================================================

-- Dashboard 10: API Endpoint Performance
-- Use for: Table with sortable columns
SELECT
  service,
  endpoint,
  method,
  COUNT(*) as total_calls,
  ROUND((COUNT(*) FILTER (WHERE success = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate_pct,
  ROUND(AVG(duration_ms), 0) as avg_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_ms,
  MAX(duration_ms) as max_ms,
  AVG(response_size_bytes) / 1024 as avg_size_kb
FROM api_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service, endpoint, method
ORDER BY total_calls DESC
LIMIT 20;

-- Dashboard 11: Rate Limit Monitoring
-- Use for: Warning indicators when approaching limits
SELECT
  service,
  COUNT(*) as total_calls,
  MIN(rate_limit_remaining) as min_remaining,
  AVG(rate_limit_remaining) as avg_remaining,
  MAX(rate_limit_reset_at) as next_reset,
  CASE
    WHEN MIN(rate_limit_remaining) < 10 THEN 'critical'
    WHEN MIN(rate_limit_remaining) < 50 THEN 'warning'
    ELSE 'ok'
  END as rate_limit_status
FROM api_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND rate_limit_remaining IS NOT NULL
GROUP BY service
ORDER BY min_remaining ASC;

-- =============================================================================
-- ALERTS & INCIDENTS
-- =============================================================================

-- Dashboard 12: Active Alerts
-- Use for: Alert banner or critical issues section
SELECT
  source,
  operation,
  COUNT(*) as consecutive_errors,
  MIN(created_at) as first_error,
  MAX(created_at) as latest_error,
  jsonb_agg(DISTINCT message) as error_messages,
  CASE
    WHEN COUNT(*) >= 10 THEN 'critical'
    WHEN COUNT(*) >= 5 THEN 'high'
    ELSE 'medium'
  END as severity
FROM integration_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '15 minutes'
GROUP BY source, operation
HAVING COUNT(*) >= 3
ORDER BY consecutive_errors DESC;

-- Dashboard 13: Error Distribution by Type
-- Use for: Pie chart or donut chart
SELECT
  COALESCE(details_json->>'errorCategory', 'UNKNOWN') as error_category,
  COUNT(*) as error_count,
  ROUND((COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM integration_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '24 hours')) * 100, 2) as percentage
FROM integration_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_category
ORDER BY error_count DESC;

-- =============================================================================
-- CAPACITY & TRENDS
-- =============================================================================

-- Dashboard 14: Operation Volume Trends
-- Use for: Area chart showing volume over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_operations,
  COUNT(DISTINCT source) as active_services,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;

-- Dashboard 15: Peak Load Times
-- Use for: Bar chart showing busiest hours
SELECT
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  EXTRACT(DOW FROM created_at) as day_of_week,
  COUNT(*) as operation_count,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY hour_of_day, day_of_week
ORDER BY operation_count DESC
LIMIT 20;

-- =============================================================================
-- HEALTH TRENDS (WEEKLY)
-- =============================================================================

-- Dashboard 16: Weekly Health Summary
-- Use for: Weekly comparison table or chart
SELECT
  DATE_TRUNC('week', created_at) as week,
  source,
  COUNT(*) as total_ops,
  ROUND((COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as error_rate_pct,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '12 weeks'
GROUP BY week, source
ORDER BY week DESC, source;

-- =============================================================================
-- CUSTOM METRICS
-- =============================================================================

-- Dashboard 17: Integration Reliability Score
-- Composite score based on multiple factors
SELECT
  source,
  -- Availability (based on recent activity)
  CASE WHEN MAX(created_at) > NOW() - INTERVAL '5 minutes' THEN 100 ELSE 0 END as availability_score,
  -- Error Rate (inverted - lower is better)
  GREATEST(0, 100 - (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 1000) as error_score,
  -- Performance (based on p95 response time)
  CASE
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 500 THEN 100
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 1000 THEN 80
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 2000 THEN 60
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 5000 THEN 40
    ELSE 20
  END as performance_score,
  -- Overall composite score
  ROUND((
    (CASE WHEN MAX(created_at) > NOW() - INTERVAL '5 minutes' THEN 100 ELSE 0 END * 0.4) +
    (GREATEST(0, 100 - (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 1000) * 0.4) +
    (CASE
      WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 500 THEN 100
      WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 1000 THEN 80
      ELSE 60
    END * 0.2)
  ), 0) as overall_reliability_score
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY overall_reliability_score DESC;

-- =============================================================================
-- USAGE NOTES
-- =============================================================================

/*
DASHBOARD SETUP RECOMMENDATIONS:

1. Real-Time Dashboard (Refresh: 30s)
   - Query 1: System Health Overview (top metrics)
   - Query 2: Service Health Status (traffic lights)
   - Query 12: Active Alerts (alert banner)

2. Performance Dashboard (Refresh: 5min)
   - Query 4: Response Time Distribution (box plot)
   - Query 10: API Endpoint Performance (table)
   - Query 14: Operation Volume Trends (area chart)

3. Business Dashboard (Refresh: 15min)
   - Query 5: Business Performance Scorecard (KPI cards)
   - Query 6: Business Activity Heatmap (heatmap)
   - Query 16: Weekly Health Summary (trend chart)

4. Workflow Dashboard (Refresh: 1min)
   - Query 7: Workflow Execution Status (table)
   - Query 8: Workflow Performance Trends (line chart)
   - Query 9: Workflow Success Rate (gauge)

5. Alerts Dashboard (Refresh: 1min)
   - Query 12: Active Alerts (list)
   - Query 13: Error Distribution (pie chart)
   - Query 3: Error Trends (line chart)

TOOLS COMPATIBILITY:
- Metabase: All queries work directly
- Grafana: Use with PostgreSQL data source
- Retool: Import as SQL queries
- Tableau: Connect via PostgreSQL driver
- Custom: Use via ops-cli or direct SQL

OPTIMIZATION:
- Add indexes on frequently queried columns
- Use materialized views for expensive queries
- Cache results for non-real-time dashboards
- Partition large tables by date
*/
