'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  RefreshCw, Clock, CheckCircle2, XCircle, ExternalLink, Loader2,
  AlertCircle, Play, Package, ArrowRight
} from 'lucide-react'

interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  n8nWorkflowId?: string
  lastRun?: {
    status: 'success' | 'error' | 'running'
    timestamp: string
    duration?: number
    itemsProcessed?: number
    errors?: number
  }
  enabled: boolean
}

// Define cron jobs per business
const CRON_JOBS: Record<string, CronJob[]> = {
  teelixir: [
    {
      id: 'unleashed-inventory-sync',
      name: 'Unleashed Inventory Sync',
      description: 'Syncs stock levels from Unleashed ERP to Shopify. Respects Shopify oversell settings.',
      schedule: 'Every 30 minutes',
      n8nWorkflowId: 'M48HP2aRJ48afTRn',
      enabled: true,
    },
  ],
  elevate: [
    {
      id: 'unleashed-inventory-sync',
      name: 'Unleashed Inventory Sync',
      description: 'Syncs stock levels from Unleashed ERP to Shopify.',
      schedule: 'Every 30 minutes',
      n8nWorkflowId: 'elevate-unleashed-inventory-sync',
      enabled: false,
    },
  ],
}

export default function CronJobsPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [runningJob, setRunningJob] = useState<string | null>(null)

  const cronJobs = CRON_JOBS[business] || []

  const fetchJobStatuses = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: Fetch actual job statuses from Supabase or n8n
      // For now, use the static definitions
      setJobs(cronJobs)
    } catch (err) {
      console.error('Failed to fetch job statuses:', err)
      setJobs(cronJobs)
    } finally {
      setLoading(false)
    }
  }, [business])

  useEffect(() => {
    fetchJobStatuses()
  }, [fetchJobStatuses])

  const handleRunNow = async (jobId: string) => {
    setRunningJob(jobId)
    try {
      // TODO: Trigger the job via API
      // For now, show a message
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert(`Job ${jobId} would be triggered here. Implement the API endpoint.`)
    } catch (err) {
      console.error('Failed to trigger job:', err)
    } finally {
      setRunningJob(null)
    }
  }

  if (cronJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
          <p className="text-gray-400 mt-1">Scheduled automated tasks</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No cron jobs configured for this business yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
          <p className="text-gray-400 mt-1">Scheduled automated tasks running via n8n</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/home/health"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            View in Dashboard
          </Link>
          <button
            onClick={fetchJobStatuses}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onRunNow={() => handleRunNow(job.id)}
              isRunning={runningJob === job.id}
            />
          ))}

          {/* Link to main monitoring */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-400">
                <AlertCircle className="w-5 h-5" />
                <span>Monitor all automated jobs across businesses</span>
              </div>
              <Link
                href="/home/health"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Go to Health Dashboard
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface JobCardProps {
  job: CronJob
  onRunNow: () => void
  isRunning: boolean
}

function JobCard({ job, onRunNow, isRunning }: JobCardProps) {
  const lastRun = job.lastRun
  const statusColor = !lastRun ? 'gray' :
    lastRun.status === 'success' ? 'green' :
    lastRun.status === 'error' ? 'red' : 'yellow'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`p-3 rounded-lg ${job.enabled ? 'bg-green-500/10' : 'bg-gray-800'}`}>
            <Package className={`w-6 h-6 ${job.enabled ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-white">{job.name}</h3>
              {job.enabled ? (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  <XCircle className="w-3 h-3" />
                  Inactive
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{job.description}</p>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-4 h-4" />
                {job.schedule}
              </div>
              {lastRun && (
                <div className={`flex items-center gap-1 text-${statusColor}-400`}>
                  {lastRun.status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                  {lastRun.status === 'error' && <XCircle className="w-4 h-4" />}
                  {lastRun.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Last run: {new Date(lastRun.timestamp).toLocaleString()}
                  {lastRun.itemsProcessed !== undefined && ` (${lastRun.itemsProcessed} items)`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onRunNow}
            disabled={isRunning || !job.enabled}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Now
          </button>
          {job.n8nWorkflowId && (
            <a
              href={`https://automation.growthcohq.com/workflow/${job.n8nWorkflowId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              n8n
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
