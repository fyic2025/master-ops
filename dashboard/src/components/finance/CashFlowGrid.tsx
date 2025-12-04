'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Plus, Pencil } from 'lucide-react'
import { PeriodType } from './CashFlowPeriodSelector'
import { BusinessView } from './BusinessToggle'

interface LineItem {
  id: string
  name: string
  parent_id: string | null
  item_type: 'revenue' | 'cogs' | 'expense' | 'cash' | 'custom'
  sort_order: number
  is_system: boolean
  xero_account_code?: string
  children?: LineItem[]
}

interface PeriodData {
  period_start: string
  budget_amount: number | null
  actual_amount: number | null
  variance_amount: number | null
  variance_pct: number | null
}

interface CashFlowGridProps {
  lineItems: LineItem[]
  periods: string[] // Array of period start dates
  budgetData: Record<string, Record<string, PeriodData>> // line_item_id -> period_start -> data
  periodType: PeriodType
  businessView: BusinessView
  onBudgetChange?: (lineItemId: string, periodStart: string, value: number) => void
  onAddLineItem?: (parentId: string | null) => void
  loading?: boolean
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue)
  return value < 0 ? `(${formatted})` : formatted
}

function formatPeriodLabel(periodStart: string, periodType: PeriodType): string {
  const date = new Date(periodStart)
  switch (periodType) {
    case 'weekly':
      return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-AU', { month: 'short' })}`
    case 'monthly':
      return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `Q${quarter} ${date.getFullYear()}`
    case 'annually':
      return date.getFullYear().toString()
    default:
      return periodStart
  }
}

function buildHierarchy(items: LineItem[]): LineItem[] {
  const itemMap = new Map<string, LineItem>()
  const roots: LineItem[] = []

  // First pass: create map of all items
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Second pass: build tree structure
  items.forEach(item => {
    const node = itemMap.get(item.id)!
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!
      parent.children = parent.children || []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Sort by sort_order
  const sortItems = (items: LineItem[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order)
    items.forEach(item => {
      if (item.children?.length) sortItems(item.children)
    })
  }
  sortItems(roots)

  return roots
}

interface LineItemRowProps {
  item: LineItem
  depth: number
  periods: string[]
  periodType: PeriodType
  budgetData: Record<string, Record<string, PeriodData>>
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onBudgetChange?: (lineItemId: string, periodStart: string, value: number) => void
  onAddLineItem?: (parentId: string | null) => void
}

function LineItemRow({
  item,
  depth,
  periods,
  periodType,
  budgetData,
  expandedIds,
  onToggleExpand,
  onBudgetChange,
  onAddLineItem,
}: LineItemRowProps) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedIds.has(item.id)
  const itemData = budgetData[item.id] || {}

  // Calculate totals for parent rows
  const calculateTotals = (item: LineItem): Record<string, { budget: number; actual: number }> => {
    const totals: Record<string, { budget: number; actual: number }> = {}

    periods.forEach(period => {
      totals[period] = { budget: 0, actual: 0 }

      // Add this item's data
      const data = budgetData[item.id]?.[period]
      if (data) {
        totals[period].budget += data.budget_amount || 0
        totals[period].actual += data.actual_amount || 0
      }

      // Add children's data recursively
      if (item.children) {
        item.children.forEach(child => {
          const childTotals = calculateTotals(child)
          totals[period].budget += childTotals[period]?.budget || 0
          totals[period].actual += childTotals[period]?.actual || 0
        })
      }
    })

    return totals
  }

  const totals = hasChildren ? calculateTotals(item) : null

  const getRowColor = (type: string) => {
    switch (type) {
      case 'revenue': return 'text-green-400'
      case 'cogs': return 'text-orange-400'
      case 'expense': return 'text-red-400'
      case 'cash': return 'text-blue-400'
      default: return 'text-gray-300'
    }
  }

  return (
    <>
      <tr className={`border-b border-gray-800 hover:bg-gray-800/30 ${depth === 0 ? 'bg-gray-900/50' : ''}`}>
        {/* Line Item Name */}
        <td className="px-4 py-2 sticky left-0 bg-gray-950 z-10">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(item.id)}
                className="p-0.5 hover:bg-gray-700 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <span className="w-5" /> // Spacer
            )}
            <span className={`text-sm font-medium ${depth === 0 ? getRowColor(item.item_type) : 'text-gray-300'}`}>
              {item.name}
            </span>
            {item.item_type === 'custom' && !item.is_system && (
              <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded transition-all">
                <Pencil className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        </td>

        {/* Period Columns */}
        {periods.map((period) => {
          const data = itemData[period]
          const displayData = hasChildren && totals ? totals[period] : {
            budget: data?.budget_amount || 0,
            actual: data?.actual_amount || 0,
          }
          const variance = displayData.actual - displayData.budget
          const variancePct = displayData.budget !== 0
            ? ((displayData.actual - displayData.budget) / Math.abs(displayData.budget)) * 100
            : null

          // For revenue, positive variance is good. For expenses, negative variance is good.
          const isGoodVariance = item.item_type === 'revenue'
            ? variance >= 0
            : variance <= 0

          return (
            <td key={period} className="px-2 py-2 text-right">
              <div className="space-y-0.5">
                {/* Budget */}
                <div className="text-xs text-gray-500">
                  {hasChildren ? (
                    formatCurrency(displayData.budget)
                  ) : (
                    <input
                      type="text"
                      defaultValue={displayData.budget || ''}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''))
                        if (!isNaN(value) && onBudgetChange) {
                          onBudgetChange(item.id, period, value)
                        }
                      }}
                      className="w-full bg-transparent text-right text-xs text-gray-400 hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
                      placeholder="-"
                    />
                  )}
                </div>
                {/* Actual */}
                <div className={`text-sm font-medium ${displayData.actual ? 'text-white' : 'text-gray-600'}`}>
                  {formatCurrency(displayData.actual)}
                </div>
                {/* Variance */}
                {displayData.budget !== 0 && displayData.actual !== 0 && (
                  <div className={`text-xs ${isGoodVariance ? 'text-green-400' : 'text-red-400'}`}>
                    {variancePct !== null ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%` : ''}
                  </div>
                )}
              </div>
            </td>
          )
        })}
      </tr>

      {/* Render Children */}
      {hasChildren && isExpanded && item.children?.map((child) => (
        <LineItemRow
          key={child.id}
          item={child}
          depth={depth + 1}
          periods={periods}
          periodType={periodType}
          budgetData={budgetData}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onBudgetChange={onBudgetChange}
          onAddLineItem={onAddLineItem}
        />
      ))}

      {/* Add Line Item button for Custom Items section */}
      {item.item_type === 'custom' && item.is_system && isExpanded && onAddLineItem && (
        <tr className="border-b border-gray-800">
          <td className="px-4 py-2" style={{ paddingLeft: `${(depth + 1) * 20 + 24}px` }}>
            <button
              onClick={() => onAddLineItem(item.id)}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>
          </td>
          {periods.map((period) => (
            <td key={period} />
          ))}
        </tr>
      )}
    </>
  )
}

export default function CashFlowGrid({
  lineItems,
  periods,
  budgetData,
  periodType,
  businessView,
  onBudgetChange,
  onAddLineItem,
  loading = false,
}: CashFlowGridProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Build hierarchical structure
  const hierarchy = useMemo(() => buildHierarchy(lineItems), [lineItems])

  // Auto-expand top-level items on first render
  useMemo(() => {
    if (hierarchy.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(hierarchy.map(item => item.id)))
    }
  }, [hierarchy])

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Calculate summary rows
  const summaryData = useMemo(() => {
    const summary: Record<string, { revenue: number; cogs: number; expenses: number; net: number }> = {}

    periods.forEach(period => {
      summary[period] = { revenue: 0, cogs: 0, expenses: 0, net: 0 }

      const sumItems = (items: LineItem[]) => {
        items.forEach(item => {
          const data = budgetData[item.id]?.[period]
          const amount = data?.actual_amount || 0

          switch (item.item_type) {
            case 'revenue':
              summary[period].revenue += amount
              break
            case 'cogs':
              summary[period].cogs += amount
              break
            case 'expense':
              summary[period].expenses += amount
              break
          }

          if (item.children) sumItems(item.children)
        })
      }

      sumItems(hierarchy)
      summary[period].net = summary[period].revenue - summary[period].cogs - summary[period].expenses
    })

    return summary
  }, [hierarchy, budgetData, periods])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 sticky left-0 bg-gray-900 z-10 min-w-[200px]">
              Line Item
            </th>
            {periods.map((period) => (
              <th key={period} className="px-2 py-3 text-right text-sm font-medium text-gray-400 min-w-[100px]">
                <div>{formatPeriodLabel(period, periodType)}</div>
                <div className="text-xs text-gray-600 font-normal">Budget / Actual</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hierarchy.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              depth={0}
              periods={periods}
              periodType={periodType}
              budgetData={budgetData}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onBudgetChange={onBudgetChange}
              onAddLineItem={onAddLineItem}
            />
          ))}

          {/* Summary Rows */}
          <tr className="border-t-2 border-gray-700 bg-gray-900/80">
            <td className="px-4 py-3 text-sm font-semibold text-gray-300 sticky left-0 bg-gray-900/80 z-10">
              Net Cash Flow
            </td>
            {periods.map((period) => (
              <td key={period} className="px-2 py-3 text-right">
                <div className={`text-sm font-bold ${summaryData[period]?.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(summaryData[period]?.net)}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
