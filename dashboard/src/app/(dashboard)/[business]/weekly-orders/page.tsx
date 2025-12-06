'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart,
  RefreshCw,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  DollarSign,
  Search,
  X
} from 'lucide-react'

interface Supplier {
  id: string
  name: string
  code: string
}

interface SupplierProduct {
  id: string
  supplier_id: string
  name: string
  unit: string
  cost_price: number
  category: string
  is_available: boolean
  quality_days: number
  weight_kg: number | null
}

interface OrderData {
  summary: {
    week_start: string
    total_orders: number
    total_value: number
    by_supplier: {
      id: string
      name: string
      code: string
      order_id: string | null
      status: string
      total: number
      line_count: number
      available_products: number
    }[]
  }
  suppliers: Supplier[]
  productsBySupplier: Record<string, SupplierProduct[]>
}

async function fetchOrders(weekStart: string): Promise<OrderData> {
  const res = await fetch(`/api/rhf/weekly-orders?week_start=${weekStart}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    none: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Package },
    draft: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
    submitted: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Send },
    confirmed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  }
  const c = config[status] || config.draft
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {status === 'none' ? 'No order' : status}
    </span>
  )
}

function OrderEditor({
  supplier,
  products,
  weekStart,
  onClose,
  onSave
}: {
  supplier: { id: string; name: string; code: string }
  products: SupplierProduct[]
  weekStart: string
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [orderLines, setOrderLines] = useState<Record<string, number>>({})

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [products, searchQuery, selectedCategory])

  const updateQuantity = (productId: string, delta: number) => {
    setOrderLines(prev => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: next }
    })
  }

  const setQuantity = (productId: string, qty: number) => {
    setOrderLines(prev => {
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: qty }
    })
  }

  const orderTotal = useMemo(() => {
    return Object.entries(orderLines).reduce((sum, [productId, qty]) => {
      const product = products.find(p => p.id === productId)
      return sum + (product ? qty * product.cost_price : 0)
    }, 0)
  }, [orderLines, products])

  const handleSave = () => {
    const lines = Object.entries(orderLines).map(([productId, qty]) => {
      const product = products.find(p => p.id === productId)!
      return {
        supplier_product_id: productId,
        quantity: qty,
        unit_price: product.cost_price,
        notes: ''
      }
    })
    onSave({
      supplier_id: supplier.id,
      week_start: weekStart,
      lines
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{supplier.name} Order</h3>
            <p className="text-sm text-gray-400">Week of {formatDate(weekStart)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-800 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white min-w-[150px]"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-2">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  orderLines[product.id] ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.category} • {product.unit} • {product.quality_days || '?'} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">${product.cost_price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">per {product.unit || 'unit'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(product.id, -1)}
                    className="p-1 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={orderLines[product.id] || 0}
                    onChange={(e) => setQuantity(product.id, parseInt(e.target.value) || 0)}
                    className="w-16 text-center bg-gray-800 border border-gray-700 rounded py-1 text-white"
                  />
                  <button
                    onClick={() => updateQuantity(product.id, 1)}
                    className="p-1 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">{Object.keys(orderLines).length} items</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">${orderTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-500">+ GST</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={Object.keys(orderLines).length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeeklyOrdersPage() {
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingSupplier, setEditingSupplier] = useState<{
    id: string
    name: string
    code: string
  } | null>(null)

  const weekStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return getWeekStart(d)
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  }, [weekStart])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rhf-weekly-orders', weekStart],
    queryFn: () => fetchOrders(weekStart)
  })

  const saveMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await fetch('/api/rhf/weekly-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhf-weekly-orders'] })
      setEditingSupplier(null)
    }
  })

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load orders</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="w-7 h-7" />
            Weekly Orders
          </h1>
          <p className="text-gray-400 mt-1">
            Create and manage supplier orders for the week
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Week selector */}
      <div className="flex items-center justify-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 px-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">
            {formatDate(weekStart)} - {formatDate(weekEnd)}
          </span>
          {weekOffset === 0 && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">This Week</span>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary stats */}
      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Suppliers</p>
            <p className="text-2xl font-bold text-white">{data.summary.by_supplier.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Orders Created</p>
            <p className="text-2xl font-bold text-white">{data.summary.total_orders}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-green-400">
              ${data.summary.total_value.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Supplier cards */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : (
          data?.summary.by_supplier.map(supplier => (
            <div
              key={supplier.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium">{supplier.name}</span>
                  <span className="text-xs text-gray-500 uppercase">{supplier.code}</span>
                </div>
                <p className="text-sm text-gray-400">
                  {supplier.available_products} products available
                </p>
              </div>
              <div className="text-center px-4">
                <StatusBadge status={supplier.status} />
                {supplier.line_count > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{supplier.line_count} items</p>
                )}
              </div>
              <div className="text-right px-4">
                {supplier.total > 0 && (
                  <p className="text-lg font-bold text-white">${supplier.total.toFixed(2)}</p>
                )}
              </div>
              <button
                onClick={() => setEditingSupplier({
                  id: supplier.id,
                  name: supplier.name,
                  code: supplier.code
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {supplier.status === 'none' ? 'Create Order' : 'Edit Order'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Order editor modal */}
      {editingSupplier && data && (
        <OrderEditor
          supplier={editingSupplier}
          products={data.productsBySupplier[editingSupplier.id] || []}
          weekStart={weekStart}
          onClose={() => setEditingSupplier(null)}
          onSave={(orderData) => saveMutation.mutate(orderData)}
        />
      )}

      {/* Legend */}
      <div className="text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Prices exclude GST
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Orders for delivery on Thursday
        </span>
      </div>
    </div>
  )
}
