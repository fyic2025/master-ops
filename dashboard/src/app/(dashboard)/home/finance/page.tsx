'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Building2, ChevronDown, ChevronUp, X, Download } from 'lucide-react'
import FinanceTabs, { FinanceTab } from '@/components/finance/FinanceTabs'
import BusinessToggle, { BusinessView } from '@/components/finance/BusinessToggle'
import CashFlowPeriodSelector, { CashFlowPeriodConfig, getDefaultPeriodConfig } from '@/components/finance/CashFlowPeriodSelector'
import CashFlowGrid from '@/components/finance/CashFlowGrid'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

// =============================================================================
// Types
// =============================================================================

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

interface LineItem {
  id: string
  name: string
  parent_id: string | null
  item_type: 'revenue' | 'cogs' | 'expense' | 'cash' | 'custom'
  sort_order: number
  is_system: boolean
  xero_account_code?: string
}

interface PeriodData {
  period_start: string
  budget_amount: number | null
  actual_amount: number | null
  variance_amount: number | null
  variance_pct: number | null
}

// =============================================================================
// Helpers
// =============================================================================

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

function formatLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// =============================================================================
// P&L Summary Tab (existing functionality)
// =============================================================================

function PnLSummaryTab() {
  const [data, setData] = useState<PnLResponse | null>(null)
  const [compareData, setCompareData] = useState<PnLResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEliminations, setShowEliminations] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'mtd') || presets[0])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const fetchPnL = async (range: DateRange): Promise<PnLResponse> => {
    const from = formatLocalDate(range.start)
    const to = formatLocalDate(range.end)
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
    if (compareRange) {
      setCompareRange(getCompareRange(range))
    }
  }

  const getVariance = (current: number, previous: number) => {
    if (!previous) return null
    const pct = ((current - previous) / Math.abs(previous)) * 100
    return { value: current - previous, pct }
  }

  const businessOrder = ['teelixir', 'elevate']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-400">
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
            onCompareChange={setCompareRange}
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
      </div>

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
            <div key={key} className={`bg-gray-900 border-l-4 ${config.borderColor} rounded-lg p-4`}>
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

      {/* Consolidated */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg">
        <div className="p-4 border-b border-purple-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Consolidated: Teelixir + Elevate</h2>
              <p className="text-sm text-gray-400">After intercompany eliminations</p>
            </div>
          </div>
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

        {showEliminations && data?.eliminations && (
          <div className="p-4 bg-purple-950/50 border-b border-purple-700/50">
            <h3 className="text-sm font-semibold text-purple-200 mb-3">Intercompany Eliminations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Teelixir to Elevate</p>
                <p className="text-lg font-bold text-white">{formatCurrency(data.eliminations.teelixir_to_elevate)}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Elevate to Teelixir</p>
                <p className="text-lg font-bold text-white">{formatCurrency(data.eliminations.elevate_to_teelixir)}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">Total Eliminated</p>
                <p className="text-lg font-bold text-orange-400">{formatCurrency(data.eliminations.total)}</p>
              </div>
            </div>
          </div>
        )}

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
    </div>
  )
}

// =============================================================================
// Cash Flow Tab (new functionality)
// =============================================================================

function CashFlowTab() {
  const [businessView, setBusinessView] = useState<BusinessView>('consolidated')
  const [periodConfig, setPeriodConfig] = useState<CashFlowPeriodConfig>(getDefaultPeriodConfig())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [budgetData, setBudgetData] = useState<Record<string, Record<string, PeriodData>>>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        business: businessView,
        periodType: periodConfig.periodType,
        futurePeriods: periodConfig.futurePeriods.toString(),
      })

      const res = await fetch(`/api/cashflow/periods?${params}`)
      if (!res.ok) throw new Error('Failed to fetch cash flow data')

      const data = await res.json()
      setLineItems(data.lineItems || [])
      setPeriods(data.periods || [])
      setBudgetData(data.budgetData || {})
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [businessView, periodConfig])

  const handleBudgetChange = async (lineItemId: string, periodStart: string, value: number) => {
    try {
      const res = await fetch('/api/cashflow/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_key: businessView,
          line_item_id: lineItemId,
          period_type: periodConfig.periodType,
          period_start: periodStart,
          budget_amount: value,
        }),
      })

      if (!res.ok) throw new Error('Failed to save budget')

      // Update local state
      setBudgetData(prev => ({
        ...prev,
        [lineItemId]: {
          ...prev[lineItemId],
          [periodStart]: {
            ...prev[lineItemId]?.[periodStart],
            period_start: periodStart,
            budget_amount: value,
          },
        },
      }))
    } catch (err: any) {
      console.error('Error saving budget:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BusinessToggle value={businessView} onChange={setBusinessView} />
        <div className="flex items-center gap-3">
          <CashFlowPeriodSelector value={periodConfig} onChange={setPeriodConfig} />
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Cash Flow Grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <CashFlowGrid
          lineItems={lineItems}
          periods={periods}
          budgetData={budgetData}
          periodType={periodConfig.periodType}
          businessView={businessView}
          onBudgetChange={handleBudgetChange}
          loading={loading}
        />
      </div>
    </div>
  )
}

// =============================================================================
// Budgets Tab (placeholder for Phase 2)
// =============================================================================

function BudgetsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">📊</span>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Budget Entry Coming Soon</h3>
      <p className="text-gray-400 max-w-md">
        This tab will allow you to enter and manage budgets with full variance analysis.
        Use the Cash Flow tab to start entering budget values.
      </p>
    </div>
  )
}

// =============================================================================
// Scenarios Tab (placeholder for Phase 3)
// =============================================================================

function ScenariosTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">🔮</span>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Scenario Modeling Coming Soon</h3>
      <p className="text-gray-400 max-w-md">
        Create what-if scenarios, set cash available, and model different allocation strategies
        to see how they affect your cash flow projections.
      </p>
    </div>
  )
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('pnl')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-bold text-white">Finance</h1>
        <p className="text-gray-400 mt-1">Financial planning & analysis for Teelixir + Elevate</p>
      </header>

      {/* Tab Navigation */}
      <FinanceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'pnl' && <PnLSummaryTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
        {activeTab === 'budgets' && <BudgetsTab />}
        {activeTab === 'scenarios' && <ScenariosTab />}
      </div>
    </div>
  )
}
