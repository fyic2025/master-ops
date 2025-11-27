'use client'

import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'

type Status = 'healthy' | 'warning' | 'error' | 'unknown'

interface Integration {
  name: string
  status: Status
  lastSync: string
  business?: string
}

// This will be fetched from Supabase integration_logs table
const integrations: Integration[] = [
  { name: 'BigCommerce', status: 'healthy', lastSync: '5 min ago', business: 'BOO' },
  { name: 'Shopify (Teelixir)', status: 'healthy', lastSync: '10 min ago', business: 'Teelixir' },
  { name: 'Shopify (Elevate)', status: 'healthy', lastSync: '8 min ago', business: 'Elevate' },
  { name: 'HubSpot', status: 'healthy', lastSync: '2 min ago' },
  { name: 'Google Ads', status: 'warning', lastSync: '2 hours ago' },
  { name: 'Unleashed', status: 'healthy', lastSync: '15 min ago' },
  { name: 'Xero', status: 'unknown', lastSync: 'Never' },
  { name: 'LiveChat', status: 'healthy', lastSync: '1 min ago', business: 'BOO' },
]

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  unknown: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
}

export function IntegrationStatus() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {integrations.map((integration) => {
        const config = statusConfig[integration.status]
        const Icon = config.icon
        return (
          <div
            key={integration.name}
            className={`${config.bg} border border-gray-800 rounded-lg p-3`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="text-sm font-medium text-white">{integration.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{integration.lastSync}</p>
            {integration.business && (
              <span className="text-xs text-gray-600">{integration.business}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
