'use client'

import { TrendingUp, Loader2 } from 'lucide-react'

interface FunnelData {
  category: string
  total: number
  pending: number
  sent: number
  active: number
  expired: number
  login_rate_pct: number
}

interface FunnelVisualizationProps {
  funnel: FunnelData[]
  isLoading: boolean
}

export function FunnelVisualization({ funnel, isLoading }: FunnelVisualizationProps) {
  // Get the "all" category for main funnel display
  const allCategory = funnel.find(f => f.category === 'all') || {
    total: 0, pending: 0, sent: 0, active: 0, expired: 0, login_rate_pct: 0
  }

  const stages = [
    { key: 'pending', label: 'Pending', color: 'bg-yellow-500', value: allCategory.pending },
    { key: 'sent', label: 'Outreach Sent', color: 'bg-blue-500', value: allCategory.sent },
    { key: 'active', label: 'Logged In', color: 'bg-green-500', value: allCategory.active },
    { key: 'expired', label: 'Expired', color: 'bg-gray-500', value: allCategory.expired },
  ]

  const maxValue = Math.max(...stages.map(s => s.value), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Conversion Funnel</h2>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-green-400">{allCategory.login_rate_pct}%</span>
          <span className="text-gray-500">login rate</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="p-4">
          {/* Funnel Bars */}
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{stage.label}</span>
                  <span className="text-white font-medium">{stage.value}</span>
                </div>
                <div className="h-8 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${(stage.value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-3">By Category</h3>
            <div className="grid grid-cols-2 gap-4">
              {funnel
                .filter(f => f.category !== 'all' && f.category !== null)
                .map(cat => (
                  <div key={cat.category} className="bg-gray-800/50 rounded p-3">
                    <p className="text-white font-medium capitalize">{cat.category}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Sent: </span>
                        <span className="text-white">{cat.sent}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Active: </span>
                        <span className="text-green-400">{cat.active}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Login Rate: </span>
                        <span className="text-green-400">{cat.login_rate_pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
