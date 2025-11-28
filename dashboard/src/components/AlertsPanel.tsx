'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AlertType = 'warning' | 'info' | 'success' | 'error'

interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  created_at: string
  action_url?: string
  action_label?: string
  business?: string
}

const alertConfig = {
  warning: { icon: AlertTriangle, color: 'text-yellow-500', border: 'border-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-500', border: 'border-blue-500/20' },
  success: { icon: CheckCircle, color: 'text-green-500', border: 'border-green-500/20' },
  error: { icon: AlertTriangle, color: 'text-red-500', border: 'border-red-500/20' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

async function fetchAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('dashboard_alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}

export function AlertsPanel() {
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
        <Loader2 className="w-6 h-6 text-gray-500 mx-auto animate-spin" />
        <p className="text-gray-400 mt-2">Loading alerts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-red-500/20 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-gray-400">Failed to load alerts</p>
      </div>
    )
  }

  if (!alerts || alerts.length === 0) {
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
        const config = alertConfig[alert.type] || alertConfig.info
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
                  <h4 className="text-sm font-medium text-white">
                    {alert.title}
                    {alert.business && (
                      <span className="ml-2 text-xs text-gray-500">
                        [{alert.business.toUpperCase()}]
                      </span>
                    )}
                  </h4>
                  <span className="text-xs text-gray-500">{formatTimeAgo(alert.created_at)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                {alert.action_label && alert.action_url && (
                  <a
                    href={alert.action_url}
                    className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
                  >
                    {alert.action_label} →
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
