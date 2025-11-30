'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Package, DollarSign, Percent, BarChart3, ChevronDown } from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

interface TrendDataPoint {
  period: string
  period_label: string
  product_type: string
  units_sold: number
  revenue: number
  gross: number
  margin: number
}

interface DistributorGroup {
  group_code: string
  group_name: string
  region: string
}

interface TrendsData {
  trends: TrendDataPoint[]
  groups: DistributorGroup[]
  productTypes: string[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getVariance(current: number, previous: number): { value: number; pct: number } | null {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return { value: current - previous, pct }
}

function VarianceDisplay({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const v = getVariance(current, previous)
  if (!v) return null

  return (
    <span className={`ml-2 text-xs ${v.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {v.value >= 0 ? '+' : ''}{v.pct.toFixed(1)}%
    </span>
  )
}

// Aggregate trends by product type for summary cards
function aggregateByProductType(trends: TrendDataPoint[]): Record<string, { units: number; gross: number; margin: number }> {
  const result: Record<string, { units: number; gross: number; margin: number }> = {}
  for (const t of trends) {
    if (!result[t.product_type]) {
      result[t.product_type] = { units: 0, gross: 0, margin: 0 }
    }
    result[t.product_type].units += t.units_sold
    result[t.product_type].gross += t.gross
    result[t.product_type].margin += t.margin
  }
  return result
}

// Aggregate by period for chart data
function aggregateByPeriod(trends: TrendDataPoint[]): { period: string; label: string; gross: number; margin: number; units: number }[] {
  const periodMap = new Map<string, { period: string; label: string; gross: number; margin: number; units: number }>()

  for (const t of trends) {
    if (!periodMap.has(t.period)) {
      periodMap.set(t.period, { period: t.period, label: t.period_label, gross: 0, margin: 0, units: 0 })
    }
    const p = periodMap.get(t.period)!
    p.gross += t.gross
    p.margin += t.margin
    p.units += t.units_sold
  }

  return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period))
}

export default function DistributorTrendsPage() {
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'last_12_months') || presets[0])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const [data, setData] = useState<TrendsData | null>(null)
  const [compareData, setCompareData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (range: DateRange, group: string, period: string): Promise<TrendsData> => {
    const from = formatLocalDate(range.start)
    const to = formatLocalDate(range.end)
    const groupParam = group !== 'all' ? `&group=${group}` : ''
    const res = await fetch(`/api/distributors/trends?from=${from}&to=${to}&period=${period}${groupParam}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mainData = await fetchData(dateRange, selectedGroup, periodType)
      setData(mainData)

      if (compareRange) {
        const compData = await fetchData(compareRange, selectedGroup, periodType)
        setCompareData(compData)
      } else {
        setCompareData(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange, compareRange, selectedGroup, periodType, fetchData])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDateChange = (range: DateRange) => {
    setDateRange(range)
  }

  const handleCompareChange = (range: DateRange | null) => {
    setCompareRange(range)
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Distributor Trends</h1>
            <p className="text-gray-400 mt-1">Loading trend data...</p>
          </div>
        </div>
        <div className="animate-pulse bg-gray-900 border border-gray-800 rounded-lg h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Distributor Trends</h1>
          <p className="text-red-400 mt-1">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Get aggregated data
  const productTotals = aggregateByProductType(data.trends)
  const compareTotals = compareData ? aggregateByProductType(compareData.trends) : null
  const periodTotals = aggregateByPeriod(data.trends)

  // Calculate overall totals
  const overallTotals = {
    units: data.trends.reduce((s, t) => s + t.units_sold, 0),
    gross: data.trends.reduce((s, t) => s + t.gross, 0),
    margin: data.trends.reduce((s, t) => s + t.margin, 0)
  }
  const compareOverallTotals = compareData ? {
    units: compareData.trends.reduce((s, t) => s + t.units_sold, 0),
    gross: compareData.trends.reduce((s, t) => s + t.gross, 0),
    margin: compareData.trends.reduce((s, t) => s + t.margin, 0)
  } : null

  // Find max gross for bar scaling
  const maxGross = Math.max(...periodTotals.map(p => p.gross), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Distributor Trends</h1>
          <p className="text-gray-400 mt-1">Product performance by period</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Type Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setPeriodType('monthly')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                periodType === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriodType('quarterly')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                periodType === 'quarterly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Quarterly
            </button>
          </div>

          {/* Distributor Group Selector */}
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="appearance-none bg-gray-800 text-white px-4 py-2 pr-10 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Distributors</option>
              {data.groups.map((g) => (
                <option key={g.group_code} value={g.group_code}>
                  {g.group_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <DateRangeSelector
            value={dateRange}
            onChange={handleDateChange}
            showCompare={true}
            compareRange={compareRange}
            onCompareChange={handleCompareChange}
          />
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Units Sold</p>
              <p className="text-2xl font-bold text-white">
                {overallTotals.units.toLocaleString()}
                <VarianceDisplay current={overallTotals.units} previous={compareOverallTotals?.units} />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Gross Sales</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(overallTotals.gross)}
                <VarianceDisplay current={overallTotals.gross} previous={compareOverallTotals?.gross} />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Margin</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(overallTotals.margin)}
                <VarianceDisplay current={overallTotals.margin} previous={compareOverallTotals?.margin} />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Percent className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Margin %</p>
              <p className="text-2xl font-bold text-white">
                {overallTotals.gross > 0 ? ((overallTotals.margin / overallTotals.gross) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Type Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          By Product Type
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Product Type</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Units Sold</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Gross Sales</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {Object.entries(productTotals)
                .sort((a, b) => b[1].gross - a[1].gross)
                .map(([type, totals]) => {
                  const marginPct = totals.gross > 0 ? (totals.margin / totals.gross) * 100 : 0
                  const compareTotalsForType = compareTotals?.[type]
                  return (
                    <tr key={type} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-white">{type}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {totals.units.toLocaleString()}
                        <VarianceDisplay current={totals.units} previous={compareTotalsForType?.units} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatCurrency(totals.gross)}
                        <VarianceDisplay current={totals.gross} previous={compareTotalsForType?.gross} />
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatCurrency(totals.margin)}
                        <VarianceDisplay current={totals.margin} previous={compareTotalsForType?.margin} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {marginPct.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period Trend Chart (Simple Bar Chart) */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          {periodType === 'monthly' ? 'Monthly' : 'Quarterly'} Performance
        </h2>
        <div className="space-y-3">
          {periodTotals.map((period) => {
            const barWidth = (period.gross / maxGross) * 100
            const marginWidth = (period.margin / maxGross) * 100
            return (
              <div key={period.period} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-400 shrink-0">{period.label}</div>
                <div className="flex-1 relative">
                  {/* Gross bar (background) */}
                  <div
                    className="h-8 bg-purple-500/30 rounded-lg"
                    style={{ width: `${barWidth}%` }}
                  />
                  {/* Margin bar (overlay) */}
                  <div
                    className="absolute top-0 left-0 h-8 bg-emerald-500/50 rounded-lg"
                    style={{ width: `${marginWidth}%` }}
                  />
                  {/* Labels */}
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs text-white font-medium">
                      {formatCurrency(period.gross)}
                    </span>
                    <span className="text-xs text-emerald-300">
                      {formatCurrency(period.margin)}
                    </span>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-500 text-right shrink-0">
                  {period.units.toLocaleString()} u
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500/30 rounded" />
            <span>Gross Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500/50 rounded" />
            <span>Margin</span>
          </div>
        </div>
      </div>

      {/* Detailed Trend Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Detailed Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Period</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Product Type</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Units</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Gross</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.trends.map((t, idx) => {
                const marginPct = t.gross > 0 ? (t.margin / t.gross) * 100 : 0
                return (
                  <tr key={idx} className="hover:bg-gray-800/50">
                    <td className="px-4 py-2 text-gray-300">{t.period_label}</td>
                    <td className="px-4 py-2 font-medium text-white">{t.product_type}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.units_sold.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium text-white">{formatCurrency(t.gross)}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{formatCurrency(t.margin)}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{marginPct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
