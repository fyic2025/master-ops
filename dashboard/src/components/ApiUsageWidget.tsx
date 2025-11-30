'use client'

import { useEffect, useState } from 'react'

interface ServiceUsage {
  service: string
  displayName: string
  today: number
  last7d: number
  last30d: number
  todayErrors: number
  last7dErrors: number
  last30dErrors: number
}

interface UsageData {
  services: ServiceUsage[]
  totals: {
    today: number
    last7d: number
    last30d: number
    todayErrors: number
    last7dErrors: number
    last30dErrors: number
  }
  updatedAt: string
}

export default function ApiUsageWidget() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">API Usage</h3>
        <p className="text-red-400 text-sm">Failed to load usage data</p>
      </div>
    )
  }

  if (!data || data.services.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">API Usage</h3>
        <p className="text-gray-400 text-sm">No usage data available yet</p>
      </div>
    )
  }

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toString()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">API Usage</h3>
        <span className="text-xs text-gray-500">
          Updated {new Date(data.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium text-right">Today</th>
              <th className="pb-2 font-medium text-right">7 Days</th>
              <th className="pb-2 font-medium text-right">30 Days</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {data.services.map((service) => (
              <tr key={service.service} className="border-b border-gray-800/50">
                <td className="py-2">{service.displayName}</td>
                <td className="py-2 text-right font-mono">
                  {formatNumber(service.today)}
                  {service.todayErrors > 0 && (
                    <span className="text-red-400 ml-1 text-xs">
                      ({service.todayErrors}!)
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatNumber(service.last7d)}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatNumber(service.last30d)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-white font-semibold border-t border-gray-700">
              <td className="pt-3">Total</td>
              <td className="pt-3 text-right font-mono">
                {formatNumber(data.totals.today)}
              </td>
              <td className="pt-3 text-right font-mono">
                {formatNumber(data.totals.last7d)}
              </td>
              <td className="pt-3 text-right font-mono">
                {formatNumber(data.totals.last30d)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.totals.last30dErrors > 0 && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-sm text-red-300">
          {data.totals.last30dErrors} errors in the last 30 days
        </div>
      )}
    </div>
  )
}
