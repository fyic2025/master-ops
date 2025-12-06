'use client'

import { useState, useEffect } from 'react'
import { Clock, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface QueueStatus {
  pending: { count: number; oldest: string | null }
  processing: { count: number }
  recentCompleted: Array<{
    id: string
    product_name: string
    action: string
    result: 'success' | 'failed'
    completed_at: string
  }>
}

interface StockQueueStatusProps {
  className?: string
  refreshInterval?: number
}

export function StockQueueStatus({
  className = '',
  refreshInterval = 30000, // 30 seconds
}: StockQueueStatusProps) {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/stock/queue')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status')
      }

      setStatus(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading queue status...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-zinc-800/50 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    )
  }

  if (!status) {
    return null
  }

  const successCount = status.recentCompleted.filter(c => c.result === 'success').length
  const failedCount = status.recentCompleted.filter(c => c.result === 'failed').length

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-400" />
          Fix Queue
        </h3>
        <button
          onClick={fetchStatus}
          className="p-1.5 rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-zinc-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{status.pending.count}</div>
          <div className="text-xs text-zinc-400">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{status.processing.count}</div>
          <div className="text-xs text-zinc-400">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{successCount}</div>
          <div className="text-xs text-zinc-400">Today</div>
        </div>
      </div>

      {/* Recent Completed */}
      {status.recentCompleted.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-400 mb-2">Recent</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {status.recentCompleted.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-sm"
              >
                {item.result === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className="truncate flex-1 text-zinc-300">
                  {item.product_name?.slice(0, 30)}...
                </span>
                <span className="text-xs text-zinc-500 shrink-0">
                  {formatTime(item.completed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {status.pending.count === 0 && status.processing.count === 0 && status.recentCompleted.length === 0 && (
        <div className="px-4 py-6 text-center text-zinc-400 text-sm">
          No queued items
        </div>
      )}

      {/* Processing note */}
      {status.pending.count > 0 && (
        <div className="px-4 py-2 bg-zinc-900/50 text-xs text-zinc-400 rounded-b-lg">
          Processor runs every 15 minutes
        </div>
      )}
    </div>
  )
}

export default StockQueueStatus
