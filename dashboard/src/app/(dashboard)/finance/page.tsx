'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Building2 } from 'lucide-react'

interface FinancialSnapshot {
  business_key: string
  period_type: string
  period_start: string
  period_end: string
  revenue: number | null
  cogs: number | null
  gross_profit: number | null
  operating_expenses: number | null
  net_profit: number | null
  gross_margin_pct: number | null
  net_margin_pct: number | null
  synced_at: string
}

interface FinanceSummary {
  businesses: Record<string, FinancialSnapshot>
  totals: {
    revenue: number
    cogs: number
    gross_profit: number
    operating_expenses: number
    net_profit: number
  }
  consolidated: {
    revenue: number
    cogs: number
    gross_profit: number
    operating_expenses: number
    net_profit: number
  }
  syncedAt: string | null
}

const BUSINESS_CONFIG: Record<string, { name: string; color: string; borderColor: string }> = {
  boo: { name: 'Buy Organics Online', color: 'text-brand-boo', borderColor: 'border-brand-boo' },
  teelixir: { name: 'Teelixir', color: 'text-brand-teelixir', borderColor: 'border-brand-teelixir' },
  elevate: { name: 'Elevate Wholesale', color: 'text-brand-elevate', borderColor: 'border-brand-elevate' },
  rhf: { name: 'Red Hill Fresh', color: 'text-brand-rhf', borderColor: 'border-brand-rhf' },
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '--'
  return `${value.toFixed(1)}%`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FinanceDashboard() {
  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/summary')
      if (!res.ok) throw new Error('Failed to fetch finance data')
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

  const businessOrder = ['teelixir', 'elevate', 'boo', 'rhf']

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
          <p className="text-gray-400 mt-1">
            MTD Revenue from Xero
            {data?.syncedAt && (
              <span className="ml-2 text-gray-500">
                (Synced: {formatDate(data.syncedAt)} {formatTime(data.syncedAt)})
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

      {/* Business P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {businessOrder.map((key) => {
          const config = BUSINESS_CONFIG[key]
          const biz = data?.businesses?.[key]
          const revenue = biz?.revenue
          const netProfit = biz?.net_profit

          return (
            <div
              key={key}
              className={`bg-gray-900 border-l-4 ${config.borderColor} rounded-lg p-4`}
            >
              <p className="text-sm text-gray-500">{config.name}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loading ? '...' : formatCurrency(revenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">MTD Revenue</p>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Net Profit</span>
                  <span className={netProfit && netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                    {loading ? '...' : formatCurrency(netProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Net Margin</span>
                  <span className="text-gray-300">
                    {loading ? '...' : formatPercent(biz?.net_margin_pct)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* All Businesses Total */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">All Businesses Total</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-xl font-bold text-white">
              {loading ? '...' : formatCurrency(data?.totals?.revenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">COGS</p>
            <p className="text-xl font-bold text-gray-400">
              {loading ? '...' : formatCurrency(data?.totals?.cogs)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Gross Profit</p>
            <p className="text-xl font-bold text-white">
              {loading ? '...' : formatCurrency(data?.totals?.gross_profit)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-gray-400">
              {loading ? '...' : formatCurrency(data?.totals?.operating_expenses)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Net Profit</p>
            <p className={`text-xl font-bold ${data?.totals?.net_profit && data.totals.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loading ? '...' : formatCurrency(data?.totals?.net_profit)}
            </p>
          </div>
        </div>
      </section>

      {/* Consolidated Teelixir + Elevate */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg">
        <div className="p-4 border-b border-purple-700/50 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Consolidated: Teelixir + Elevate</h2>
            <p className="text-sm text-gray-400">Combined wholesale operations</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-purple-300">Revenue</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : formatCurrency(data?.consolidated?.revenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-300">COGS</p>
            <p className="text-xl font-bold text-gray-400">
              {loading ? '...' : formatCurrency(data?.consolidated?.cogs)}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-300">Gross Profit</p>
            <p className="text-xl font-bold text-white">
              {loading ? '...' : formatCurrency(data?.consolidated?.gross_profit)}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-300">Expenses</p>
            <p className="text-xl font-bold text-gray-400">
              {loading ? '...' : formatCurrency(data?.consolidated?.operating_expenses)}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-300">Net Profit</p>
            <p className={`text-2xl font-bold ${data?.consolidated?.net_profit && data.consolidated.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loading ? '...' : formatCurrency(data?.consolidated?.net_profit)}
            </p>
          </div>
        </div>
      </section>

      {/* P&L Breakdown Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">MTD P&L Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Business</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">COGS</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Gross Profit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Gross %</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">OpEx</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Net Profit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Net %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {businessOrder.map((key) => {
                const config = BUSINESS_CONFIG[key]
                const biz = data?.businesses?.[key]
                return (
                  <tr key={key} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className={`font-medium ${config.color}`}>{config.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      {formatCurrency(biz?.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(biz?.cogs)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatCurrency(biz?.gross_profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatPercent(biz?.gross_margin_pct)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(biz?.operating_expenses)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${biz?.net_profit && biz.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(biz?.net_profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatPercent(biz?.net_margin_pct)}
                    </td>
                  </tr>
                )
              })}
              {/* Totals Row */}
              <tr className="bg-gray-800 font-bold">
                <td className="px-4 py-3 text-white">TOTAL</td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(data?.totals?.revenue)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCurrency(data?.totals?.cogs)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(data?.totals?.gross_profit)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {data?.totals?.revenue ? formatPercent((data.totals.gross_profit / data.totals.revenue) * 100) : '--'}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCurrency(data?.totals?.operating_expenses)}
                </td>
                <td className={`px-4 py-3 text-right ${data?.totals?.net_profit && data.totals.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(data?.totals?.net_profit)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {data?.totals?.revenue ? formatPercent((data.totals.net_profit / data.totals.revenue) * 100) : '--'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
