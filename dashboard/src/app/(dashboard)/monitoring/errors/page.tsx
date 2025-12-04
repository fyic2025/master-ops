'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, AlertCircle, Info, Clock, Globe } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

interface ErrorLog {
  id: string
  source: string
  level: string
  message: string
  details: Record<string, unknown> | null
  url: string | null
  created_at: string
}

async function fetchErrors(): Promise<ErrorLog[]> {
  const { data, error } = await supabase
    .from('dashboard_error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data || []
}

function getLevelIcon(level: string) {
  switch (level) {
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    default:
      return <Info className="w-4 h-4 text-blue-500" />
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'error':
      return 'bg-red-900/20 border-red-800'
    case 'warn':
      return 'bg-yellow-900/20 border-yellow-800'
    default:
      return 'bg-blue-900/20 border-blue-800'
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function ErrorsPage() {
  const { data: errors, isLoading, error } = useQuery({
    queryKey: ['error-logs'],
    queryFn: fetchErrors,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const stats = {
    total: errors?.length || 0,
    errors: errors?.filter(e => e.level === 'error').length || 0,
    warnings: errors?.filter(e => e.level === 'warn').length || 0,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Error Monitoring</h1>
        <p className="text-gray-400 mt-1">Recent errors and warnings from the dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total (24h)</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500">Errors</p>
          <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500">Warnings</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.warnings}</p>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-gray-500">Loading errors...</div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
            Failed to load errors: {(error as Error).message}
          </div>
        )}

        {errors?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No errors recorded. That&apos;s good!
          </div>
        )}

        {errors?.map((err) => (
          <div
            key={err.id}
            className={`border rounded-lg p-4 ${getLevelColor(err.level)}`}
          >
            <div className="flex items-start gap-3">
              {getLevelIcon(err.level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                    {err.source}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(err.created_at)}
                  </span>
                </div>
                <p className="text-white font-medium break-words">{err.message}</p>
                {err.url && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {err.url}
                  </p>
                )}
                {err.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-950 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(err.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
