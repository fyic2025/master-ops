'use client'

import { useState, useEffect, useCallback } from 'react'
import { Truck, TrendingUp, Package, ChevronDown, ChevronRight, DollarSign, ShoppingCart, Percent } from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

interface Distributor {
  customer_code: string
  customer_name: string
  total_orders: number
  total_revenue: number
  gross: number
  margin: number
  first_order_date: string | null
  last_order_date: string | null
}

interface DistributorGroup {
  group_code: string
  group_name: string
  region: string
  accounts: number
  total_orders: number
  total_revenue: number
  gross: number
  margin: number
  distributors: Distributor[]
}

interface DistributorData {
  groups: DistributorGroup[]
  totals: {
    accounts: number
    total_orders: number
    total_revenue: number
    gross: number
    margin: number
  }
  oborneNational: {
    accounts: number
    total_orders: number
    total_revenue: number
    gross: number
    margin: number
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
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

export default function DistributorsPage() {
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'ytd') || presets[0])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const [data, setData] = useState<DistributorData | null>(null)
  const [compareData, setCompareData] = useState<DistributorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async (range: DateRange): Promise<DistributorData> => {
    const from = formatLocalDate(range.start)
    const to = formatLocalDate(range.end)
    const res = await fetch(`/api/distributors?from=${from}&to=${to}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mainData = await fetchData(dateRange)
      setData(mainData)

      if (compareRange) {
        const compData = await fetchData(compareRange)
        setCompareData(compData)
      } else {
        setCompareData(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange, compareRange, fetchData])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDateChange = (range: DateRange) => {
    setDateRange(range)
  }

  const handleCompareChange = (range: DateRange | null) => {
    setCompareRange(range)
  }

  const toggleGroup = (groupCode: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupCode)) {
        next.delete(groupCode)
      } else {
        next.add(groupCode)
      }
      return next
    })
  }

  // Get compare group by code
  const getCompareGroup = (groupCode: string) => {
    return compareData?.groups.find(g => g.group_code === groupCode)
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Distributors</h1>
            <p className="text-gray-400 mt-1">Loading distributor intelligence...</p>
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
          <h1 className="text-2xl font-bold text-white">Distributors</h1>
          <p className="text-red-400 mt-1">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Distributors</h1>
          <p className="text-gray-400 mt-1">Teelixir wholesale distributor intelligence</p>
        </div>
        <DateRangeSelector
          value={dateRange}
          onChange={handleDateChange}
          showCompare={true}
          compareRange={compareRange}
          onCompareChange={handleCompareChange}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Groups</p>
              <p className="text-2xl font-bold text-white">{data.groups.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Orders</p>
              <p className="text-2xl font-bold text-white">
                {data.totals.total_orders.toLocaleString()}
                <VarianceDisplay current={data.totals.total_orders} previous={compareData?.totals.total_orders} />
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
              <p className="text-sm text-gray-400">Gross</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.totals.gross)}
                <VarianceDisplay current={data.totals.gross} previous={compareData?.totals.gross} />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Margin</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.totals.margin)}
                <VarianceDisplay current={data.totals.margin} previous={compareData?.totals.margin} />
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
                {data.totals.gross > 0 ? ((data.totals.margin / data.totals.gross) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Oborne National Summary */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-orange-300">Oborne Health (National Total)</p>
              <p className="text-lg font-semibold text-white">
                {data.oborneNational.accounts} accounts across 5 states
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {formatCurrency(data.oborneNational.gross)}
              <VarianceDisplay current={data.oborneNational.gross} previous={compareData?.oborneNational.gross} />
            </p>
            <p className="text-sm text-gray-400">
              Margin: {formatCurrency(data.oborneNational.margin)} | {data.oborneNational.total_orders} orders
            </p>
          </div>
        </div>
      </div>

      {/* Distributor Groups Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Group</th>
              <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Region</th>
              <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Orders</th>
              <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Gross</th>
              <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin</th>
              <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.groups.map((group) => {
              const isExpanded = expandedGroups.has(group.group_code)
              const marginPct = group.gross > 0 ? (group.margin / group.gross) * 100 : 0
              const compareGroup = getCompareGroup(group.group_code)

              return (
                <>
                  <tr
                    key={group.group_code}
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => toggleGroup(group.group_code)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-white">{group.group_name}</span>
                        <span className="text-xs text-gray-500">({group.accounts})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        group.region === 'National'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {group.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {group.total_orders}
                      <VarianceDisplay current={group.total_orders} previous={compareGroup?.total_orders} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(group.gross)}
                      <VarianceDisplay current={group.gross} previous={compareGroup?.gross} />
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatCurrency(group.margin)}
                      <VarianceDisplay current={group.margin} previous={compareGroup?.margin} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {marginPct.toFixed(1)}%
                    </td>
                  </tr>
                  {isExpanded && group.distributors.map((dist) => {
                    const distMarginPct = dist.gross > 0 ? (dist.margin / dist.gross) * 100 : 0
                    return (
                      <tr key={dist.customer_code} className="bg-gray-800/30">
                        <td className="px-4 py-2 pl-10">
                          <div>
                            <span className="text-sm text-gray-300">{dist.customer_code}</span>
                            <p className="text-xs text-gray-500">{dist.customer_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {dist.first_order_date && (
                            <span>Since {formatDate(dist.first_order_date)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-300">{dist.total_orders}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-300">
                          {formatCurrency(dist.gross)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-emerald-400">
                          {formatCurrency(dist.margin)}
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-500">
                          {distMarginPct.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
