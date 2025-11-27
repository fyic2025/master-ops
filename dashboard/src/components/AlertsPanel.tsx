'use client'

import { AlertTriangle, Info, CheckCircle } from 'lucide-react'

type AlertType = 'warning' | 'info' | 'success'

interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  time: string
  action?: string
}

// This will be populated from Supabase
const alerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Google Ads Sync Delayed',
    message: 'Last sync was 2 hours ago. Check API credentials.',
    time: '2h ago',
    action: 'Check Now'
  },
  {
    id: '2',
    type: 'info',
    title: 'SEO Agent Completed',
    message: '45 products optimized in latest run.',
    time: '30m ago',
  },
  {
    id: '3',
    type: 'success',
    title: 'Product Sync Complete',
    message: 'BOO: 11,357 products synced successfully.',
    time: '5m ago',
  },
]

const alertConfig = {
  warning: { icon: AlertTriangle, color: 'text-yellow-500', border: 'border-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-500', border: 'border-blue-500/20' },
  success: { icon: CheckCircle, color: 'text-green-500', border: 'border-green-500/20' },
}

export function AlertsPanel() {
  if (alerts.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-gray-400">All systems operational</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = alertConfig[alert.type]
        const Icon = config.icon
        return (
          <div
            key={alert.id}
            className={`bg-gray-900 border ${config.border} rounded-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">{alert.title}</h4>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                {alert.action && (
                  <button className="text-sm text-blue-400 hover:text-blue-300 mt-2">
                    {alert.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
