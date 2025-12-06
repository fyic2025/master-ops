'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Loader2,
  Package,
  Truck,
  Server,
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react'

interface HealthStats {
  errors_24h: number
  errors_1h: number
  unresolved_errors: number
  errors_by_type: Record<string, number>
  last_error_check: string | null
  last_inventory_check: string | null
  last_shipping_check: string | null
  last_api_check: string | null
  error_result: { status: string; issues_found: number } | null
  inventory_result: { status: string; issues_found: number } | null
  shipping_result: { status: string; issues_found: number } | null
  api_result: { status: string; issues_found: number } | null
  critical_issues: number
  warning_issues: number
  total_open_issues: number
}

interface HealthConfig {
  check_type: string
  enabled: boolean
  last_run_at: string | null
  last_run_result: { status: string; issues_found: number } | null
}

interface CheckoutError {
  id: string
  error_type: string
  error_message: string
  customer_email: string | null
  shipping_address_postcode: string | null
  shipping_address_state: string | null
  cart_value: number | null
  occurred_at: string
  resolved: boolean
  resolution_notes: string | null
}

interface HealthIssue {
  id: string
  check_type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  details: Record<string, unknown>
  status: string
  detected_at: string
}

const CHECK_ICONS: Record<string, React.ElementType> = {
  error_analysis: AlertCircle,
  inventory: Package,
  shipping: Truck,
  api_health: Server,
}

const CHECK_LABELS: Record<string, string> = {
  error_analysis: 'Error Analysis',
  inventory: 'Inventory',
  shipping: 'Shipping',
  api_health: 'API Health',
}

export default function CheckoutHealthPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<HealthStats | null>(null)
  const [configs, setConfigs] = useState<HealthConfig[]>([])
  const [recentErrors, setRecentErrors] = useState<CheckoutError[]>([])
  const [recentIssues, setRecentIssues] = useState<HealthIssue[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [statsRes, errorsRes, issuesRes] = await Promise.all([
        fetch('/api/automations/boo/checkout/stats'),
        fetch('/api/automations/boo/checkout/recent?type=errors&limit=10'),
        fetch('/api/automations/boo/checkout/recent?type=issues&limit=10'),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
        setConfigs(data.configs || [])
      }

      if (errorsRes.ok) {
        const data = await errorsRes.json()
        setRecentErrors(data.errors || [])
      }

      if (issuesRes.ok) {
        const data = await issuesRes.json()
        setRecentIssues(data.issues || [])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (business !== 'boo') return
    fetchData()
  }, [business, fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const resolveError = async (id: string) => {
    try {
      const res = await fetch('/api/automations/boo/checkout/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_error', id }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to resolve error:', err)
    }
  }

  const resolveIssue = async (id: string) => {
    try {
      const res = await fetch('/api/automations/boo/checkout/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_issue', id }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to resolve issue:', err)
    }
  }

  if (business !== 'boo') {
    return (
      <div className="p-8 text-center text-gray-400">
        Checkout Health Monitor is only available for Buy Organics Online.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'critical':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBg = (status: string | undefined) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10'
      case 'warning':
        return 'bg-yellow-500/10'
      case 'critical':
        return 'bg-red-500/10'
      default:
        return 'bg-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${business}/automations`}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-green-400" />
              Checkout Health Monitor
            </h1>
            <p className="text-gray-400 mt-1">
              Proactive checkout issue detection for Buy Organics Online
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase">Errors (24h)</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.errors_24h || 0}</p>
          <p className="text-gray-600 text-xs mt-1">
            {stats?.errors_1h || 0} in last hour
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase">Unresolved</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            {stats?.unresolved_errors || 0}
          </p>
          <p className="text-gray-600 text-xs mt-1">Need attention</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase">Critical Issues</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {stats?.critical_issues || 0}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            {stats?.warning_issues || 0} warnings
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase">Total Open</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats?.total_open_issues || 0}
          </p>
          <p className="text-gray-600 text-xs mt-1">Health issues</p>
        </div>
      </div>

      {/* Health Checks Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Health Checks</h2>
        <div className="grid grid-cols-4 gap-4">
          {['error_analysis', 'inventory', 'shipping', 'api_health'].map((checkType) => {
            const config = configs.find((c) => c.check_type === checkType)
            const result = config?.last_run_result
            const Icon = CHECK_ICONS[checkType] || ShieldCheck
            const status = result?.status || 'unknown'

            return (
              <div
                key={checkType}
                className={`p-4 rounded-lg border ${getStatusBg(status)} border-gray-700`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${getStatusColor(status)}`} />
                    <span className="text-white font-medium">
                      {CHECK_LABELS[checkType]}
                    </span>
                  </div>
                  {config?.enabled ? (
                    <Eye className="w-4 h-4 text-green-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={getStatusColor(status)}>
                    {status === 'unknown' ? 'Not run' : status.toUpperCase()}
                  </span>
                  {result?.issues_found !== undefined && (
                    <span className="text-gray-400">
                      {result.issues_found} issue{result.issues_found !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(config?.last_run_at || null)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Breakdown */}
      {stats?.errors_by_type && Object.keys(stats.errors_by_type).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Errors by Type (24h)</h2>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.errors_by_type).map(([type, count]) => (
              <div key={type} className="bg-gray-800 rounded-lg px-4 py-2">
                <span className="text-gray-400">{type}:</span>{' '}
                <span className="text-white font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Issues */}
      {recentIssues.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Health Issues</h2>
          <div className="space-y-3">
            {recentIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-lg border ${
                  issue.severity === 'critical'
                    ? 'border-red-800 bg-red-900/10'
                    : issue.severity === 'warning'
                      ? 'border-yellow-800 bg-yellow-900/10'
                      : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {issue.severity === 'critical' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-white font-medium">{issue.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {CHECK_LABELS[issue.check_type] || issue.check_type}
                      </span>
                    </div>
                    {issue.description && (
                      <p className="text-gray-400 text-sm mt-1">{issue.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      Detected {formatRelativeTime(issue.detected_at)}
                    </p>
                  </div>
                  {issue.status === 'open' && (
                    <button
                      onClick={() => resolveIssue(issue.id)}
                      className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Checkout Errors</h2>
        {recentErrors.length === 0 ? (
          <p className="text-gray-500">No recent checkout errors</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((err) => (
                  <tr key={err.id} className="border-b border-gray-800/50">
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                        {err.error_type}
                      </span>
                    </td>
                    <td className="py-2 text-gray-300 max-w-xs truncate">
                      {err.error_message}
                    </td>
                    <td className="py-2 text-gray-400">{err.customer_email || '-'}</td>
                    <td className="py-2 text-gray-400">
                      {err.shipping_address_postcode
                        ? `${err.shipping_address_postcode}, ${err.shipping_address_state}`
                        : '-'}
                    </td>
                    <td className="py-2 text-gray-400">
                      {err.cart_value ? `$${err.cart_value.toFixed(0)}` : '-'}
                    </td>
                    <td className="py-2 text-gray-500">
                      {formatRelativeTime(err.occurred_at)}
                    </td>
                    <td className="py-2">
                      {err.resolved ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <button
                          onClick={() => resolveError(err.id)}
                          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
