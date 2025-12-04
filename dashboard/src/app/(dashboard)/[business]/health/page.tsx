'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'healthy' | 'degraded' | 'down' | 'unknown'

interface HealthCheck {
  id: string
  integration: string
  status: Status
  last_check: string
  business: string
  error_message?: string
  latency_ms?: number
  details?: Record<string, unknown>
}

const integrationNames: Record<string, string> = {
  bigcommerce: 'BigCommerce',
  shopify: 'Shopify',
  hubspot: 'HubSpot',
  google_ads: 'Google Ads',
  unleashed: 'Unleashed',
  xero: 'Xero',
  livechat: 'LiveChat',
  supabase: 'Supabase',
  woocommerce: 'WooCommerce',
  smartlead: 'Smartlead',
  n8n: 'n8n',
  gsc: 'Google Search Console',
  gmail: 'Gmail (GSuite)',
  google_merchant: 'Google Merchant',
}

const businessNames: Record<string, string> = {
  boo: 'BOO',
  teelixir: 'Teelixir',
  elevate: 'Elevate',
  rhf: 'Red Hill Fresh',
  global: 'Global',
}

async function fetchHealthChecks(): Promise<HealthCheck[]> {
  const { data, error } = await supabase
    .from('dashboard_health_checks')
    .select('*')
    .order('business', { ascending: true })
    .order('integration', { ascending: true })

  if (error) throw error
  return data || []
}

async function fetchRecentErrors() {
  const { data, error } = await supabase
    .from('sync_integration_logs')
    .select('*')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return []
  return data || []
}

function formatLastCheck(dateString: string): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return date.toLocaleDateString()
}

export default function HealthDashboard() {
  const { data: healthChecks, isLoading, refetch } = useQuery({
    queryKey: ['health-checks-full'],
    queryFn: fetchHealthChecks,
    refetchInterval: 60000,
  })

  const { data: recentErrors } = useQuery({
    queryKey: ['recent-errors'],
    queryFn: fetchRecentErrors,
    refetchInterval: 60000,
  })

  const healthyCount = healthChecks?.filter(h => h.status === 'healthy').length || 0
  const degradedCount = healthChecks?.filter(h => h.status === 'degraded').length || 0
  const downCount = healthChecks?.filter(h => h.status === 'down').length || 0
  const totalCount = healthChecks?.length || 0

  const overallStatus = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy'

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">System Health</h1>
          <p className="text-gray-400 mt-1">Integration monitoring and diagnostics</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Overall Status */}
      {isLoading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <Loader2 className="w-12 h-12 text-gray-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-400">Loading health checks...</p>
        </div>
      ) : (
        <div className={`${
          overallStatus === 'healthy' ? 'bg-green-500/10 border-green-500/20' :
          overallStatus === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-red-500/10 border-red-500/20'
        } border rounded-lg p-6 text-center`}>
          {overallStatus === 'healthy' ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          ) : overallStatus === 'degraded' ? (
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          )}
          <h2 className="text-xl font-semibold text-white">
            {overallStatus === 'healthy' ? 'All Systems Operational' :
             overallStatus === 'degraded' ? 'Some Systems Degraded' :
             'System Issues Detected'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {healthyCount} healthy, {degradedCount} degraded, {downCount} down of {totalCount} integrations
          </p>
        </div>
      )}

      {/* Integration Health Grid */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Integration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthChecks?.map((check) => (
            <IntegrationHealth
              key={check.id}
              name={integrationNames[check.integration] || check.integration}
              business={businessNames[check.business] || check.business}
              status={check.status}
              latency={check.latency_ms ? `${check.latency_ms}ms` : '--'}
              lastCheck={formatLastCheck(check.last_check)}
              errorMessage={check.error_message}
            />
          ))}
        </div>
      </section>

      {/* Recent Errors */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Recent Errors</h2>
        </div>
        <div className="p-4">
          {recentErrors && recentErrors.length > 0 ? (
            <div className="space-y-2">
              {recentErrors.map((err: any) => (
                <div key={err.id} className="text-sm border-l-2 border-red-500 pl-3">
                  <p className="text-white">{err.message}</p>
                  <p className="text-gray-500 text-xs">
                    {err.source} • {err.business} • {new Date(err.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No recent errors</p>
          )}
        </div>
      </section>
    </div>
  )
}

function IntegrationHealth({
  name,
  business,
  status,
  latency,
  lastCheck,
  errorMessage,
}: {
  name: string
  business: string
  status: Status
  latency: string
  lastCheck: string
  errorMessage?: string
}) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'border-green-500/20' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'border-yellow-500/20' },
    down: { icon: XCircle, color: 'text-red-500', bg: 'border-red-500/20' },
    unknown: { icon: Clock, color: 'text-gray-500', bg: 'border-gray-500/20' },
  }
  const cfg = config[status]
  const Icon = cfg.icon

  return (
    <div className={`bg-gray-900 border ${cfg.bg} rounded-lg p-4`} title={errorMessage}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${cfg.color}`} />
          <h3 className="font-medium text-white">{name}</h3>
          <span className="text-xs text-gray-500">({business})</span>
        </div>
        <span className="text-sm text-gray-500">{latency}</span>
      </div>
      {errorMessage && (
        <p className="text-sm text-red-400 mb-1">{errorMessage}</p>
      )}
      <p className="text-xs text-gray-600">Last: {lastCheck}</p>
    </div>
  )
}
