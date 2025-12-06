'use client'

import { useQuery } from '@tanstack/react-query'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Package,
  ChevronRight,
  Loader2
} from 'lucide-react'

interface CriticalSync {
  id: string
  name: string
  description: string
  business: string
  last_run_at: string | null
  last_success_at: string | null
  status: 'healthy' | 'stale' | 'error' | 'unknown'
  stats?: {
    enabled?: number
    disabled?: number
    updated?: number
    skipped?: number
    errors?: number
  }
  expected_interval_hours: number
}

interface SyncsResponse {
  syncs: CriticalSync[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
  }
}

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Healthy' },
  stale: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Stale' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Error' },
  unknown: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', label: 'Never Run' },
}

function formatLastSync(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

async function fetchCriticalSyncs(): Promise<SyncsResponse> {
  const res = await fetch('/api/syncs/critical')
  if (!res.ok) throw new Error('Failed to fetch sync status')
  return res.json()
}

export function CriticalSyncsWidget() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['critical-syncs'],
    queryFn: fetchCriticalSyncs,
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-red-400 text-sm">Failed to load sync status</p>
      </div>
    )
  }

  const syncs = data?.syncs || []
  const hasIssues = syncs.some(s => s.status !== 'healthy')

  return (
    <div className={`bg-gray-900 border rounded-lg ${hasIssues ? 'border-yellow-500/50' : 'border-gray-800'}`}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Critical Syncs</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="divide-y divide-gray-800">
        {syncs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No critical syncs configured
          </div>
        ) : (
          syncs.map((sync) => {
            const cfg = statusConfig[sync.status] || statusConfig.unknown
            const Icon = cfg.icon

            return (
              <div key={sync.id} className={`p-4 ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="font-medium text-white">{sync.name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 uppercase">
                        {sync.business}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{sync.description}</p>

                    {/* Stats row */}
                    {sync.stats && (
                      <div className="flex flex-wrap gap-3 text-xs mb-2">
                        {sync.stats.enabled !== undefined && sync.stats.enabled > 0 && (
                          <span className="text-green-400">
                            +{sync.stats.enabled} enabled
                          </span>
                        )}
                        {sync.stats.disabled !== undefined && sync.stats.disabled > 0 && (
                          <span className="text-red-400">
                            -{sync.stats.disabled} disabled
                          </span>
                        )}
                        {sync.stats.updated !== undefined && sync.stats.updated > 0 && (
                          <span className="text-blue-400">
                            {sync.stats.updated} updated
                          </span>
                        )}
                        {sync.stats.skipped !== undefined && sync.stats.skipped > 0 && (
                          <span className="text-gray-500">
                            {sync.stats.skipped} skipped
                          </span>
                        )}
                        {sync.stats.errors !== undefined && sync.stats.errors > 0 && (
                          <span className="text-red-400">
                            {sync.stats.errors} errors
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Last run: <span className={cfg.color}>{formatLastSync(sync.last_success_at)}</span>
                      </span>
                      <span>
                        Expected: every {sync.expected_interval_hours}h
                      </span>
                    </div>
                  </div>

                  <a
                    href={`/${sync.business}/sync`}
                    className="p-2 rounded hover:bg-gray-800 transition-colors"
                    title="View details"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
