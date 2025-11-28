'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Clock, Bell, Users } from 'lucide-react'

interface HealthCheck {
  business: string
  integration: string
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number | null
  last_check: string
  error_message: string | null
}

interface HealthData {
  checks: Record<string, HealthCheck[]>
  summary: {
    total: number
    healthy: number
    degraded: number
    down: number
  }
  lastUpdated: string | null
}

const BUSINESS_CONFIG: Record<string, { name: string; color: string; borderColor: string }> = {
  boo: { name: 'Buy Organics Online', color: 'text-brand-boo', borderColor: 'border-brand-boo' },
  teelixir: { name: 'Teelixir', color: 'text-brand-teelixir', borderColor: 'border-brand-teelixir' },
  elevate: { name: 'Elevate Wholesale', color: 'text-brand-elevate', borderColor: 'border-brand-elevate' },
  rhf: { name: 'Red Hill Fresh', color: 'text-brand-rhf', borderColor: 'border-brand-rhf' },
}

const INTEGRATION_NAMES: Record<string, string> = {
  supabase: 'Supabase',
  bigcommerce: 'BigCommerce',
  shopify: 'Shopify',
  xero: 'Xero',
  woocommerce: 'WooCommerce',
  google_ads: 'Google Ads',
  google_merchant: 'Google Merchant',
  gsc: 'Search Console',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'degraded':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />
    case 'down':
      return <XCircle className="w-4 h-4 text-red-500" />
    default:
      return <Clock className="w-4 h-4 text-gray-500" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    healthy: 'bg-green-900/50 text-green-400 border-green-700',
    degraded: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    down: 'bg-red-900/50 text-red-400 border-red-700',
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colors[status as keyof typeof colors] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  )
}

export default function SettingsPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('Failed to fetch health data')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const businessOrder = ['boo', 'teelixir', 'elevate', 'rhf']

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Integration status & dashboard configuration
            {data?.lastUpdated && (
              <span className="ml-2 text-gray-500">
                (Last checked: {formatDate(data.lastUpdated)})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Integrations</p>
            <p className="text-2xl font-bold text-white">{data.summary.total}</p>
          </div>
          <div className="bg-gray-900 border border-green-800/50 rounded-lg p-4">
            <p className="text-sm text-green-400">Healthy</p>
            <p className="text-2xl font-bold text-green-400">{data.summary.healthy}</p>
          </div>
          <div className="bg-gray-900 border border-yellow-800/50 rounded-lg p-4">
            <p className="text-sm text-yellow-400">Degraded</p>
            <p className="text-2xl font-bold text-yellow-400">{data.summary.degraded}</p>
          </div>
          <div className="bg-gray-900 border border-red-800/50 rounded-lg p-4">
            <p className="text-sm text-red-400">Down</p>
            <p className="text-2xl font-bold text-red-400">{data.summary.down}</p>
          </div>
        </div>
      )}

      {/* Integrations by Business */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Integrations by Business</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businessOrder.map((businessKey) => {
            const config = BUSINESS_CONFIG[businessKey]
            const checks = data?.checks?.[businessKey] || []
            const healthyCount = checks.filter(c => c.status === 'healthy').length
            const allHealthy = checks.length > 0 && healthyCount === checks.length

            return (
              <div
                key={businessKey}
                className={`bg-gray-900 border-l-4 ${config.borderColor} border border-gray-800 rounded-lg overflow-hidden`}
              >
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${config.color}`}>{config.name}</h3>
                    <p className="text-xs text-gray-500">
                      {checks.length} integration{checks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {checks.length > 0 && (
                    <div className="flex items-center gap-2">
                      {allHealthy ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          All healthy
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {healthyCount}/{checks.length} healthy
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-gray-800">
                  {checks.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">No integrations configured</div>
                  ) : (
                    checks.map((check) => (
                      <div key={check.integration} className="p-3 flex items-center justify-between hover:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <StatusIcon status={check.status} />
                          <div>
                            <span className="text-white">
                              {INTEGRATION_NAMES[check.integration] || check.integration}
                            </span>
                            {check.latency_ms && (
                              <span className="ml-2 text-xs text-gray-500">
                                {check.latency_ms}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {check.error_message && (
                            <span className="text-xs text-red-400 max-w-[150px] truncate" title={check.error_message}>
                              {check.error_message}
                            </span>
                          )}
                          <StatusBadge status={check.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Other Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-400 text-sm">Notification settings coming soon</p>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Team Access</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-400 text-sm">Team management coming soon</p>
          </div>
        </section>
      </div>
    </div>
  )
}
