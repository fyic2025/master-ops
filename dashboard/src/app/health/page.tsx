import { Activity, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'

export default function HealthDashboard() {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">System Health</h1>
          <p className="text-gray-400 mt-1">Integration monitoring and diagnostics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4" />
          Run Health Check
        </button>
      </header>

      {/* Overall Status */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-white">All Systems Operational</h2>
        <p className="text-gray-400 text-sm mt-1">Last checked: --</p>
      </div>

      {/* Integration Health Grid */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Integration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationHealth
            name="Supabase"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="Database connection"
          />
          <IntegrationHealth
            name="BigCommerce (BOO)"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="REST API v3"
          />
          <IntegrationHealth
            name="Shopify (Teelixir)"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="GraphQL Admin API"
          />
          <IntegrationHealth
            name="Shopify (Elevate)"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="GraphQL Admin API"
          />
          <IntegrationHealth
            name="HubSpot"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="CRM API"
          />
          <IntegrationHealth
            name="Google Ads"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="3 accounts"
          />
          <IntegrationHealth
            name="Unleashed"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="Inventory API"
          />
          <IntegrationHealth
            name="Xero"
            status="unknown"
            latency="--"
            lastCheck="--"
            details="Accounting API"
          />
        </div>
      </section>

      {/* Recent Errors */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Recent Errors</h2>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm">No recent errors</p>
        </div>
      </section>
    </div>
  )
}

function IntegrationHealth({
  name,
  status,
  latency,
  lastCheck,
  details,
}: {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency: string
  lastCheck: string
  details: string
}) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'border-green-500/20' },
    degraded: { icon: Clock, color: 'text-yellow-500', bg: 'border-yellow-500/20' },
    down: { icon: XCircle, color: 'text-red-500', bg: 'border-red-500/20' },
    unknown: { icon: Clock, color: 'text-gray-500', bg: 'border-gray-500/20' },
  }
  const cfg = config[status]
  const Icon = cfg.icon

  return (
    <div className={`bg-gray-900 border ${cfg.bg} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${cfg.color}`} />
          <h3 className="font-medium text-white">{name}</h3>
        </div>
        <span className="text-sm text-gray-500">{latency}</span>
      </div>
      <p className="text-sm text-gray-500">{details}</p>
      <p className="text-xs text-gray-600 mt-2">Last: {lastCheck}</p>
    </div>
  )
}
