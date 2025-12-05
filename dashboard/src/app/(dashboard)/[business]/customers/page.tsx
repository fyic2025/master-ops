'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  Users, Plus, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink,
  RefreshCw, Mail, Upload, Download, Filter, ChevronDown, ChevronUp,
  CheckSquare, Square, Search, X, Calendar, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'

// Date range presets
type DateRangePreset = 'mtd' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'all_time'

const DATE_PRESETS: { value: DateRangePreset; label: string; canCompare: boolean }[] = [
  { value: 'mtd', label: 'Month to Date', canCompare: true },
  { value: 'last_month', label: 'Last Month', canCompare: true },
  { value: 'last_3_months', label: 'Last 3 Months', canCompare: true },
  { value: 'last_6_months', label: 'Last 6 Months', canCompare: true },
  { value: 'last_12_months', label: 'Last 12 Months', canCompare: true },
  { value: 'all_time', label: 'All Time', canCompare: false },
]

function getDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  switch (preset) {
    case 'mtd':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        endDate
      }
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0]
      }
    }
    case 'last_3_months':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0],
        endDate
      }
    case 'last_6_months':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0],
        endDate
      }
    case 'last_12_months':
      return {
        startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0],
        endDate
      }
    case 'all_time':
    default:
      return { startDate: '', endDate: '' }
  }
}

function getCompareRange(preset: DateRangePreset): { startDate: string; endDate: string } | null {
  const current = getDateRange(preset)
  if (!current.startDate || preset === 'all_time') return null

  const start = new Date(current.startDate)
  const end = new Date(current.endDate)
  const duration = end.getTime() - start.getTime()

  const compareEnd = new Date(start.getTime() - 1) // Day before current start
  const compareStart = new Date(compareEnd.getTime() - duration)

  return {
    startDate: compareStart.toISOString().split('T')[0],
    endDate: compareEnd.toISOString().split('T')[0]
  }
}

interface CustomerFormData {
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone: string
  abn: string
  address1: string
  city: string
  state: string
  postcode: string
}

interface BrandBreakdown {
  amount: number
  orderCount: number
}

interface CustomerMetrics {
  totalSpend: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate: string | null
  brandBreakdown: Record<string, BrandBreakdown>
}

interface CustomerWithOrders {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: string
  tags: string[]
  createdAt: string
  metrics: CustomerMetrics
}

interface ShopifyCustomer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: 'DISABLED' | 'INVITED' | 'ENABLED' | 'DECLINED'
  createdAt: string
  updatedAt: string
  tags: string[]
  numberOfOrders: number
  note: string | null
  verifiedEmail: boolean
  validEmailAddress: boolean
}

const initialFormData: CustomerFormData = {
  email: '',
  firstName: '',
  lastName: '',
  businessName: '',
  phone: '',
  abn: '',
  address1: '',
  city: '',
  state: '',
  postcode: '',
}

type SortKey = 'name' | 'totalSpend' | 'lastOrderDate' | 'avgOrderValue' | 'orderCount'
type SortDir = 'asc' | 'desc'

export default function CustomersPage() {
  const params = useParams()
  const business = params?.business as string

  if (business !== 'elevate') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Customer management is only available for Elevate Wholesale.</p>
        </div>
      </div>
    )
  }

  return <ElevateCustomerManager />
}

function ElevateCustomerManager() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'bulk'>('list')
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([])
  const [compareCustomers, setCompareCustomers] = useState<CustomerWithOrders[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last_3_months')
  const [compareEnabled, setCompareEnabled] = useState(false)

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('totalSpend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const canCompare = DATE_PRESETS.find(p => p.value === datePreset)?.canCompare ?? false

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(datePreset)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/elevate/customers/orders?${params}`)
      const data = await response.json()
      if (data.customers) {
        setCustomers(data.customers)
      }

      // Fetch compare period if enabled
      if (compareEnabled && canCompare) {
        const compareRange = getCompareRange(datePreset)
        if (compareRange) {
          const compareParams = new URLSearchParams()
          compareParams.set('startDate', compareRange.startDate)
          compareParams.set('endDate', compareRange.endDate)
          const compareResp = await fetch(`/api/elevate/customers/orders?${compareParams}`)
          const compareData = await compareResp.json()
          setCompareCustomers(compareData.customers || [])
        }
      } else {
        setCompareCustomers([])
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [datePreset, compareEnabled, canCompare])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Create compare lookup for faster access
  const compareMap = useMemo(() => {
    const map = new Map<string, CustomerMetrics>()
    compareCustomers.forEach(c => map.set(c.id, c.metrics))
    return map
  }, [compareCustomers])

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          c.email?.toLowerCase().includes(q) ||
          c.firstName?.toLowerCase().includes(q) ||
          c.lastName?.toLowerCase().includes(q)
        )
      }
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortKey) {
        case 'name':
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase()
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase()
          break
        case 'totalSpend':
          aVal = a.metrics.totalSpend
          bVal = b.metrics.totalSpend
          break
        case 'lastOrderDate':
          aVal = a.metrics.lastOrderDate ? new Date(a.metrics.lastOrderDate).getTime() : 0
          bVal = b.metrics.lastOrderDate ? new Date(b.metrics.lastOrderDate).getTime() : 0
          break
        case 'avgOrderValue':
          aVal = a.metrics.avgOrderValue
          bVal = b.metrics.avgOrderValue
          break
        case 'orderCount':
          aVal = a.metrics.orderCount
          bVal = b.metrics.orderCount
          break
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [customers, searchQuery, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
    }
  }

  const sendActivationEmails = async (customerIds: string[]) => {
    setActionLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/elevate/customers/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: 'success', text: `Activation emails sent to ${data.sent} customer(s)` })
        setSelectedIds(new Set())
        fetchCustomers()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send activation emails' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((sum, c) => sum + c.metrics.totalSpend, 0)
    const totalOrders = customers.reduce((sum, c) => sum + c.metrics.orderCount, 0)
    const customersWithOrders = customers.filter(c => c.metrics.orderCount > 0).length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Compare stats
    const compareTotalRevenue = compareCustomers.reduce((sum, c) => sum + c.metrics.totalSpend, 0)
    const compareTotalOrders = compareCustomers.reduce((sum, c) => sum + c.metrics.orderCount, 0)

    return {
      totalCustomers: customers.length,
      customersWithOrders,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueChange: compareTotalRevenue > 0 ? ((totalRevenue - compareTotalRevenue) / compareTotalRevenue) * 100 : null,
      ordersChange: compareTotalOrders > 0 ? ((totalOrders - compareTotalOrders) / compareTotalOrders) * 100 : null,
    }
  }, [customers, compareCustomers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Elevate Customers</h1>
          <p className="text-gray-400 mt-1">Wholesale customer analytics & management</p>
        </div>
        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-4 flex-wrap bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400 text-sm">Date Range:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => {
                setDatePreset(preset.value)
                if (!preset.canCompare) setCompareEnabled(false)
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                datePreset === preset.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {canCompare && (
          <label className="flex items-center gap-2 ml-4 cursor-pointer">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-400">Compare to previous period</span>
          </label>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Customers</p>
          <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
          <p className="text-gray-500 text-xs mt-1">{stats.customersWithOrders} with orders</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-green-400">${stats.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {stats.revenueChange !== null && (
            <p className={`text-xs mt-1 ${stats.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}% vs prev period
            </p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalOrders}</p>
          {stats.ordersChange !== null && (
            <p className={`text-xs mt-1 ${stats.ordersChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.ordersChange >= 0 ? '↑' : '↓'} {Math.abs(stats.ordersChange).toFixed(1)}% vs prev period
            </p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Avg Order Value</p>
          <p className="text-2xl font-bold text-purple-400">${stats.avgOrderValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success'
            ? 'bg-green-900/20 border border-green-800'
            : 'bg-red-900/20 border border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
              {message.text}
            </p>
            <button onClick={() => setMessage(null)} className="ml-auto text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Customer Analytics
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'create' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Single
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'bulk' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Bulk Upload
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <CustomerAnalyticsList
          customers={filteredCustomers}
          compareMap={compareMap}
          compareEnabled={compareEnabled}
          loading={loading}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          sendActivationEmails={sendActivationEmails}
          actionLoading={actionLoading}
          setMessage={setMessage}
          fetchCustomers={fetchCustomers}
        />
      )}

      {activeTab === 'create' && (
        <CreateCustomerForm
          onSuccess={() => {
            fetchCustomers()
            setActiveTab('list')
          }}
          setMessage={setMessage}
        />
      )}

      {activeTab === 'bulk' && (
        <BulkUpload
          onSuccess={() => {
            fetchCustomers()
            setActiveTab('list')
          }}
          setMessage={setMessage}
        />
      )}
    </div>
  )
}

interface CustomerAnalyticsListProps {
  customers: CustomerWithOrders[]
  compareMap: Map<string, CustomerMetrics>
  compareEnabled: boolean
  loading: boolean
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  selectAll: () => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  sendActivationEmails: (ids: string[]) => Promise<void>
  actionLoading: boolean
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
  fetchCustomers: () => void
}

function CustomerAnalyticsList({
  customers, compareMap, compareEnabled, loading, selectedIds, toggleSelect, selectAll,
  searchQuery, setSearchQuery, sortKey, sortDir, onSort,
  sendActivationEmails, actionLoading, setMessage, fetchCustomers
}: CustomerAnalyticsListProps) {
  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
      onClick={() => onSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName ? (
          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </div>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
          />
        </div>
        <span className="text-gray-500 text-sm">{customers.length} customers</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No customers found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <button onClick={selectAll} className="text-gray-400 hover:text-white">
                    {selectedIds.size === customers.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-8">Access</th>
                <SortHeader label="Customer" sortKeyName="name" />
                <SortHeader label="Total Spend" sortKeyName="totalSpend" />
                <SortHeader label="Orders" sortKeyName="orderCount" />
                <SortHeader label="Last Order" sortKeyName="lastOrderDate" />
                <SortHeader label="Avg Order $" sortKeyName="avgOrderValue" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {customers.map((customer) => (
                <CustomerAnalyticsRow
                  key={customer.id}
                  customer={customer}
                  compareMetrics={compareEnabled ? compareMap.get(customer.id) : undefined}
                  selected={selectedIds.has(customer.id)}
                  onToggle={() => toggleSelect(customer.id)}
                  setMessage={setMessage}
                  fetchCustomers={fetchCustomers}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Approved = Can see wholesale prices
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
          Not approved = Awaiting approval
        </span>
      </div>
    </div>
  )
}

interface CustomerAnalyticsRowProps {
  customer: CustomerWithOrders
  compareMetrics?: CustomerMetrics
  selected: boolean
  onToggle: () => void
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
  fetchCustomers: () => void
}

function CustomerAnalyticsRow({
  customer, compareMetrics, selected, onToggle, setMessage, fetchCustomers
}: CustomerAnalyticsRowProps) {
  const [expanded, setExpanded] = useState(false)
  const isApproved = customer.tags?.includes('approved') && customer.state !== 'DISABLED'

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getChangeIndicator = (current: number, compare: number | undefined) => {
    if (!compare || compare === 0) return null
    const change = ((current - compare) / compare) * 100
    if (Math.abs(change) < 1) return null
    return (
      <span className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
      </span>
    )
  }

  // Sort brands by amount
  const sortedBrands = Object.entries(customer.metrics.brandBreakdown)
    .sort((a, b) => b[1].amount - a[1].amount)

  return (
    <>
      <tr className="hover:bg-gray-800/50">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-gray-400 hover:text-white">
            {selected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span
            className={`w-2.5 h-2.5 rounded-full inline-block ${isApproved ? 'bg-green-400' : 'bg-gray-500'}`}
            title={isApproved ? 'Approved' : 'Not approved'}
          />
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="text-white font-medium">
              {customer.firstName || ''} {customer.lastName || ''}
              {!customer.firstName && !customer.lastName && <span className="text-gray-500">No name</span>}
            </p>
            <p className="text-gray-500 text-sm">{customer.email}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-medium">{formatCurrency(customer.metrics.totalSpend)}</span>
            {getChangeIndicator(customer.metrics.totalSpend, compareMetrics?.totalSpend)}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-300">{customer.metrics.orderCount}</span>
            {getChangeIndicator(customer.metrics.orderCount, compareMetrics?.orderCount)}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(customer.metrics.lastOrderDate)}</td>
        <td className="px-4 py-3">
          <span className="text-purple-400">{formatCurrency(customer.metrics.avgOrderValue)}</span>
        </td>
        <td className="px-4 py-3">
          {sortedBrands.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-500 hover:text-white transition-colors"
              title={expanded ? 'Collapse' : 'Expand brand breakdown'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && sortedBrands.length > 0 && (
        <tr className="bg-gray-800/30">
          <td colSpan={8} className="px-4 py-3">
            <div className="ml-12">
              <p className="text-gray-400 text-xs uppercase mb-2">Brand Breakdown</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedBrands.map(([brand, data]) => (
                  <div key={brand} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-white font-medium text-sm truncate" title={brand}>{brand}</p>
                    <p className="text-green-400 text-lg">{formatCurrency(data.amount)}</p>
                    <p className="text-gray-500 text-xs">{data.orderCount} order{data.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface CreateCustomerFormProps {
  onSuccess: () => void
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
}

function CreateCustomerForm({ onSuccess, setMessage }: CreateCustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    activationUrl?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/elevate/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Customer created successfully!',
          activationUrl: data.activationUrl
        })
        setFormData(initialFormData)
        setMessage({ type: 'success', text: `Customer "${formData.firstName} ${formData.lastName}" created!` })
        setTimeout(onSuccess, 2000)
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to create customer'
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyActivationUrl = async () => {
    if (result?.activationUrl) {
      await navigator.clipboard.writeText(result.activationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Plus className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Create New Customer</h2>
          <p className="text-gray-500 text-sm">Add a new wholesale customer to Shopify</p>
        </div>
      </div>

      {result && (
        <div className={`rounded-lg p-4 mb-6 ${
          result.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={result.success ? 'text-green-400' : 'text-red-400'}>{result.message}</p>
              {result.activationUrl && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Backup activation link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                      {result.activationUrl}
                    </code>
                    <button onClick={copyActivationUrl} className="p-2 text-gray-400 hover:text-white bg-gray-700 rounded">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email <span className="text-red-400">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="customer@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="+61 400 000 000" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name <span className="text-red-400">*</span></label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="John" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name <span className="text-red-400">*</span></label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="Smith" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Business Name <span className="text-red-400">*</span></label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="ABC Health Store" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ABN</label>
              <input type="text" name="abn" value={formData.abn} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="12 345 678 901" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Address (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Street Address</label>
              <input type="text" name="address1" value={formData.address1} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="123 Main Street" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                placeholder="Melbourne" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">State</label>
                <select name="state" value={formData.state} onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="">Select...</option>
                  <option value="VIC">VIC</option>
                  <option value="NSW">NSW</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="NT">NT</option>
                  <option value="ACT">ACT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Postcode</label>
                <input type="text" name="postcode" value={formData.postcode} onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="3000" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Customer</>}
          </button>
        </div>
      </form>
    </div>
  )
}

interface BulkUploadProps {
  onSuccess: () => void
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
}

function BulkUpload({ onSuccess, setMessage }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, i) => {
          row[h] = values[i] || ''
        })
        return row
      }).filter(r => r.email)

      setPreview(rows.slice(0, 5))
    }
    reader.readAsText(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResults(null)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

        const customers = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const row: any = {}
          headers.forEach((h, i) => {
            const fieldMap: Record<string, string> = {
              'email': 'email',
              'first name': 'firstName',
              'firstname': 'firstName',
              'first_name': 'firstName',
              'last name': 'lastName',
              'lastname': 'lastName',
              'last_name': 'lastName',
              'business': 'businessName',
              'business name': 'businessName',
              'businessname': 'businessName',
              'business_name': 'businessName',
              'company': 'businessName',
              'phone': 'phone',
              'abn': 'abn',
              'address': 'address1',
              'address1': 'address1',
              'street': 'address1',
              'city': 'city',
              'state': 'state',
              'postcode': 'postcode',
              'zip': 'postcode',
            }
            const mappedKey = fieldMap[h] || h
            row[mappedKey] = values[i] || ''
          })
          return row
        }).filter(r => r.email)

        const response = await fetch('/api/elevate/customers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers })
        })

        const data = await response.json()
        setResults({
          success: data.created || 0,
          failed: data.failed || 0,
          errors: data.errors || []
        })

        if (data.created > 0) {
          setMessage({ type: 'success', text: `Successfully created ${data.created} customer(s)` })
          setTimeout(onSuccess, 2000)
        }
        setUploading(false)
      }
      reader.readAsText(file)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'email,firstName,lastName,businessName,phone,abn,address1,city,state,postcode\njohn@example.com,John,Smith,ABC Health Store,0400000000,12345678901,123 Main St,Melbourne,VIC,3000'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'elevate-customer-template.csv'
    a.click()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Upload className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Bulk Upload Customers</h2>
            <p className="text-gray-500 text-sm">Upload a CSV file to create multiple customers at once</p>
          </div>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg">
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      <div className="space-y-6">
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <p className="text-gray-600 text-sm">CSV file with headers: email, firstName, lastName, businessName</p>
          </label>
        </div>

        {preview.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400">Email</th>
                    <th className="px-3 py-2 text-left text-gray-400">Name</th>
                    <th className="px-3 py-2 text-left text-gray-400">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-300">{row.email}</td>
                      <td className="px-3 py-2 text-gray-300">{row.firstName} {row.lastName}</td>
                      <td className="px-3 py-2 text-gray-300">{row.businessName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results && (
          <div className={`rounded-lg p-4 ${results.failed > 0 ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-green-900/20 border border-green-800'}`}>
            <p className="font-medium text-white mb-2">Upload Complete</p>
            <p className="text-green-400">Created: {results.success}</p>
            {results.failed > 0 && (
              <>
                <p className="text-red-400">Failed: {results.failed}</p>
                <div className="mt-2 text-sm text-gray-400">
                  {results.errors.slice(0, 5).map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {file && !results && (
          <div className="flex justify-end">
            <button onClick={handleUpload} disabled={uploading}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload & Create</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
