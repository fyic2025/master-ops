'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Package, TrendingDown, RefreshCw } from 'lucide-react'

interface ProblemProduct {
  id: number
  product_name: string
  sku: string
  supplier_name: string
  slow_order_count: number
  slow_rate_percent: number
  avg_dispatch_days: number
  needs_review: boolean
  review_status: string
  recommended_stock: number | null
}

interface Summary {
  total: number
  needsReview: number
  avgSlowRate: number
  bySupplier: Record<string, number>
}

export function DispatchProblemsWidget() {
  const [products, setProducts] = useState<ProblemProduct[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dispatch/problem-products?minSlowRate=80&limit=20')
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setProducts(data.products || [])
        setSummary(data.summary)
        setError(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Error loading dispatch data: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Slow Dispatch Products</h3>
        </div>
        <button
          onClick={fetchData}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Problem SKUs</p>
            <p className="text-2xl font-bold text-orange-400">{summary.total}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Needs Review</p>
            <p className="text-2xl font-bold text-red-400">{summary.needsReview}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Avg Slow Rate</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.avgSlowRate}%</p>
          </div>
        </div>
      )}

      {/* Supplier Breakdown */}
      {summary && Object.keys(summary.bySupplier).length > 0 && (
        <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">By Supplier:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.bySupplier)
              .sort((a, b) => b[1] - a[1])
              .map(([supplier, count]) => (
                <span
                  key={supplier}
                  className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                >
                  {supplier}: <span className="text-white font-medium">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-right">Slow %</th>
              <th className="pb-2 font-medium text-right">Orders</th>
              <th className="pb-2 font-medium text-right">Avg Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.slice(0, 10).map((product) => (
              <tr key={product.id} className="hover:bg-gray-800/30">
                <td className="py-2 text-gray-300 font-mono text-xs">
                  {product.sku?.split(' - ')[1] || product.sku}
                </td>
                <td className="py-2 text-white max-w-[200px] truncate" title={product.product_name}>
                  {product.product_name.length > 35
                    ? product.product_name.substring(0, 35) + '...'
                    : product.product_name}
                </td>
                <td className="py-2 text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    product.slow_rate_percent >= 95
                      ? 'bg-red-500/20 text-red-400'
                      : product.slow_rate_percent >= 90
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {product.slow_rate_percent.toFixed(0)}%
                  </span>
                </td>
                <td className="py-2 text-right text-gray-300">
                  {product.slow_order_count}
                </td>
                <td className="py-2 text-right text-gray-300">
                  {product.avg_dispatch_days.toFixed(1)}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View All Link */}
      {products.length > 10 && (
        <div className="mt-4 text-center">
          <a
            href="/boo/inventory?tab=dispatch"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View all {summary?.total} problem products →
          </a>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No slow dispatch products found</p>
        </div>
      )}
    </div>
  )
}
