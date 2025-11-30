'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Send,
  RefreshCw,
  Printer,
  Package,
  Truck,
  Archive,
  ChevronDown,
  Search,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
  FileText,
  Filter,
} from 'lucide-react'
import { type BusinessCode } from '@/lib/business-config'

// Types for shipping orders
interface ShippingOrder {
  id: string
  order_number: string
  source: 'shopify' | 'bigcommerce' | 'unleashed'
  source_order_id: string
  business_code: string
  customer_name: string
  customer_email: string
  ship_to_city: string
  ship_to_state: string
  ship_to_country: string
  ship_to_postcode: string
  order_date: string
  item_count: number
  total_weight_grams: number | null
  order_total: number
  status: 'new' | 'printed' | 'shipped' | 'archived'
  carrier: 'auspost' | 'sendle' | null
  service_code: string | null
  tracking_number: string | null
  manifest_number: string | null
}

const BUSINESS_LABELS: Record<string, { name: string; color: string }> = {
  boo: { name: 'BOO', color: 'bg-green-500' },
  teelixir: { name: 'Teelixir', color: 'bg-purple-500' },
  elevate: { name: 'Elevate', color: 'bg-blue-500' },
}

interface TabCount {
  new: number
  printed: number
  shipped: number
  archived: number
}

type TabKey = keyof TabCount

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'new', label: 'New', icon: Package },
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'archived', label: 'Archived', icon: Archive },
]

const CARRIER_LABELS: Record<string, string> = {
  auspost: 'Australia Post',
  sendle: 'Sendle',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value)
}

export default function ShippingPage() {
  const params = useParams()
  const businessCode = params.business as BusinessCode
  const isHomeView = businessCode === 'home'

  const [activeTab, setActiveTab] = useState<TabKey>('new')
  const [orders, setOrders] = useState<ShippingOrder[]>([])
  const [counts, setCounts] = useState<TabCount>({ new: 0, printed: 0, shipped: 0, archived: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [manifesting, setManifesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  // Business filter for home view - 'all' shows all businesses
  const [businessFilter, setBusinessFilter] = useState<string>('all')

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/shipping?business=${businessCode}&status=${activeTab}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(data.orders || [])
      setCounts(data.counts || { new: 0, printed: 0, shipped: 0, archived: 0 })
    } catch (err: any) {
      setError(err.message)
      // Use mock data for demo
      setOrders([])
      setCounts({ new: 0, printed: 0, shipped: 0, archived: 0 })
    } finally {
      setLoading(false)
    }
  }, [businessCode, activeTab])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Sync orders from platform
  const syncOrders = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/shipping/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: businessCode }),
      })
      if (!res.ok) throw new Error('Sync failed')
      await fetchOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  // Select all visible orders
  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
    }
  }

  // Filter orders by search and business
  const filteredOrders = orders.filter(order => {
    // Business filter (only in home view)
    if (isHomeView && businessFilter !== 'all' && order.business_code !== businessFilter) {
      return false
    }
    // Search filter
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.tracking_number?.toLowerCase().includes(query)
    )
  })

  // Create manifest for printed orders
  const createManifest = async () => {
    const targetBusiness = isHomeView ? businessFilter : businessCode
    if (targetBusiness === 'all') {
      setError('Please select a specific business to create manifest')
      return
    }

    setManifesting(true)
    setError(null)
    try {
      const res = await fetch('/api/shipping/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: targetBusiness,
          carrier: 'auspost' // Default to AusPost, could be made selectable
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create manifest')
      }
      const data = await res.json()
      // Open manifest PDF in new tab if available
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }
      await fetchOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setManifesting(false)
    }
  }

  // Get platform source label
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'bigcommerce': return 'BC'
      case 'shopify': return 'Shopify'
      case 'unleashed': return 'UL'
      default: return source
    }
  }

  // Get status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-300'
      case 'printed':
        return 'bg-yellow-500/20 text-yellow-300'
      case 'shipped':
        return 'bg-green-500/20 text-green-300'
      case 'archived':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Shipping</h1>
            <p className="text-gray-400 mt-1">Manage shipping labels and manifests</p>
          </div>
          {/* Business Filter - only show in home view */}
          {isHomeView && (
            <div className="flex items-center gap-2 ml-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={businessFilter}
                onChange={(e) => setBusinessFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Businesses</option>
                <option value="boo">BOO</option>
                <option value="teelixir">Teelixir</option>
                <option value="elevate">Elevate</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncOrders}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Orders'}
          </button>
          {/* Manifest button - show when on printed tab */}
          {activeTab === 'printed' && (
            <button
              onClick={createManifest}
              disabled={manifesting || (isHomeView && businessFilter === 'all')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50"
              title={isHomeView && businessFilter === 'all' ? 'Select a business first' : 'Create end-of-day manifest'}
            >
              <FileText className="w-4 h-4" />
              {manifesting ? 'Creating...' : 'Create Manifest'}
            </button>
          )}
          {selectedOrders.size > 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              <Printer className="w-4 h-4" />
              Print Labels ({selectedOrders.size})
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.key
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-gray-800 text-gray-400'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
            Actions
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-8">
            <div className="h-8 bg-gray-800 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No orders found</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {activeTab === 'new'
                ? 'Click "Sync Orders" to pull new orders from your e-commerce platform.'
                : `No orders in the ${activeTab} status.`}
            </p>
            {activeTab === 'new' && (
              <button
                onClick={syncOrders}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Orders
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                </th>
                {isHomeView && (
                  <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Business</th>
                )}
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Order</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Date</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Customer</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Destination</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Carrier</th>
                <th className="text-left text-sm font-medium text-gray-400 px-4 py-3">Status</th>
                <th className="text-right text-sm font-medium text-gray-400 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-800/50 transition-colors ${
                    selectedOrders.has(order.id) ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                  </td>
                  {isHomeView && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${BUSINESS_LABELS[order.business_code]?.color || 'bg-gray-500'}`} />
                        <span className="text-sm text-white">{BUSINESS_LABELS[order.business_code]?.name || order.business_code}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{order.order_number}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                        {getSourceLabel(order.source)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDate(order.order_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">{order.customer_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {order.ship_to_city}, {order.ship_to_state}
                    {order.ship_to_country !== 'AU' && (
                      <span className="ml-1 text-amber-400">({order.ship_to_country})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.carrier ? (
                      <span className={`text-sm ${
                        order.carrier === 'auspost' ? 'text-red-300' : 'text-blue-300'
                      }`}>
                        {CARRIER_LABELS[order.carrier]}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.tracking_number && (
                        <a
                          href={`https://auspost.com.au/mypost/track/#/details/${order.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-white transition-colors"
                          title="Track"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="Print Label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="More"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Stats Footer */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            {selectedOrders.size > 0 && ` (${selectedOrders.size} selected)`}
          </span>
          <span>
            Total: {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.order_total || 0), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
