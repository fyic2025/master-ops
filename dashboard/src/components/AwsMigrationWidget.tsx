'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CloudIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ServerIcon,
  CircleStackIcon,
  CubeIcon,
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
}

interface MigrationMilestone {
  id: string;
  milestone_name: string;
  description: string | null;
  target_date: string | null;
  status: string;
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
  canShutdownAws: boolean;
  byService: Record<string, MigrationComponent[]>;
}

async function fetchMigrationStatus(): Promise<MigrationData> {
  const res = await fetch('/api/aws/migration');
  if (!res.ok) throw new Error('Failed to fetch migration status');
  return res.json();
}

const statusConfig = {
  completed: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/10' },
  in_progress: { icon: ArrowPathIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  pending: { icon: ClockIcon, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  blocked: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
  not_required: { icon: CheckCircleIcon, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

const serviceIcons: Record<string, typeof CloudIcon> = {
  RDS: CircleStackIcon,
  S3: CubeIcon,
  EC2: ServerIcon,
  Other: CloudIcon,
};

export default function AwsMigrationWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'milestones'>('overview');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aws-migration'],
    queryFn: fetchMigrationStatus,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-red-500/20">
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>Failed to load AWS migration status</span>
        </div>
      </div>
    );
  }

  const { summary, components, milestones, canShutdownAws, byService } = data;

  const progressColor = summary.overall_progress >= 80
    ? 'bg-green-500'
    : summary.overall_progress >= 50
      ? 'bg-blue-500'
      : summary.overall_progress >= 25
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <CloudIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AWS Migration</h3>
              <p className="text-sm text-gray-400">
                {summary.completed}/{summary.total_components} components migrated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress Ring */}
            <div className="relative">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-700"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(summary.overall_progress / 100) * 125.6} 125.6`}
                  className={progressColor.replace('bg-', 'text-')}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {summary.overall_progress}%
              </span>
            </div>

            {/* Shutdown Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              canShutdownAws
                ? 'bg-green-500/10 text-green-400'
                : 'bg-orange-500/10 text-orange-400'
            }`}>
              {canShutdownAws ? 'Ready to Shutdown' : 'Migration In Progress'}
            </div>

            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-3 flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">{summary.completed} Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowPathIcon className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300">{summary.in_progress} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-300">{summary.pending} Pending</span>
          </div>
          {summary.blocked > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircleIcon className="h-4 w-4 text-red-400" />
              <span className="text-red-300">{summary.blocked} Blocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {(['overview', 'components', 'milestones'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => refetch()}
              className="px-3 py-2 text-gray-400 hover:text-white"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Data Volume */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-750 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">
                      {(summary.total_records / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-sm text-gray-400">Total Records</div>
                  </div>
                  <div className="bg-gray-750 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">
                      {(summary.total_data_mb / 1000).toFixed(1)}GB
                    </div>
                    <div className="text-sm text-gray-400">Data Volume</div>
                  </div>
                </div>

                {/* By Service */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">By AWS Service</h4>
                  <div className="space-y-2">
                    {Object.entries(byService).map(([service, items]) => {
                      const ServiceIcon = serviceIcons[service] || CloudIcon;
                      const completed = items.filter(i => i.status === 'completed').length;
                      return (
                        <div key={service} className="flex items-center justify-between bg-gray-750 rounded p-2">
                          <div className="flex items-center gap-2">
                            <ServiceIcon className="h-4 w-4 text-orange-400" />
                            <span className="text-white">{service}</span>
                          </div>
                          <span className="text-sm text-gray-400">
                            {completed}/{items.length} migrated
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Can Shutdown Notice */}
                <div className={`rounded-lg p-3 ${
                  canShutdownAws ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {canShutdownAws ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        <span className="text-green-300 font-medium">AWS can be safely shut down</span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
                        <span className="text-orange-300 font-medium">
                          {summary.total_components - summary.completed} components still need migration
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Components Tab */}
            {activeTab === 'components' && (
              <div className="space-y-2">
                {components.map((component) => {
                  const config = statusConfig[component.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={component.id}
                      className="bg-gray-750 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-white font-medium">{component.component}</span>
                          {component.aws_service && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                              {component.aws_service}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">{component.progress_percent}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${progressColor} transition-all duration-300`}
                          style={{ width: `${component.progress_percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{component.phase}</span>
                        {component.record_count && (
                          <span>{component.record_count.toLocaleString()} records</span>
                        )}
                      </div>

                      {component.notes && (
                        <p className="mt-1 text-xs text-gray-500">{component.notes}</p>
                      )}

                      {component.blockers && component.blockers.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                          <XCircleIcon className="h-3 w-3" />
                          <span>Blocked: {component.blockers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-3">
                {milestones.map((milestone, idx) => {
                  const config = statusConfig[milestone.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div key={milestone.id} className="flex gap-3">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className={`p-1 rounded-full ${config.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        {idx < milestones.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-700 my-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-medium">{milestone.milestone_name}</h4>
                          {milestone.target_date && (
                            <span className="text-xs text-gray-400">
                              {new Date(milestone.target_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-gray-400 mt-1">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
