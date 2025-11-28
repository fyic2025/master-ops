'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, AlertCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'healthy' | 'degraded' | 'down' | 'unknown'

interface HealthCheck {
  id: string
  integration: string
  status: Status
  last_check: string
  business?: string
  error_message?: string
}

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  unknown: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
}

function formatLastCheck(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return 'Never'
}

async function fetchHealthChecks(): Promise<HealthCheck[]> {
  const { data, error } = await supabase
    .from('dashboard_health_checks')
    .select('*')
    .order('integration', { ascending: true })

  if (error) throw error
  return data || []
}

// Integration name mapping for display
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
}

// Default integrations to show when no data
const defaultIntegrations: HealthCheck[] = [
  { id: '1', integration: 'bigcommerce', status: 'unknown', last_check: '', business: 'boo' },
  { id: '2', integration: 'shopify', status: 'unknown', last_check: '', business: 'teelixir' },
  { id: '3', integration: 'hubspot', status: 'unknown', last_check: '' },
  { id: '4', integration: 'google_ads', status: 'unknown', last_check: '' },
  { id: '5', integration: 'unleashed', status: 'unknown', last_check: '' },
  { id: '6', integration: 'xero', status: 'unknown', last_check: '' },
  { id: '7', integration: 'livechat', status: 'unknown', last_check: '', business: 'boo' },
]

export function IntegrationStatus() {
  const { data: healthChecks, isLoading, error } = useQuery({
    queryKey: ['health-checks'],
    queryFn: fetchHealthChecks,
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  const integrations = (healthChecks && healthChecks.length > 0) ? healthChecks : defaultIntegrations

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {integrations.map((integration) => {
        const config = statusConfig[integration.status] || statusConfig.unknown
        const Icon = config.icon
        return (
          <div
            key={integration.id}
            className={`${config.bg} border border-gray-800 rounded-lg p-3`}
            title={integration.error_message || undefined}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="text-sm font-medium text-white">
                {integrationNames[integration.integration] || integration.integration}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {integration.last_check ? formatLastCheck(integration.last_check) : 'Never checked'}
            </p>
            {integration.business && (
              <span className="text-xs text-gray-600">{integration.business.toUpperCase()}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
