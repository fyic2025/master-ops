/**
 * Supabase Logger for AI Agent Team
 * Handles all logging operations to Supabase for agent activities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface LighthouseAuditLog {
  brand: 'teelixir' | 'elevate';
  environment: 'dev' | 'staging' | 'production';
  page_url: string;
  page_type?: string;
  performance_score?: number;
  accessibility_score?: number;
  best_practices_score?: number;
  seo_score?: number;
  lcp_value?: number;
  fid_value?: number;
  cls_value?: number;
  tti_value?: number;
  tbt_value?: number;
  si_value?: number;
  fcp_value?: number;
  failing_audits?: any;
  opportunities?: any;
  diagnostics?: any;
  device_type?: 'desktop' | 'mobile';
  lighthouse_version?: string;
  user_agent?: string;
  change_id?: string;
  deployment_id?: string;
}

export interface ThemeChangeLog {
  brand: 'teelixir' | 'elevate';
  agent_name: string;
  change_type: 'optimization' | 'feature' | 'fix' | 'refactor' | 'seo' | 'accessibility';
  title: string;
  description?: string;
  files_modified: string[];
  lines_added?: number;
  lines_removed?: number;
  lighthouse_before?: any;
  lighthouse_after?: any;
  performance_impact?: any;
  git_commit_hash?: string;
  git_branch?: string;
  deployed?: boolean;
  validated?: boolean;
  validation_results?: any;
}

export interface DeploymentLog {
  brand: 'teelixir' | 'elevate';
  environment: 'staging' | 'production';
  theme_version?: string;
  changes_included?: string[];
  validation_results?: any;
  all_gates_passed?: boolean;
  lighthouse_scores_before?: any;
  lighthouse_scores_after?: any;
  approval_required?: boolean;
  approved_by?: string;
  approved_at?: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  started_at?: string;
  completed_at?: string;
  deployment_duration_seconds?: number;
  post_deployment_validation?: 'pass' | 'fail';
  issues_detected?: any[];
  rollback_point?: string;
  rolled_back?: boolean;
  rolled_back_at?: string;
  rollback_reason?: string;
}

export interface PerformanceAlert {
  brand: 'teelixir' | 'elevate';
  environment: 'dev' | 'staging' | 'production';
  severity: 'critical' | 'high' | 'medium' | 'low';
  alert_type: string;
  title: string;
  description?: string;
  audit_id?: string;
  page_url?: string;
  metric_name?: string;
  previous_value?: number;
  current_value?: number;
  threshold_value?: number;
  status?: 'open' | 'investigating' | 'resolved' | 'ignored';
}

export interface AgentActivityLog {
  agent_name: string;
  brand?: 'teelixir' | 'elevate' | 'both' | 'system';
  activity_type: string;
  description?: string;
  details?: any;
  status?: 'started' | 'in_progress' | 'completed' | 'failed';
  duration_seconds?: number;
  related_change_id?: string;
  related_deployment_id?: string;
  related_audit_id?: string;
}

export class SupabaseLogger {
  private client: SupabaseClient;
  private config: SupabaseConfig;

  constructor(config?: SupabaseConfig) {
    // Load from environment or use provided config
    this.config = config || {
      url: process.env.SUPABASE_URL || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    };

    if (!this.config.url || !this.config.serviceRoleKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }

    this.client = createClient(this.config.url, this.config.serviceRoleKey);
  }

  /**
   * Log a Lighthouse audit result
   */
  async logLighthouseAudit(audit: LighthouseAuditLog): Promise<string> {
    const { data, error } = await this.client
      .from('lighthouse_audits')
      .insert([audit])
      .select('audit_id')
      .single();

    if (error) {
      console.error('Error logging Lighthouse audit:', error);
      throw error;
    }

    console.log(`✅ Logged Lighthouse audit: ${data.audit_id}`);
    return data.audit_id;
  }

  /**
   * Log a theme change
   */
  async logThemeChange(change: ThemeChangeLog): Promise<string> {
    const { data, error } = await this.client
      .from('theme_changes')
      .insert([change])
      .select('change_id')
      .single();

    if (error) {
      console.error('Error logging theme change:', error);
      throw error;
    }

    console.log(`✅ Logged theme change: ${data.change_id}`);
    return data.change_id;
  }

  /**
   * Log a deployment
   */
  async logDeployment(deployment: DeploymentLog): Promise<string> {
    const { data, error } = await this.client
      .from('deployment_history')
      .insert([deployment])
      .select('deployment_id')
      .single();

    if (error) {
      console.error('Error logging deployment:', error);
      throw error;
    }

    console.log(`✅ Logged deployment: ${data.deployment_id}`);
    return data.deployment_id;
  }

  /**
   * Update deployment status
   */
  async updateDeployment(deploymentId: string, updates: Partial<DeploymentLog>): Promise<void> {
    const { error } = await this.client
      .from('deployment_history')
      .update(updates)
      .eq('deployment_id', deploymentId);

    if (error) {
      console.error('Error updating deployment:', error);
      throw error;
    }

    console.log(`✅ Updated deployment: ${deploymentId}`);
  }

  /**
   * Create a performance alert
   */
  async createAlert(alert: PerformanceAlert): Promise<string> {
    const { data, error } = await this.client
      .from('performance_alerts')
      .insert([alert])
      .select('alert_id')
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      throw error;
    }

    console.log(`🚨 Created alert: ${data.alert_id} - ${alert.title}`);
    return data.alert_id;
  }

  /**
   * Log agent activity
   */
  async logActivity(activity: AgentActivityLog): Promise<string> {
    const { data, error } = await this.client
      .from('agent_activity_log')
      .insert([activity])
      .select('activity_id')
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }

    return data.activity_id;
  }

  /**
   * Get latest Lighthouse scores for a brand/environment
   */
  async getLatestScores(brand: string, environment: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('latest_lighthouse_scores')
      .select('*')
      .eq('brand', brand)
      .eq('environment', environment);

    if (error) {
      console.error('Error fetching latest scores:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get active performance alerts
   */
  async getActiveAlerts(brand?: string): Promise<any[]> {
    let query = this.client
      .from('active_performance_alerts')
      .select('*');

    if (brand) {
      query = query.eq('brand', brand);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get recent deployments
   */
  async getRecentDeployments(brand?: string, limit: number = 10): Promise<any[]> {
    let query = this.client
      .from('recent_deployments')
      .select('*')
      .limit(limit);

    if (brand) {
      query = query.eq('brand', brand);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deployments:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(brand: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.client
      .from('performance_trends')
      .select('*')
      .eq('brand', brand)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching trends:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get baseline CWV metrics from the last successful production deployment
   */
  async getCwvBaseline(brand: string, environment: string): Promise<{
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    tti: number | null;
    performance: number | null;
    auditId: string | null;
  }> {
    // Get the most recent audit from a successful deployment
    const { data, error } = await this.client
      .from('lighthouse_audits')
      .select('audit_id, lcp_value, fid_value, cls_value, tti_value, performance_score')
      .eq('brand', brand)
      .eq('environment', environment)
      .not('deployment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { lcp: null, fid: null, cls: null, tti: null, performance: null, auditId: null };
    }

    return {
      lcp: data.lcp_value,
      fid: data.fid_value,
      cls: data.cls_value,
      tti: data.tti_value,
      performance: data.performance_score,
      auditId: data.audit_id
    };
  }

  /**
   * Check if scores meet deployment thresholds
   */
  async checkDeploymentThresholds(auditId: string): Promise<{
    passed: boolean;
    failures: string[];
  }> {
    const { data: audit, error } = await this.client
      .from('lighthouse_audits')
      .select('*')
      .eq('audit_id', auditId)
      .single();

    if (error || !audit) {
      throw new Error('Audit not found');
    }

    const failures: string[] = [];
    const threshold = 95;

    if ((audit.performance_score || 0) < threshold) {
      failures.push(`Performance: ${audit.performance_score}/100 (min: ${threshold})`);
    }
    if ((audit.accessibility_score || 0) < threshold) {
      failures.push(`Accessibility: ${audit.accessibility_score}/100 (min: ${threshold})`);
    }
    if ((audit.best_practices_score || 0) < threshold) {
      failures.push(`Best Practices: ${audit.best_practices_score}/100 (min: ${threshold})`);
    }
    if ((audit.seo_score || 0) < threshold) {
      failures.push(`SEO: ${audit.seo_score}/100 (min: ${threshold})`);
    }

    // Check Core Web Vitals
    if ((audit.lcp_value || 0) > 2.5) {
      failures.push(`LCP: ${audit.lcp_value}s (max: 2.5s)`);
    }
    if ((audit.fid_value || 0) > 100) {
      failures.push(`FID: ${audit.fid_value}ms (max: 100ms)`);
    }
    if ((audit.cls_value || 0) > 0.1) {
      failures.push(`CLS: ${audit.cls_value} (max: 0.1)`);
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }
}

// Export singleton instance
let loggerInstance: SupabaseLogger | null = null;

export function getLogger(config?: SupabaseConfig): SupabaseLogger {
  if (!loggerInstance) {
    loggerInstance = new SupabaseLogger(config);
  }
  return loggerInstance;
}

export default SupabaseLogger;
