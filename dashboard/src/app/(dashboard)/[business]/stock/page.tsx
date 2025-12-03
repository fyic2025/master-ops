'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Truck,
  Building2,
  Calendar
} from 'lucide-react'

// Date range options
const DATE_RANGES = [
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 3 months', value: '3m', days: 90 },
  { label: 'Last 6 months', value: '6m', days: 180 },
  { label: 'Last 12 months', value: '12m', days: 365 },
  { label: 'All time', value: 'all', days: 9999 },
]

interface DispatchProduct {
  id: number
  product_id: number
  product_name: string
  sku: string
  supplier_name: string
  slow_order_count: number
  fast_order_count: number
  total_orders: number
  orders_per_week: number
  avg_dispatch_days: number
  recommended_stock: number
  weeks_buffer: number
  review_status: 'pending' | 'reviewed' | 'resolved'
  review_notes: string | null
  analysis_date: string
}

interface DispatchData {
  products: DispatchProduct[]
  suppliers: string[]
  summary: {
    total_products: number
    needs_review: number
    by_supplier: { name: string; count: number; total_orders: number }[]
  }
  analysis_period: {
    weeks: number
    orders_analyzed: number
    analysis_date: string | null
  }
}

async function fetchDispatchIssues(supplier: string): Promise<DispatchData> {
  const params = new URLSearchParams()
  if (supplier !== 'all') params.set('supplier', supplier)

  const res = await fetch(`/api/dispatch-issues?${params}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function updateProductStatus(id: number, status: string, notes?: string) {
  const res = await fetch('/api/dispatch-issues', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, review_status: status, review_notes: notes }),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
    reviewed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock },
    resolved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  }
  const c = config[status] || config.pending
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function SupplierCard({ name, count, totalOrders, isSelected, onClick }: {
  name: string
  count: number
  totalOrders: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all text-left ${
        isSelected
          ? 'bg-blue-500/20 border-blue-500'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-white text-sm truncate">{name}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{count} products</span>
        <span className="text-gray-500">{totalOrders} orders</span>
      </div>
    </button>
  )
}

export default function StockPage() {
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  const [dateRange, setDateRange] = useState('3m') // Default to 3 months
  const [sortColumn, setSortColumn] = useState<string>('recommended_stock')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch-issues', selectedSupplier, dateRange],
    queryFn: () => fetchDispatchIssues(selectedSupplier),
  })

  const sortedProducts = useMemo(() => {
    if (!data?.products) return []
    return [...data.products].sort((a, b) => {
      const aVal = a[sortColumn as keyof DispatchProduct]
      const bVal = b[sortColumn as keyof DispatchProduct]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [data?.products, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateProductStatus(id, newStatus)
    refetch()
  }

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {label}
      {sortColumn === column && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  )

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load dispatch data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="w-7 h-7" />
            Dispatch Issues
          </h1>
          <p className="text-gray-400 mt-1">
            Products with slow dispatch - recommended stock levels to avoid delays
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-white text-sm border-none outline-none cursor-pointer"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value} className="bg-gray-800">
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analysis info */}
      {data?.analysis_period && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            Analysis: <span className="text-white">{data.analysis_period.orders_analyzed.toLocaleString()} orders</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Period: <span className="text-white">{data.analysis_period.weeks} weeks</span>
          </span>
          {data.analysis_period.analysis_date && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                Date: <span className="text-white">{new Date(data.analysis_period.analysis_date).toLocaleDateString()}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Supplier filter cards */}
      {data?.summary?.by_supplier && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedSupplier('all')}
            className={`p-4 rounded-lg border transition-all text-left ${
              selectedSupplier === 'all'
                ? 'bg-blue-500/20 border-blue-500'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-white text-sm">All Suppliers</span>
            </div>
            <div className="text-xs text-gray-400">
              {data.summary.total_products} products
            </div>
          </button>
          {data.summary.by_supplier.map(s => (
            <SupplierCard
              key={s.name}
              name={s.name}
              count={s.count}
              totalOrders={s.total_orders}
              isSelected={selectedSupplier === s.name}
              onClick={() => setSelectedSupplier(s.name)}
            />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Products</p>
            <p className="text-2xl font-bold text-white">{sortedProducts.length}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">Needs Review</p>
            <p className="text-2xl font-bold text-yellow-400">
              {sortedProducts.filter(p => p.review_status === 'pending').length}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Weekly Orders</p>
            <p className="text-2xl font-bold text-white">
              {Math.round(sortedProducts.reduce((sum, p) => sum + p.orders_per_week, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 text-gray-400 text-sm">
              <tr>
                <th className="text-left p-4 font-medium">
                  <SortHeader column="product_name" label="Product" />
                </th>
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">
                  <SortHeader column="supplier_name" label="Supplier" />
                </th>
                <th className="text-right p-4 font-medium">
                  <SortHeader column="orders_per_week" label="Orders/Week" />
                </th>
                <th className="text-right p-4 font-medium">
                  <SortHeader column="avg_dispatch_days" label="Avg Delay" />
                </th>
                <th className="text-right p-4 font-medium">
                  <SortHeader column="recommended_stock" label="Keep in Stock" />
                </th>
                <th className="text-center p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No dispatch issues found
                  </td>
                </tr>
              ) : (
                sortedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-800/30">
                    <td className="p-4">
                      <div className="max-w-xs">
                        <p className="text-white text-sm font-medium truncate" title={product.product_name}>
                          {product.product_name}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm font-mono">
                      {product.sku}
                    </td>
                    <td className="p-4 text-gray-300 text-sm">
                      {product.supplier_name}
                    </td>
                    <td className="p-4 text-right text-white font-medium">
                      {product.orders_per_week}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${
                        product.avg_dispatch_days > 7 ? 'text-red-400' :
                        product.avg_dispatch_days > 5 ? 'text-yellow-400' :
                        'text-gray-300'
                      }`}>
                        {product.avg_dispatch_days} days
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-bold text-green-400">
                        {product.recommended_stock}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">units</span>
                    </td>
                    <td className="p-4 text-center">
                      <select
                        value={product.review_status}
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 flex items-center gap-4">
        <span>
          <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-1"></span>
          Delay &gt; 7 days
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
          Delay 5-7 days
        </span>
        <span className="ml-auto">
          Stock recommendation = Orders/week × {1.5}× buffer (based on dispatch delay)
        </span>
      </div>
    </div>
  )
}
