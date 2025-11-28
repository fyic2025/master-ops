'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Building2, ChevronDown, ChevronUp, X } from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

interface PnLData {
  revenue: number
  cogs: number
  gross_profit: number
  operating_expenses: number
  net_profit: number
  gross_margin_pct: number | null
  net_margin_pct: number | null
  months?: number
  income_accounts?: { name: string; amount: number }[]
  cogs_accounts?: { name: string; amount: number }[]
  expense_accounts?: { name: string; amount: number }[]
}

interface PnLResponse {
  period: { from: string; to: string; months: number }
  businesses: Record<string, PnLData>
  consolidatedRaw: PnLData
  consolidated: PnLData
  eliminations: {
    teelixir_to_elevate: number
    elevate_to_teelixir: number
    total: number
  }
  dataSource: string
}

const BUSINESS_CONFIG: Record<string, { name: string; color: string; borderColor: string }> = {
  teelixir: { name: 'Teelixir', color: 'text-brand-teelixir', borderColor: 'border-brand-teelixir' },
  elevate: { name: 'Elevate Wholesale', color: 'text-brand-elevate', borderColor: 'border-brand-elevate' },
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

function formatDateStr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function FinanceDashboard() {
  const [data, setData] = useState<PnLResponse | null>(null)
  const [compareData, setCompareData] = useState<PnLResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEliminations, setShowEliminations] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Date range state
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'mtd') || presets[0])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const fetchPnL = async (range: DateRange): Promise<PnLResponse> => {
    const from = range.start.toISOString().split('T')[0]
    const to = range.end.toISOString().split('T')[0]

    const res = await fetch(`/api/finance/pnl?from=${from}&to=${to}`)
    if (!res.ok) throw new Error('Failed to fetch finance data')
    return res.json()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const mainData = await fetchPnL(dateRange)
      setData(mainData)

      if (compareRange) {
        const compData = await fetchPnL(compareRange)
        setCompareData(compData)
      } else {
        setCompareData(null)
      }

      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateRange, compareRange])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    // Update compare range to match new period length
    if (compareRange) {
      setCompareRange(getCompareRange(range))
    }
  }

  const handleCompareChange = (range: DateRange | null) => {
    setCompareRange(range)
  }

  // Calculate variance for comparison
  const getVariance = (current: number, previous: number) => {
    if (!previous) return null
    const pct = ((current - previous) / Math.abs(previous)) * 100
    return { value: current - previous, pct }
  }

  const businessOrder = ['teelixir', 'elevate']

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {data?.period ? `${formatDateStr(data.period.from)} - ${formatDateStr(data.period.to)}` : 'Loading...'}
            {data?.dataSource === 'supabase' && (
              <span className="ml-2 text-xs text-gray-500">(synced data)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRange}
            onChange={handleDateRangeChange}
            showCompare={true}
            compareRange={compareRange}
            onCompareChange={handleCompareChange}
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Business P&L Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {businessOrder.map((key) => {
          const config = BUSINESS_CONFIG[key]
          const biz = data?.businesses?.[key]
          const compareBiz = compareData?.businesses?.[key]

          return (
            <div
              key={key}
              className={`bg-gray-900 border-l-4 ${config.borderColor} rounded-lg p-4`}
            >
              <p className="text-sm text-gray-500">{config.name}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loading ? '...' : formatCurrency(biz?.revenue)}
              </p>
              {compareBiz && biz && (
                <div className="text-xs mt-1">
                  <span className="text-gray-500">vs {formatCurrency(compareBiz.revenue)}</span>
                  {(() => {
                    const v = getVariance(biz.revenue, compareBiz.revenue)
                    return v ? (
                      <span className={`ml-2 ${v.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {v.value >= 0 ? '+' : ''}{v.pct.toFixed(1)}%
                      </span>
                    ) : null
                  })()}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Revenue</p>

              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gross Profit</span>
                  <div className="text-right">
                    <span className="text-white">{loading ? '...' : formatCurrency(biz?.gross_profit)}</span>
                    <span className="text-gray-500 text-xs ml-1">({formatPercent(biz?.gross_margin_pct)})</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Net Profit</span>
                  <div className="text-right">
                    <span className={biz?.net_profit && biz.net_profit > 0 ? 'text-green-400' : 'text-red-400'}>
                      {loading ? '...' : formatCurrency(biz?.net_profit)}
                    </span>
                    <span className="text-gray-500 text-xs ml-1">({formatPercent(biz?.net_margin_pct)})</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Consolidated Teelixir + Elevate */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg">
        <div className="p-4 border-b border-purple-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Consolidated: Teelixir + Elevate</h2>
              <p className="text-sm text-gray-400">After intercompany eliminations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetailModal(true)}
              className="px-3 py-1.5 bg-purple-800/50 hover:bg-purple-700/50 text-purple-200 text-sm rounded-lg transition-colors"
            >
              View Detail
            </button>
            {data?.eliminations && data.eliminations.total > 0 && (
              <button
                onClick={() => setShowEliminations(!showEliminations)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-800/50 hover:bg-purple-700/50 text-purple-200 text-sm rounded-lg transition-colors"
              >
                Elim: {formatCurrency(data.eliminations.total)}
                {showEliminations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Elimination Details (collapsible) */}
        {showEliminations && data?.eliminations && (
          <div className="p-4 bg-purple-950/50 border-b border-purple-700/50">
            <h3 className="text-sm font-semibold text-purple-200 mb-3">Intercompany Eliminations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Teelixir to Elevate</p>
                <p className="text-lg font-bold text-white">{formatCurrency(data.eliminations.teelixir_to_elevate)}</p>
                <p className="text-xs text-purple-400">Product sales</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Elevate to Teelixir</p>
                <p className="text-lg font-bold text-white">{formatCurrency(data.eliminations.elevate_to_teelixir)}</p>
                <p className="text-xs text-purple-400">Services/freight</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Total Eliminated</p>
                <p className="text-lg font-bold text-orange-400">{formatCurrency(data.eliminations.total)}</p>
                <p className="text-xs text-purple-400">From revenue & COGS</p>
              </div>
            </div>
            {data.consolidatedRaw && (
              <div className="mt-3 pt-3 border-t border-purple-700/30 text-xs text-purple-300">
                <span>Before: {formatCurrency(data.consolidatedRaw.revenue)}</span>
                <span className="mx-2">→</span>
                <span>After: {formatCurrency(data.consolidated.revenue)}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-purple-300">Revenue</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : formatCurrency(data?.consolidated?.revenue)}
            </p>
            {compareData && data && (
              <div className="text-xs">
                {(() => {
                  const v = getVariance(data.consolidated.revenue, compareData.consolidated.revenue)
                  return v ? (
                    <span className={v.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {v.value >= 0 ? '+' : ''}{v.pct.toFixed(1)}%
                    </span>
                  ) : null
                })()}
              </div>
            )}
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
            <p className="text-xs text-gray-400">{formatPercent(data?.consolidated?.gross_margin_pct)}</p>
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
            <p className="text-xs text-gray-400">{formatPercent(data?.consolidated?.net_margin_pct)}</p>
          </div>
        </div>
      </section>

      {/* P&L Breakdown Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">P&L Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Business</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">COGS</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Gross Profit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">GP %</th>
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
              {/* Consolidated Row */}
              <tr className="bg-purple-900/20 font-bold">
                <td className="px-4 py-3 text-purple-300">Consolidated</td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(data?.consolidated?.revenue)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCurrency(data?.consolidated?.cogs)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(data?.consolidated?.gross_profit)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {formatPercent(data?.consolidated?.gross_margin_pct)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCurrency(data?.consolidated?.operating_expenses)}
                </td>
                <td className={`px-4 py-3 text-right ${data?.consolidated?.net_profit && data.consolidated.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(data?.consolidated?.net_profit)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {formatPercent(data?.consolidated?.net_margin_pct)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal - Side by Side P&L */}
      {showDetailModal && data && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Consolidated P&L Detail</h2>
                <p className="text-sm text-gray-400">
                  {formatDateStr(data.period.from)} to {formatDateStr(data.period.to)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Teelixir Column */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-brand-teelixir mb-4">Teelixir</h3>
                  <PnLColumn data={data.businesses.teelixir} />
                </div>

                {/* Elevate Column */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-brand-elevate mb-4">Elevate Wholesale</h3>
                  <PnLColumn data={data.businesses.elevate} />
                </div>

                {/* Consolidated Column */}
                <div className="bg-purple-900/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-300 mb-4">Consolidated</h3>
                  <PnLColumn
                    data={data.consolidated}
                    eliminations={data.eliminations}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// P&L Detail Column Component
function PnLColumn({
  data,
  eliminations
}: {
  data?: PnLData
  eliminations?: { teelixir_to_elevate: number; elevate_to_teelixir: number; total: number }
}) {
  if (!data) return <p className="text-gray-500">No data</p>

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Revenue</span>
          <span className="text-white font-medium">{formatCurrency(data.revenue)}</span>
        </div>
        {eliminations && (
          <div className="flex justify-between text-sm">
            <span className="text-orange-400">Less: Eliminations</span>
            <span className="text-orange-400">({formatCurrency(eliminations.total)})</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">COGS</span>
          <span className="text-gray-300">({formatCurrency(data.cogs)})</span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-2">
          <span className="text-gray-400">Gross Profit</span>
          <span className="text-white font-medium">{formatCurrency(data.gross_profit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Margin</span>
          <span className="text-gray-400">{formatPercent(data.gross_margin_pct)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Operating Expenses</span>
          <span className="text-gray-300">({formatCurrency(data.operating_expenses)})</span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-2">
          <span className="text-gray-400 font-medium">Net Profit</span>
          <span className={`font-bold ${data.net_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(data.net_profit)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Net Margin</span>
          <span className="text-gray-400">{formatPercent(data.net_margin_pct)}</span>
        </div>
      </div>

      {/* Account Details */}
      {data.income_accounts && data.income_accounts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm font-medium text-gray-400 mb-2">Income Accounts</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.income_accounts.slice(0, 10).map((acc, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate mr-2">{acc.name}</span>
                <span className="text-gray-400">{formatCurrency(acc.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.expense_accounts && data.expense_accounts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm font-medium text-gray-400 mb-2">Top Expenses</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.expense_accounts.slice(0, 10).map((acc, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate mr-2">{acc.name}</span>
                <span className="text-gray-400">{formatCurrency(Math.abs(acc.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
