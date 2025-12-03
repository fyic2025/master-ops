import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic to prevent build-time evaluation when env vars aren't available
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface AwsMigrationComponent {
  id: string;
  component: string;
  component_type: string;
  phase: string;
  status: string;
  progress_percent: number;
  aws_service: string | null;
  aws_resource: string | null;
  supabase_replacement: string | null;
  record_count: number | null;
  data_size_mb: number | null;
  blockers: string[] | null;
  notes: string | null;
  dependencies: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface AwsMigrationMilestone {
  id: string;
  milestone_name: string;
  description: string | null;
  target_date: string | null;
  completed_date: string | null;
  status: string;
  related_components: string[] | null;
}

export interface AwsMigrationSummary {
  total_components: number;
  completed: number;
  in_progress: number;
  pending: number;
  blocked: number;
  overall_progress: number;
  total_records: number;
  total_data_mb: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Fetch all migration components
    const { data: components, error: componentsError } = await supabase
      .from('dashboard_aws_migration')
      .select('*')
      .order('progress_percent', { ascending: false });

    if (componentsError) {
      console.error('Error fetching migration components:', componentsError);
      return NextResponse.json({ error: componentsError.message }, { status: 500 });
    }

    // Fetch milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('dashboard_aws_migration_milestones')
      .select('*')
      .order('target_date', { ascending: true });

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
    }

    // Fetch recent activity log
    const { data: recentActivity, error: activityError } = await supabase
      .from('dashboard_aws_migration_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) {
      console.error('Error fetching activity log:', activityError);
    }

    // Calculate summary
    const summary: AwsMigrationSummary = {
      total_components: components?.length || 0,
      completed: components?.filter(c => c.status === 'completed').length || 0,
      in_progress: components?.filter(c => c.status === 'in_progress').length || 0,
      pending: components?.filter(c => c.status === 'pending').length || 0,
      blocked: components?.filter(c => c.status === 'blocked').length || 0,
      overall_progress: components?.length
        ? Math.round(components.reduce((sum, c) => sum + (c.progress_percent || 0), 0) / components.length)
        : 0,
      total_records: components?.reduce((sum, c) => sum + (c.record_count || 0), 0) || 0,
      total_data_mb: components?.reduce((sum, c) => sum + (c.data_size_mb || 0), 0) || 0,
    };

    // Group by AWS service
    const byService: Record<string, AwsMigrationComponent[]> = {};
    components?.forEach(c => {
      const service = c.aws_service || 'Other';
      if (!byService[service]) byService[service] = [];
      byService[service].push(c);
    });

    // Group by status
    const byStatus: Record<string, AwsMigrationComponent[]> = {};
    components?.forEach(c => {
      if (!byStatus[c.status]) byStatus[c.status] = [];
      byStatus[c.status].push(c);
    });

    // Check for blockers
    const blockedComponents = components?.filter(c => c.blockers && c.blockers.length > 0) || [];

    // Determine if AWS can be shut down
    const canShutdownAws = summary.completed === summary.total_components;
    const criticalBlockers = blockedComponents.filter(c =>
      ['BOO Products', 'BOO Orders', 'FYIC Portal App'].includes(c.component)
    );

    return NextResponse.json({
      summary,
      components: components || [],
      milestones: milestones || [],
      recentActivity: recentActivity || [],
      byService,
      byStatus,
      blockedComponents,
      canShutdownAws,
      criticalBlockers,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in AWS migration API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AWS migration status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { action, component, phase, status, progress, notes } = body;

    if (action === 'update_progress') {
      // Update component progress
      const { data, error } = await supabase
        .from('dashboard_aws_migration')
        .update({
          phase: phase || undefined,
          status: status || undefined,
          progress_percent: progress || undefined,
          notes: notes || undefined,
          updated_at: new Date().toISOString(),
          started_at: status === 'in_progress' ? new Date().toISOString() : undefined,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined,
        })
        .eq('component', component)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log the activity
      await supabase.from('dashboard_aws_migration_log').insert({
        component,
        action: 'status_update',
        message: `Updated to ${phase}/${status} (${progress}%)`,
        actor: 'dashboard',
        details: { phase, status, progress, notes },
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'log_activity') {
      const { message, details, actor } = body;
      const { data, error } = await supabase
        .from('dashboard_aws_migration_log')
        .insert({
          component,
          action: body.activityAction || 'manual_log',
          message,
          details,
          actor: actor || 'dashboard',
        })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in AWS migration POST:', error);
    return NextResponse.json(
      { error: 'Failed to update AWS migration status' },
      { status: 500 }
    );
  }
}
