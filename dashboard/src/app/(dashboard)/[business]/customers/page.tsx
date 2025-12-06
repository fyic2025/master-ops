'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Users,
  Crown,
  Heart,
  UserCheck,
  Sparkles,
  AlertTriangle,
  UserX,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  ChevronDown,
  ArrowUpRight,
  DollarSign
} from 'lucide-react'

interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  order_count: number
  total_spent: number
  days_since_order: number
  customer_segment: string
  rfm_score: number
  rfm_recency: number
  rfm_frequency: number
  rfm_monetary: number
  first_order_date: string
  last_order_date: string
  city: string | null
  postcode: string | null
}

interface SegmentData {
  count: number
  revenue: number
}

const SEGMENT_CONFIG: Record<string, {
  label: string
  icon: typeof Crown
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  champions: {
    label: 'Champions',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-gradient-to-br from-amber-500/20 to-yellow-600/10',
    borderColor: 'border-amber-500/30',
    description: 'High value, ordered recently'
  },
  loyal: {
    label: 'Loyal',
    icon: Heart,
    color: 'text-rose-400',
    bgColor: 'bg-gradient-to-br from-rose-500/20 to-pink-600/10',
    borderColor: 'border-rose-500/30',
    description: 'Regular repeat customers'
  },
  regular: {
    label: 'Regular',
    icon: UserCheck,
    color: 'text-sky-400',
    bgColor: 'bg-gradient-to-br from-sky-500/20 to-blue-600/10',
    borderColor: 'border-sky-500/30',
    description: 'Steady ordering pattern'
  },
  new: {
    label: 'New',
    icon: Sparkles,
    color: 'text-emerald-400',
    bgColor: 'bg-gradient-to-br from-emerald-500/20 to-green-600/10',
    borderColor: 'border-emerald-500/30',
    description: 'First order within 7 days'
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-gradient-to-br from-orange-500/20 to-amber-600/10',
    borderColor: 'border-orange-500/30',
    description: '30-60 days since last order'
  },
  lost: {
    label: 'Lost',
    icon: UserX,
    color: 'text-gray-400',
    bgColor: 'bg-gradient-to-br from-gray-500/20 to-slate-600/10',
    borderColor: 'border-gray-500/30',
    description: '60+ days since last order'
  }
}

export default function CustomersPage() {
  const params = useParams()
  const business = params.business as string

  const [customers, setCustomers] = useState<Customer[]>([])
  const [segments, setSegments] = useState<Record<string, SegmentData>>({})
  const [summary, setSummary] = useState({ total_customers: 0, total_revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('total_spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchCustomers = useCallback(async () => {
    if (business !== 'rhf') return
    setLoading(true)
    try {
      const urlParams = new URLSearchParams()
      if (selectedSegment !== 'all') urlParams.set('segment', selectedSegment)
      if (search) urlParams.set('search', search)
      urlParams.set('sort', sortBy)
      urlParams.set('order', sortOrder)

      const res = await fetch('/api/rhf/customers?' + urlParams.toString())
      const data = await res.json()

      setCustomers(data.customers || [])
      setSegments(data.segments || {})
      setSummary(data.summary || { total_customers: 0, total_revenue: 0 })
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }, [business, selectedSegment, search, sortBy, sortOrder])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Only show for RHF
  if (business !== 'rhf') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Customer analytics not available for this business</h1>
      </div>
    )
  }

  async function recalculateRFM() {
    try {
      await fetch('/api/rhf/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate_rfm' })
      })
      fetchCustomers()
    } catch (error) {
      console.error('Error recalculating RFM:', error)
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalSegmented = Object.values(segments).reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Customer Intelligence
            </h1>
            <p className="text-gray-400 mt-1">
              RFM segmentation &amp; reengagement tracking
            </p>
          </div>
          <button
            onClick={recalculateRFM}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-emerald-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate RFM
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Active Customers</span>
          </div>
          <div className="text-3xl font-bold text-white">{summary.total_customers}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-sky-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrency(summary.total_revenue)}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Champions + Loyal</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {(segments.champions?.count || 0) + (segments.loyal?.count || 0)}
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Need Attention</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {(segments.at_risk?.count || 0) + (segments.lost?.count || 0)}
          </div>
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
          const segment = segments[key] || { count: 0, revenue: 0 }
          const Icon = config.icon
          const isSelected = selectedSegment === key
          const percentage = totalSegmented > 0 ? Math.round((segment.count / totalSegmented) * 100) : 0

          return (
            <button
              key={key}
              onClick={() => setSelectedSegment(isSelected ? 'all' : key)}
              className={'relative overflow-hidden rounded-xl p-4 border transition-all duration-300 text-left group ' +
                (isSelected
                  ? config.bgColor + ' ' + config.borderColor + ' border-2 scale-[1.02]'
                  : 'bg-gray-900/30 border-gray-800 hover:border-gray-700')
              }
            >
              {/* Glow effect */}
              {isSelected && (
                <div className={'absolute inset-0 ' + config.bgColor + ' opacity-50 blur-xl'} />
              )}

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={'w-5 h-5 ' + config.color} />
                  <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + config.bgColor + ' ' + config.color}>
                    {percentage}%
                  </span>
                </div>

                <div className="text-2xl font-bold text-white mb-1">{segment.count}</div>
                <div className="text-sm font-medium text-gray-300">{config.label}</div>
                <div className="text-xs text-gray-500 mt-1">{formatCurrency(segment.revenue)}</div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={'h-full ' + config.bgColor + ' transition-all duration-500'}
                    style={{ width: percentage + '%' }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
          >
            <option value="total_spent">Sort by Revenue</option>
            <option value="order_count">Sort by Orders</option>
            <option value="days_since_order">Sort by Recency</option>
            <option value="rfm_score">Sort by RFM Score</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          {sortOrder === 'desc' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
        </button>

        {selectedSegment !== 'all' && (
          <button
            onClick={() => setSelectedSegment('all')}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Customer Table */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Segment</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Order</th>
                  <th className="text-center py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">RFM</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {customers.map((customer) => {
                  const segmentConfig = SEGMENT_CONFIG[customer.customer_segment] || SEGMENT_CONFIG.regular
                  const SegmentIcon = segmentConfig.icon

                  return (
                    <tr key={customer.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={'w-10 h-10 rounded-full ' + segmentConfig.bgColor + ' flex items-center justify-center'}>
                            <span className="text-sm font-bold text-white">
                              {(customer.first_name?.[0] || customer.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {customer.first_name && customer.last_name
                                ? customer.first_name + ' ' + customer.last_name
                                : customer.email.split('@')[0]}
                            </div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ' + segmentConfig.bgColor + ' ' + segmentConfig.borderColor + ' border'}>
                          <SegmentIcon className={'w-3.5 h-3.5 ' + segmentConfig.color} />
                          <span className={'text-xs font-medium ' + segmentConfig.color}>
                            {segmentConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="text-white font-medium">{customer.order_count}</span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="text-white font-medium">{formatCurrency(customer.total_spent)}</span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="text-white">{formatDate(customer.last_order_date)}</div>
                        <div className="text-xs text-gray-500">{customer.days_since_order} days ago</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center" title="Recency">
                            {customer.rfm_recency}
                          </span>
                          <span className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center" title="Frequency">
                            {customer.rfm_frequency}
                          </span>
                          <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center" title="Monetary">
                            {customer.rfm_monetary}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Send email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {customer.phone && (
                            <button
                              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="View orders"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Showing {customers.length} of {summary.total_customers} customers with orders
      </div>
    </div>
  )
}
