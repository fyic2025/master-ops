'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Users, Plus, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink,
  RefreshCw, Mail, Upload, Download, Filter, ChevronDown, ChevronUp,
  CheckSquare, Square, Search, X
} from 'lucide-react'

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
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/elevate/customers')
      const data = await response.json()
      if (data.customers) {
        setCustomers(data.customers)
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(c => {
    // Filter by verifiedEmail status
    if (stateFilter === 'active' && c.state === 'DISABLED') return false
    if (stateFilter === 'approved' && (!c.tags?.includes('approved') || c.state === 'DISABLED')) return false
    if (stateFilter === 'with_orders' && c.numberOfOrders === 0) return false
    if (stateFilter === 'DISABLED' && c.state !== 'DISABLED') return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        c.email?.toLowerCase().includes(q) ||
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.note?.toLowerCase().includes(q)
      )
    }
    return true
  })

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

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ENABLED': return 'bg-green-500/20 text-green-400'
      case 'INVITED': return 'bg-yellow-500/20 text-yellow-400'
      case 'DISABLED': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'ENABLED': return 'Activated'
      case 'INVITED': return 'Pending'
      case 'DISABLED': return 'Disabled'
      default: return state
    }
  }

  // Stats - for passwordless accounts, track approval status and orders
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.state !== 'DISABLED').length,
    approved: customers.filter(c => c.tags?.includes('approved') && c.state !== 'DISABLED').length,
    disabled: customers.filter(c => c.state === 'DISABLED').length,
    withOrders: customers.filter(c => c.numberOfOrders > 0).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Elevate Customers</h1>
          <p className="text-gray-400 mt-1">Manage wholesale customer accounts</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total Customers</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Approved</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.approved}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">With Orders</p>
          <p className="text-2xl font-bold text-blue-400">{stats.withOrders}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm">Disabled</p>
          <p className="text-2xl font-bold text-red-400">{stats.disabled}</p>
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
          Customer List
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
        <CustomerList
          customers={filteredCustomers}
          loading={loading}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          stateFilter={stateFilter}
          setStateFilter={setStateFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          getStateColor={getStateColor}
          getStateLabel={getStateLabel}
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

interface CustomerListProps {
  customers: ShopifyCustomer[]
  loading: boolean
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  selectAll: () => void
  stateFilter: string
  setStateFilter: (v: string) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  getStateColor: (s: string) => string
  getStateLabel: (s: string) => string
  sendActivationEmails: (ids: string[]) => Promise<void>
  actionLoading: boolean
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
  fetchCustomers: () => void
}

function CustomerList({
  customers, loading, selectedIds, toggleSelect, selectAll,
  stateFilter, setStateFilter, searchQuery, setSearchQuery,
  getStateColor, getStateLabel, sendActivationEmails, actionLoading,
  setMessage, fetchCustomers
}: CustomerListProps) {
  // Customers who haven't logged in yet and aren't disabled
  const notLoggedInSelected = customers.filter(c => selectedIds.has(c.id) && !c.tags?.includes('approved') && c.state !== 'DISABLED')

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="with_orders">With Orders</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">{selectedIds.size} selected</span>
            {notLoggedInSelected.length > 0 && (
              <button
                onClick={() => sendActivationEmails(notLoggedInSelected.map(c => c.id))}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Activation ({notLoggedInSelected.length})
              </button>
            )}
          </div>
        )}
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
                <th className="px-4 py-3 text-left">
                  <button onClick={selectAll} className="text-gray-400 hover:text-white">
                    {selectedIds.size === customers.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Business</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  selected={selectedIds.has(customer.id)}
                  onToggle={() => toggleSelect(customer.id)}
                  getStateColor={getStateColor}
                  getStateLabel={getStateLabel}
                  onSendActivation={() => sendActivationEmails([customer.id])}
                  actionLoading={actionLoading}
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
          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          Pending = Awaiting approval
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          Disabled = Cannot access store
        </span>
      </div>
    </div>
  )
}

interface CustomerRowProps {
  customer: ShopifyCustomer
  selected: boolean
  onToggle: () => void
  getStateColor: (s: string) => string
  getStateLabel: (s: string) => string
  onSendActivation: () => void
  actionLoading: boolean
  setMessage: (m: { type: 'success' | 'error', text: string } | null) => void
  fetchCustomers: () => void
}

function CustomerRow({
  customer, selected, onToggle, getStateColor, getStateLabel,
  onSendActivation, actionLoading, setMessage, fetchCustomers
}: CustomerRowProps) {
  const [sendingOne, setSendingOne] = useState(false)

  // Extract business name from note
  const businessMatch = customer.note?.match(/Business:\s*([^|]+)/i)
  const businessName = businessMatch ? businessMatch[1].trim() : '-'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleSendOne = async () => {
    setSendingOne(true)
    try {
      const response = await fetch('/api/elevate/customers/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: [customer.id] })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: 'success', text: `Activation email sent to ${customer.email}` })
        fetchCustomers()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSendingOne(false)
    }
  }

  return (
    <tr className="hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <button onClick={onToggle} className="text-gray-400 hover:text-white">
          {selected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
        </button>
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
      <td className="px-4 py-3 text-gray-400 text-sm">{businessName}</td>
      <td className="px-4 py-3">
        {customer.state === 'DISABLED' ? (
          <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
            Disabled
          </span>
        ) : customer.verifiedEmail ? (
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            Logged In
          </span>
        ) : (
          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
            Not Logged In
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-400">{customer.numberOfOrders}</td>
      <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(customer.createdAt)}</td>
      <td className="px-4 py-3">
        {!customer.tags?.includes('approved') && customer.state !== 'DISABLED' && (
          <button
            onClick={handleSendOne}
            disabled={sendingOne}
            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors disabled:opacity-50"
            title="Resend activation email"
          >
            {sendingOne ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Resend
          </button>
        )}
        {customer.verifiedEmail && (
          <span className="text-green-400 text-xs">Ready to order</span>
        )}
      </td>
    </tr>
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
      }).filter(r => r.email) // Only rows with email

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
            // Map common CSV headers to our field names
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
        {/* File Upload */}
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

        {/* Preview */}
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

        {/* Results */}
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

        {/* Upload Button */}
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
