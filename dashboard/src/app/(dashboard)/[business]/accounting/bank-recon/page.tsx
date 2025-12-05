'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Save,
  TrendingUp,
  Loader2,
  Calendar,
  DollarSign,
} from 'lucide-react'

interface BankStatement {
  id: string
  business_slug: string
  bank_account_id: string
  bank_account_name: string
  statement_line_id: string
  date: string
  amount: number
  description: string
  reference: string | null
  payee: string | null
  is_reconciled: boolean
  reconciled_at: string | null
  suggested_account_code: string | null
  suggested_account_name: string | null
  suggested_contact_id: string | null
  suggested_contact_name: string | null
  confidence_score: number | null
  created_at: string
}

interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string
  class: string
}

export default function BankReconPage() {
  const params = useParams()
  const business = params.business as string

  const [statements, setStatements] = useState<BankStatement[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unreconciled' | 'reconciled'>('unreconciled')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total: 0, unreconciled: 0, reconciled: 0, totalAmount: 0 })

  // Fetch bank statements
  const fetchStatements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('business', business)
      if (filter !== 'all') {
        params.set('reconciled', filter === 'reconciled' ? 'true' : 'false')
      }
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/xero/bank-statements?${params.toString()}`)
      const data = await res.json()

      if (data.statements) {
        setStatements(data.statements)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching statements:', error)
    } finally {
      setLoading(false)
    }
  }, [business, filter, dateFrom, dateTo])

  // Fetch chart of accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/xero/chart-of-accounts?business=${business}`)
      const data = await res.json()
      if (data.accounts) {
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }, [business])

  useEffect(() => {
    fetchStatements()
    fetchAccounts()
  }, [fetchStatements, fetchAccounts])

  // Import from Xero
  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/xero/bank-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business,
          fromDate: dateFrom || undefined,
          toDate: dateTo || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Imported ${data.imported} transactions`)
        fetchStatements()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error importing:', error)
      alert('Failed to import from Xero')
    } finally {
      setImporting(false)
    }
  }

  // Approve suggestion
  const handleApprove = async (statement: BankStatement) => {
    try {
      const res = await fetch(`/api/xero/bank-statements/${statement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile',
          accountCode: statement.suggested_account_code,
          contactId: statement.suggested_contact_id,
          createPattern: true,
        }),
      })
      if (res.ok) {
        fetchStatements()
      }
    } catch (error) {
      console.error('Error approving:', error)
    }
  }

  // Filter statements by search
  const filteredStatements = statements.filter(s => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      s.description?.toLowerCase().includes(term) ||
      s.payee?.toLowerCase().includes(term) ||
      s.reference?.toLowerCase().includes(term) ||
      s.suggested_account_name?.toLowerCase().includes(term)
    )
  })

  // Get confidence badge color
  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'bg-gray-200 text-gray-600'
    if (score >= 0.9) return 'bg-green-100 text-green-800'
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7" />
            Bank Reconciliation
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered bank transaction matching for {business.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStatements}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Import from Xero
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Transactions</span>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Unreconciled</span>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-600">{summary.unreconciled}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Reconciled</span>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600">{summary.reconciled}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Amount</span>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary.totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="unreconciled">Unreconciled</option>
              <option value="reconciled">Reconciled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="To"
            />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payee</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Suggestion
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading transactions...
                </td>
              </tr>
            ) : filteredStatements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredStatements.map((statement) => (
                <tr key={statement.id} className={statement.is_reconciled ? 'bg-green-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(statement.date).toLocaleDateString('en-AU')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {statement.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {statement.payee || '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                    statement.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(statement.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {statement.suggested_account_name ? (
                      <div>
                        <span className="font-medium">{statement.suggested_account_code}</span>
                        <span className="text-gray-500 ml-1">{statement.suggested_account_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No suggestion</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {statement.confidence_score && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(statement.confidence_score)}`}>
                        {Math.round(statement.confidence_score * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {statement.is_reconciled ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {statement.suggested_account_code && (
                          <button
                            onClick={() => handleApprove(statement)}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                            title="Accept suggestion"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedStatement(statement)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selectedStatement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Reconcile Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Description</label>
                <p className="font-medium">{selectedStatement.description}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Amount</label>
                <p className="font-medium">{formatCurrency(selectedStatement.amount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Account</label>
                <select
                  value={editingAccount || selectedStatement.suggested_account_code || ''}
                  onChange={(e) => setEditingAccount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="createPattern" className="rounded" />
                <label htmlFor="createPattern" className="text-sm">
                  Learn from this decision (create pattern)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedStatement(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Save reconciliation
                  await fetch(`/api/xero/bank-statements/${selectedStatement.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'reconcile',
                      accountCode: editingAccount || selectedStatement.suggested_account_code,
                      createPattern: true,
                    }),
                  })
                  setSelectedStatement(null)
                  setEditingAccount(null)
                  fetchStatements()
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
