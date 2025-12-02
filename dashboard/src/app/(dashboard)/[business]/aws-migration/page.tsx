'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CloudIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  ServerIcon,
  CircleStackIcon,
  CubeIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface MigrationComponent {
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

interface MigrationMilestone {
  id: string;
  milestone_name: string;
  description: string | null;
  target_date: string | null;
  completed_date: string | null;
  status: string;
  related_components: string[] | null;
}

interface ActivityLog {
  id: string;
  component: string | null;
  action: string;
  message: string | null;
  actor: string | null;
  created_at: string;
}

interface MigrationData {
  summary: {
    total_components: number;
    completed: number;
    in_progress: number;
    pending: number;
    blocked: number;
    overall_progress: number;
    total_records: number;
    total_data_mb: number;
  };
  components: MigrationComponent[];
  milestones: MigrationMilestone[];
  recentActivity: ActivityLog[];
  canShutdownAws: boolean;
  byService: Record<string, MigrationComponent[]>;
  byStatus: Record<string, MigrationComponent[]>;
}

async function fetchMigrationStatus(): Promise<MigrationData> {
  const res = await fetch('/api/aws/migration');
  if (!res.ok) throw new Error('Failed to fetch migration status');
  return res.json();
}

const statusConfig = {
  completed: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  in_progress: { icon: ArrowPathIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  pending: { icon: ClockIcon, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  blocked: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  not_required: { icon: CheckCircleIcon, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  missed: { icon: ExclamationTriangleIcon, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
};

const phaseOrder = ['discovery', 'planning', 'migration', 'validation', 'cutover', 'completed'];

const serviceIcons: Record<string, typeof CloudIcon> = {
  RDS: CircleStackIcon,
  S3: CubeIcon,
  EC2: ServerIcon,
  Other: CloudIcon,
};

export default function AwsMigrationPage() {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aws-migration-full'],
    queryFn: fetchMigrationStatus,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-400">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span className="text-lg">Failed to load AWS migration data</span>
        </div>
      </div>
    );
  }

  const { summary, components, milestones, recentActivity, canShutdownAws, byService } = data;

  // Filter components
  let filteredComponents = components;
  if (selectedPhase) {
    filteredComponents = filteredComponents.filter(c => c.phase === selectedPhase);
  }
  if (selectedService) {
    filteredComponents = filteredComponents.filter(c => c.aws_service === selectedService);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CloudIcon className="h-8 w-8 text-orange-400" />
            AWS Migration Status
          </h1>
          <p className="text-gray-400 mt-1">
            Tracking migration from AWS to Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <a
            href="/home/aws-migration/docs"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4" />
            Documentation
          </a>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">{summary.overall_progress}%</div>
          <div className="text-sm text-gray-400">Overall Progress</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${summary.overall_progress}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{summary.completed}</div>
          <div className="text-sm text-gray-400">Components Migrated</div>
          <div className="mt-2 text-xs text-gray-500">
            of {summary.total_components} total
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">
            {(summary.total_records / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-400">Records to Migrate</div>
          <div className="mt-2 text-xs text-gray-500">
            {(summary.total_data_mb / 1000).toFixed(1)} GB total
          </div>
        </div>

        <div className={`rounded-lg p-4 border ${
          canShutdownAws
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-orange-500/10 border-orange-500/20'
        }`}>
          <div className={`text-lg font-bold ${canShutdownAws ? 'text-green-400' : 'text-orange-400'}`}>
            {canShutdownAws ? 'Ready' : 'Not Ready'}
          </div>
          <div className="text-sm text-gray-400">AWS Shutdown Status</div>
          <div className="mt-2 text-xs text-gray-500">
            {summary.total_components - summary.completed} components remaining
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Migration Phases</h2>
        <div className="flex items-center justify-between">
          {phaseOrder.map((phase, idx) => {
            const phaseComponents = components.filter(c => c.phase === phase);
            const isActive = phaseComponents.length > 0;
            const allComplete = phaseComponents.every(c => c.status === 'completed');
            const hasInProgress = phaseComponents.some(c => c.status === 'in_progress');

            return (
              <div key={phase} className="flex items-center">
                <button
                  onClick={() => setSelectedPhase(selectedPhase === phase ? null : phase)}
                  className={`flex flex-col items-center ${
                    selectedPhase === phase ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    allComplete && isActive
                      ? 'bg-green-500 text-white'
                      : hasInProgress
                        ? 'bg-blue-500 text-white'
                        : isActive
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-700 text-gray-500'
                  }`}>
                    {allComplete && isActive ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`mt-2 text-xs capitalize ${
                    selectedPhase === phase ? 'text-white font-medium' : 'text-gray-400'
                  }`}>
                    {phase}
                  </span>
                  {isActive && (
                    <span className="text-xs text-gray-500">
                      {phaseComponents.length} items
                    </span>
                  )}
                </button>
                {idx < phaseOrder.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    allComplete && isActive ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Components List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Migration Components
              {selectedPhase && (
                <span className="ml-2 text-sm text-gray-400">
                  ({selectedPhase})
                </span>
              )}
            </h2>
            {/* Service Filter */}
            <div className="flex items-center gap-2">
              {Object.keys(byService).map(service => {
                const ServiceIcon = serviceIcons[service] || CloudIcon;
                return (
                  <button
                    key={service}
                    onClick={() => setSelectedService(selectedService === service ? null : service)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      selectedService === service
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <ServiceIcon className="h-3 w-3" />
                    {service}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {filteredComponents.map((component) => {
              const config = statusConfig[component.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = config.icon;
              const ServiceIcon = serviceIcons[component.aws_service || 'Other'] || CloudIcon;

              return (
                <div
                  key={component.id}
                  className={`bg-gray-800 rounded-lg p-4 border ${config.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{component.component}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {component.aws_service && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                              <ServiceIcon className="h-3 w-3" />
                              {component.aws_service}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 capitalize">{component.phase}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{component.progress_percent}%</div>
                      <div className="text-xs text-gray-500">{component.status.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        component.status === 'completed'
                          ? 'bg-green-500'
                          : component.status === 'blocked'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${component.progress_percent}%` }}
                    />
                  </div>

                  {/* Details */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    {component.aws_resource && (
                      <div>
                        <span className="text-gray-500">AWS Resource:</span>
                        <span className="ml-2 text-gray-300 font-mono text-xs">{component.aws_resource}</span>
                      </div>
                    )}
                    {component.supabase_replacement && (
                      <div>
                        <span className="text-gray-500">Supabase:</span>
                        <span className="ml-2 text-gray-300">{component.supabase_replacement}</span>
                      </div>
                    )}
                    {component.record_count && (
                      <div>
                        <span className="text-gray-500">Records:</span>
                        <span className="ml-2 text-white">{component.record_count.toLocaleString()}</span>
                      </div>
                    )}
                    {component.data_size_mb && (
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 text-white">{component.data_size_mb} MB</span>
                      </div>
                    )}
                  </div>

                  {component.notes && (
                    <p className="mt-2 text-sm text-gray-400">{component.notes}</p>
                  )}

                  {component.blockers && component.blockers.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                      <XCircleIcon className="h-4 w-4" />
                      <span>Blockers: {component.blockers.join(', ')}</span>
                    </div>
                  )}

                  {component.dependencies && component.dependencies.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Dependencies: {component.dependencies.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Milestones */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Milestones</h3>
            <div className="space-y-3">
              {milestones.map((milestone, idx) => {
                const config = statusConfig[milestone.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={milestone.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`p-1 rounded-full ${config.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      {idx < milestones.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-700 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <h4 className="text-sm font-medium text-white">{milestone.milestone_name}</h4>
                      {milestone.target_date && (
                        <p className="text-xs text-gray-500">
                          Target: {new Date(milestone.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">{activity.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {activity.component && (
                      <p className="text-xs text-gray-500">{activity.component}</p>
                    )}
                    {activity.message && (
                      <p className="text-xs text-gray-400 mt-0.5">{activity.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href="/buy-organics-online/FYIC-PORTAL-ANALYSIS.md"
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                View FYIC Portal Analysis
              </a>
              <a
                href="/buy-organics-online/MIGRATION-PROGRESS.md"
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Migration Progress Doc
              </a>
              <button
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors w-full"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Migration Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
