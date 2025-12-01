'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  ChevronRight,
  X,
  Loader2,
  Play
} from 'lucide-react'

interface JobStatus {
  id: string
  job_name: string
  job_type: string
  business: string | null
  schedule: string
  description: string
  last_run_at: string | null
  last_success_at: string | null
  status: 'healthy' | 'stale' | 'failed' | 'unknown'
  expected_interval_hours: number
  error_message: string | null
  relevant_files: string[]
}

interface JobsResponse {
  jobs: JobStatus[]
  unhealthyJobs: JobStatus[]
  healthyJobs: JobStatus[]
  summary: {
    total: number
    healthy: number
    stale: number
    failed: number
    unknown: number
    healthPercentage: number
  }
  lastUpdated: string
}

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
  stale: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Stale' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  unknown: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Unknown' },
}

const businessNames: Record<string, string> = {
  boo: 'Buy Organics Online',
  teelixir: 'Teelixir',
  elevate: 'Elevate Wholesale',
  rhf: 'Red Hill Fresh',
  infrastructure: 'Infrastructure',
}

function formatLastRun(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

function generateFixCommand(job: JobStatus): string {
  const businessName = job.business ? businessNames[job.business] || job.business.toUpperCase() : 'Infrastructure'
  const files = job.relevant_files?.join('\n- ') || 'Check the codebase'

  return `Investigate and fix the "${job.job_name}" automated job.

Business: ${businessName}
Type: ${job.job_type}
Schedule: ${job.schedule}
Description: ${job.description}
Last successful run: ${job.last_success_at ? new Date(job.last_success_at).toISOString() : 'NEVER'}
Expected interval: ${job.expected_interval_hours} hours
${job.error_message ? `Error: ${job.error_message}` : ''}

Relevant files:
- ${files}

Check why this job isn't running and fix the issue.`
}

async function fetchJobStatus(): Promise<JobsResponse> {
  const res = await fetch('/api/jobs')
  if (!res.ok) throw new Error('Failed to fetch job status')
  return res.json()
}

async function refreshJobs(): Promise<JobsResponse> {
  const res = await fetch('/api/jobs', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to refresh job status')
  return res.json()
}

async function triggerSync(jobName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch('/api/jobs/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobName })
  })
  return res.json()
}

// Jobs that support manual sync via dashboard
const SYNCABLE_JOBS = ['livechat-sync', 'gmc-sync', 'gsc-issues-sync']

export function JobMonitoringWidget() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [syncingJob, setSyncingJob] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['job-status'],
    queryFn: fetchJobStatus,
    refetchInterval: 60000, // Refresh every minute
  })

  const refreshMutation = useMutation({
    mutationFn: refreshJobs,
    onSuccess: (data) => {
      queryClient.setQueryData(['job-status'], data)
    }
  })

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onMutate: (jobName) => {
      setSyncingJob(jobName)
    },
    onSuccess: () => {
      // Refresh job statuses after sync
      queryClient.invalidateQueries({ queryKey: ['job-status'] })
    },
    onSettled: () => {
      setSyncingJob(null)
    }
  })

  const handleSync = async (job: JobStatus) => {
    if (SYNCABLE_JOBS.includes(job.job_name)) {
      syncMutation.mutate(job.job_name)
    }
  }

  const handleCopy = async (job: JobStatus) => {
    const command = generateFixCommand(job)
    await navigator.clipboard.writeText(command)
    setCopiedId(job.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-red-400 text-sm">Failed to load job status</p>
      </div>
    )
  }

  const summary = data?.summary || { total: 0, healthy: 0, healthPercentage: 0 }
  const unhealthyCount = summary.total - summary.healthy
  const isAllHealthy = summary.healthPercentage === 100

  return (
    <>
      {/* Compact Widget */}
      <div
        className={`bg-gray-900 border rounded-lg p-4 cursor-pointer hover:border-gray-700 transition-colors ${
          isAllHealthy ? 'border-gray-800' : 'border-yellow-500/50'
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Automated Jobs</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              refreshMutation.mutate()
            }}
            disabled={refreshMutation.isPending}
            className="p-1 rounded hover:bg-gray-800 transition-colors"
            title="Refresh job status"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={isAllHealthy ? 'text-green-400' : 'text-yellow-400'}>
              {summary.healthPercentage}%
            </span>
            <span className="text-gray-500">
              {summary.healthy}/{summary.total} healthy
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isAllHealthy ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${summary.healthPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Summary */}
        {!isAllHealthy ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-400">
              {unhealthyCount} issue{unhealthyCount !== 1 ? 's' : ''} to resolve
            </span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>All jobs running smoothly</span>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Job Status Details</h2>
                <p className="text-sm text-gray-400">
                  {summary.healthy}/{summary.total} healthy ({summary.healthPercentage}%)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-gray-800 rounded"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Unhealthy Jobs */}
              {data?.unhealthyJobs && data.unhealthyJobs.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Issues ({data.unhealthyJobs.length})
                  </h3>
                  {data.unhealthyJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onCopy={handleCopy}
                      isCopied={copiedId === job.id}
                      onSync={handleSync}
                      isSyncing={syncingJob === job.job_name}
                      canSync={SYNCABLE_JOBS.includes(job.job_name)}
                    />
                  ))}
                </>
              )}

              {/* Toggle for healthy jobs */}
              {data?.healthyJobs && data.healthyJobs.length > 0 && (
                <>
                  <button
                    onClick={() => setShowAllJobs(!showAllJobs)}
                    className="w-full flex items-center justify-between py-2 px-3 bg-gray-800/50 hover:bg-gray-800 rounded text-sm text-gray-400"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {data.healthyJobs.length} Healthy Jobs
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAllJobs ? 'rotate-90' : ''}`} />
                  </button>

                  {showAllJobs && (
                    <div className="space-y-2 pl-2 border-l-2 border-gray-800">
                      {data.healthyJobs.map((job) => (
                        <div key={job.id} className="flex items-center gap-2 py-1 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-300">{job.job_name}</span>
                          <span className="text-gray-600">
                            ({job.business ? businessNames[job.business] : 'Infra'})
                          </span>
                          <span className="text-gray-500 ml-auto">
                            {formatLastRun(job.last_success_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function JobCard({
  job,
  onCopy,
  isCopied,
  onSync,
  isSyncing,
  canSync
}: {
  job: JobStatus
  onCopy: (job: JobStatus) => void
  isCopied: boolean
  onSync?: (job: JobStatus) => void
  isSyncing?: boolean
  canSync?: boolean
}) {
  const config = statusConfig[job.status] || statusConfig.unknown
  const Icon = config.icon

  return (
    <div className={`${config.bg} border border-gray-800 rounded-lg p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="font-medium text-white truncate">{job.job_name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
              {job.job_type}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-2">{job.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              Last run: <span className={config.color}>{formatLastRun(job.last_success_at)}</span>
            </span>
            <span>Expected: every {job.expected_interval_hours}h</span>
            {job.business && (
              <span>{businessNames[job.business] || job.business.toUpperCase()}</span>
            )}
          </div>
          {job.error_message && (
            <p className="text-xs text-red-400 mt-2">{job.error_message}</p>
          )}
        </div>
        <div className="flex gap-1">
          {canSync && onSync && (
            <button
              onClick={() => onSync(job)}
              disabled={isSyncing}
              className={`p-2 rounded transition-colors ${
                isSyncing
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title="Sync Now"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={() => onCopy(job)}
            className={`p-2 rounded transition-colors ${
              isCopied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
            title="Copy fix command for Claude Code"
          >
            {isCopied ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
