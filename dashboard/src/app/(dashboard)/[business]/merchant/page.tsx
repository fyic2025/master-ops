'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  RefreshCw, TrendingUp, TrendingDown,
  Package, CheckCircle, XCircle, Clock,
  Eye, MousePointerClick, AlertTriangle, AlertCircle,
  ExternalLink, Copy, ChevronDown, ChevronRight,
  Search, Filter, Wrench, FileCheck, ClipboardList,
  Play, Zap, CheckCheck, RotateCcw
} from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

// Types
interface MerchantSummary {
  business: string
  lastSynced: string | null
  products: {
    total: number
    approved: number
    disapproved: number
    pending: number
  }
  issues: {
    total: number
    errors: number
    warnings: number
    suggestions: number
    byCode: Record<string, { count: number; severity: string; description: string }>
  }
  performance: {
    impressions30d: number
    clicks30d: number
    ctr: number
  }
  approvalRate: number
  hasData: boolean
  message?: string
}

interface ProductIssue {
  code: string
  severity: 'error' | 'warning' | 'suggestion'
  description: string
  detail?: string
  resolution?: string
  attribute?: string
}

interface MerchantProduct {
  product_id: string
  offer_id: string
  title: string
  approval_status: string
  availability: string
  brand: string | null
  category: string | null
  impressions_30d: number
  clicks_30d: number
  issues: ProductIssue[]
  issue_count: number
  error_count: number
  warning_count: number
  last_synced_at: string
}

interface ProductsResponse {
  products: MerchantProduct[]
  total: number
  tabCounts: {
    all: number
    approved: number
    disapproved: number
    pending: number
    has_issues: number
  }
  hasData: boolean
}

type StatusFilter = 'all' | 'approved' | 'disapproved' | 'pending' | 'has_issues'
type SortField = 'impressions' | 'clicks' | 'issues' | 'status' | 'title'

// Issue Audit Types
interface AuditProduct {
  product_id: string
  offer_id: string
  title: string
  approval_status: string
  impressions_30d: number
  clicks_30d: number
}

interface IssueAudit {
  issue_code: string
  severity: string
  description: string
  resolution: string | null
  product_count: number
  total_impressions: number
  total_clicks: number
  fixability: 'auto' | 'semi-auto' | 'manual' | 'unknown'
  status: 'pending' | 'in_progress' | 'fixed' | 'verified'
  products: AuditProduct[]
}

interface AuditResponse {
  hasData: boolean
  business: string
  summary: {
    total_issues: number
    total_affected_products: number
    by_severity: { error: number; warning: number; suggestion: number }
    by_fixability: { auto: number; 'semi-auto': number; manual: number; unknown: number }
    by_status: { pending: number; in_progress: number; fixed: number; verified: number }
  }
  issues: IssueAudit[]
}

// Formatting helpers
function formatNumber(value: number | null | undefined): string {
  if (value == null) return '--'
  return new Intl.NumberFormat('en-AU').format(Math.round(value))
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '--'
  return `${value.toFixed(1)}%`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MerchantCenterPage() {
  const params = useParams()
  const business = params.business as string

  const [summary, setSummary] = useState<MerchantSummary | null>(null)
  const [products, setProducts] = useState<MerchantProduct[]>([])
  const [tabCounts, setTabCounts] = useState({ all: 0, approved: 0, disapproved: 0, pending: 0, has_issues: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortField>('impressions')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [showIssueBreakdown, setShowIssueBreakdown] = useState(false)

  // Issue Audit state
  const [auditData, setAuditData] = useState<AuditResponse | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [showAudit, setShowAudit] = useState(true)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Date range (for future trend comparison)
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'last_30') || presets[3])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch summary
      const summaryRes = await fetch(`/api/merchant/summary?business=${business}`)
      if (!summaryRes.ok) throw new Error('Failed to fetch merchant summary')
      const summaryData = await summaryRes.json()
      setSummary(summaryData)

      // Fetch products
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
      const productsRes = await fetch(
        `/api/merchant/products?business=${business}&status=${statusFilter}&sortBy=${sortBy}&limit=100${searchParam}`
      )
      if (!productsRes.ok) throw new Error('Failed to fetch products')
      const productsData: ProductsResponse = await productsRes.json()
      setProducts(productsData.products || [])
      setTabCounts(productsData.tabCounts || { all: 0, approved: 0, disapproved: 0, pending: 0, has_issues: 0 })

      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAudit = async () => {
    setAuditLoading(true)
    try {
      const auditRes = await fetch(`/api/merchant/audit?business=${business}`)
      if (!auditRes.ok) throw new Error('Failed to fetch audit data')
      const data: AuditResponse = await auditRes.json()
      setAuditData(data)
    } catch (err: any) {
      console.error('Audit fetch error:', err)
    } finally {
      setAuditLoading(false)
    }
  }

  // Trigger GMC sync from dashboard
  const triggerSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/jobs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName: 'gmc-sync' }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncMessage({ type: 'success', text: `Synced successfully! ${data.output?.match(/Total: \d+/)?.[0] || ''}` })
        // Refresh data after sync
        fetchData()
        fetchAudit()
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Sync failed' })
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message })
    } finally {
      setSyncing(false)
    }
  }

  // Bulk mark all pending issues as accepted (for informational warnings)
  const bulkAcceptWarnings = async () => {
    if (!auditData?.issues) return
    const warningIssues = auditData.issues.filter(i => i.severity === 'warning' && i.status === 'pending')
    for (const issue of warningIssues) {
      await updateResolutionStatus(issue.issue_code, 'verified', 'Bulk accepted - informational warning')
    }
    fetchAudit()
  }

  useEffect(() => {
    fetchData()
  }, [business, statusFilter, sortBy, searchQuery])

  useEffect(() => {
    fetchAudit()
  }, [business])

  // Update issue resolution status
  const updateResolutionStatus = async (issueCode: string, status: 'pending' | 'in_progress' | 'fixed' | 'verified', notes?: string) => {
    try {
      const res = await fetch(`/api/merchant/resolution?business=${business}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_code: issueCode, status, fix_notes: notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }
      // Refresh audit data
      fetchAudit()
    } catch (err: any) {
      console.error('Failed to update resolution:', err)
      alert(`Failed to update: ${err.message}`)
    }
  }

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    if (compareRange) {
      setCompareRange(getCompareRange(range))
    }
  }

  const copyProductIssues = (product: MerchantProduct) => {
    const issueText = product.issues
      .map(i => `- [${i.severity.toUpperCase()}] ${i.code}: ${i.description}${i.detail ? ` (${i.detail})` : ''}`)
      .join('\n')

    const text = `Product: ${product.title}
SKU: ${product.offer_id}
Status: ${product.approval_status}
Impressions (30d): ${formatNumber(product.impressions_30d)}
Clicks (30d): ${formatNumber(product.clicks_30d)}

Issues (${product.issue_count}):
${issueText}`

    navigator.clipboard.writeText(text)
  }

  // No data state
  if (!loading && (!summary?.hasData)) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-white">Google Merchant Center</h1>
          <p className="text-gray-400 mt-1">Product feed status and disapprovals</p>
        </header>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Data Available</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {summary?.message || 'Google Merchant Center data has not been synced yet.'}
          </p>
          <a
            href="https://merchants.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Open Merchant Center
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Google Merchant Center</h1>
          <p className="text-gray-400 mt-1">
            Product feed status and disapprovals
            {summary?.lastSynced && (
              <span className="ml-2 text-gray-500">· Last synced: {formatDate(summary.lastSynced)}</span>
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
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Sync from Google Merchant Center"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <a
            href="https://merchants.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Open Google Merchant Center"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Sync Status Message */}
      {syncMessage && (
        <div className={`px-4 py-3 rounded-lg flex items-center justify-between ${
          syncMessage.type === 'success'
            ? 'bg-green-900/50 border border-green-700 text-green-200'
            : 'bg-red-900/50 border border-red-700 text-red-200'
        }`}>
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="text-white/70 hover:text-white">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Total Products"
          value={formatNumber(summary?.products.total)}
          icon={Package}
          color="text-blue-400"
        />
        <MetricCard
          label="Approved"
          value={formatNumber(summary?.products.approved)}
          icon={CheckCircle}
          color="text-green-400"
          subtext={summary ? `${formatPercent(summary.approvalRate)} approval rate` : undefined}
        />
        <MetricCard
          label="Disapproved"
          value={formatNumber(summary?.products.disapproved)}
          icon={XCircle}
          color="text-red-400"
        />
        <MetricCard
          label="Pending"
          value={formatNumber(summary?.products.pending)}
          icon={Clock}
          color="text-yellow-400"
        />
        <MetricCard
          label="Impressions (30d)"
          value={formatNumber(summary?.performance.impressions30d)}
          icon={Eye}
          color="text-purple-400"
        />
        <MetricCard
          label="Clicks (30d)"
          value={formatNumber(summary?.performance.clicks30d)}
          icon={MousePointerClick}
          color="text-cyan-400"
          subtext={summary ? `${formatPercent(summary.performance.ctr)} CTR` : undefined}
        />
      </div>

      {/* Issue Summary Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowIssueBreakdown(!showIssueBreakdown)}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <span className="text-lg font-semibold text-white">Issue Summary</span>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm font-medium">
                {summary?.issues.errors || 0} Critical
              </span>
              <span className="px-3 py-1 bg-orange-900/30 text-orange-400 rounded-full text-sm font-medium">
                {summary?.issues.warnings || 0} Warnings
              </span>
              <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm font-medium">
                {summary?.issues.suggestions || 0} Suggestions
              </span>
            </div>
          </div>
          {showIssueBreakdown ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showIssueBreakdown && summary?.issues.byCode && (
          <div className="px-4 pb-4 border-t border-gray-800">
            <div className="mt-4 space-y-2">
              {Object.entries(summary.issues.byCode)
                .sort((a, b) => {
                  const severityOrder = { error: 0, warning: 1, suggestion: 2 }
                  const aSev = severityOrder[a[1].severity as keyof typeof severityOrder] ?? 3
                  const bSev = severityOrder[b[1].severity as keyof typeof severityOrder] ?? 3
                  if (aSev !== bSev) return aSev - bSev
                  return b[1].count - a[1].count
                })
                .slice(0, 20)
                .map(([code, data]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityStyle(data.severity)}`}>
                        {data.severity}
                      </span>
                      <span className="text-white font-mono text-sm">{code}</span>
                      <span className="text-gray-400 text-sm truncate max-w-md">{data.description}</span>
                    </div>
                    <span className="text-gray-300 font-medium">{data.count} products</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Issue Audit Section - Detailed with expandable products */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-semibold text-white">Issue Audit</span>
            {auditData && (
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm font-medium">
                  {auditData.summary.by_fixability.auto} Auto-Fix
                </span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-sm font-medium">
                  {auditData.summary.by_fixability['semi-auto']} Semi-Auto
                </span>
                <span className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-sm font-medium">
                  {auditData.summary.by_fixability.manual} Manual
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {auditLoading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
            {showAudit ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Quick Actions Toolbar */}
        {showAudit && auditData && (
          <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-800 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-400 mr-2">Quick Actions:</span>
            <button
              onClick={bulkAcceptWarnings}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-yellow-900/50 text-yellow-400 hover:bg-yellow-800/50 rounded transition-colors"
              title="Accept all warnings as informational"
            >
              <CheckCheck className="w-3 h-3" />
              Accept All Warnings ({auditData.issues.filter(i => i.severity === 'warning' && i.status === 'pending').length})
            </button>
            <button
              onClick={() => {
                // Mark all auto-fixable as fixed
                auditData.issues
                  .filter(i => i.fixability === 'auto' && i.status === 'pending')
                  .forEach(i => updateResolutionStatus(i.issue_code, 'fixed', 'Auto-fix applied'))
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-900/50 text-green-400 hover:bg-green-800/50 rounded transition-colors"
              title="Mark auto-fixable issues as fixed"
            >
              <Zap className="w-3 h-3" />
              Auto-Fix All ({auditData.issues.filter(i => i.fixability === 'auto' && i.status === 'pending').length})
            </button>
            <button
              onClick={() => {
                // Reset all to pending
                auditData.issues
                  .filter(i => i.status !== 'pending')
                  .forEach(i => updateResolutionStatus(i.issue_code, 'pending'))
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 rounded transition-colors"
              title="Reset all issue statuses"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
            <div className="flex-1" />
            <span className="text-xs text-gray-500">
              {auditData.summary.by_status.pending} pending · {auditData.summary.by_status.fixed} fixed · {auditData.summary.by_status.verified} verified
            </span>
          </div>
        )}

        {showAudit && auditData?.issues && (
          <div className="border-t border-gray-800">
            {/* Audit Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-800 text-sm font-medium text-gray-400">
              <div className="col-span-3">Issue Code</div>
              <div className="col-span-1 text-center">Severity</div>
              <div className="col-span-1 text-center">Products</div>
              <div className="col-span-1 text-center">Fixability</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Impressions</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>

            {/* Audit Table Rows */}
            <div className="divide-y divide-gray-800">
              {auditData.issues.map((issue) => (
                <div key={issue.issue_code}>
                  {/* Issue Row */}
                  <div
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-800/50 items-center"
                  >
                    <div
                      className="col-span-3 flex items-center gap-2 cursor-pointer"
                      onClick={() => setExpandedIssue(expandedIssue === issue.issue_code ? null : issue.issue_code)}
                    >
                      {expandedIssue === issue.issue_code ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-mono text-sm text-white">{issue.issue_code}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{issue.description}</div>
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityStyle(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-white font-medium">
                      {issue.product_count}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getFixabilityStyle(issue.fixability)}`}>
                        {issue.fixability === 'semi-auto' ? 'semi' : issue.fixability}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(issue.status)}`}>
                        {issue.status}
                      </span>
                    </div>
                    <div className="col-span-2 text-right text-gray-300">
                      {formatNumber(issue.total_impressions)}
                    </div>
                    <div className="col-span-2 flex justify-center gap-1">
                      {issue.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateResolutionStatus(issue.issue_code, 'fixed')
                          }}
                          className="px-2 py-1 text-xs bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 rounded transition-colors"
                          title="Mark as Fixed"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Fixed
                        </button>
                      )}
                      {issue.status === 'fixed' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateResolutionStatus(issue.issue_code, 'verified')
                            }}
                            className="px-2 py-1 text-xs bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800/50 rounded transition-colors"
                            title="Mark as Verified"
                          >
                            <FileCheck className="w-3 h-3 inline mr-1" />
                            Verify
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateResolutionStatus(issue.issue_code, 'pending')
                            }}
                            className="px-2 py-1 text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 rounded transition-colors"
                            title="Reset to Pending"
                          >
                            ↩
                          </button>
                        </>
                      )}
                      {issue.status === 'verified' && (
                        <span className="px-2 py-1 text-xs text-emerald-400">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Products List */}
                  {expandedIssue === issue.issue_code && (
                    <div className="bg-gray-800/30 px-4 py-3 border-t border-gray-700">
                      {/* Resolution Options */}
                      <div className="mb-4 p-3 bg-gray-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">Resolution Plan</span>
                          {issue.resolution && (
                            <span className="text-xs text-green-400">
                              GMC says: {issue.resolution}
                            </span>
                          )}
                        </div>

                        {/* Quick Fix Options based on issue type */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {issue.issue_code === 'landing_page_error' && (
                            <>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Hide from Google Shopping in BigCommerce')}
                                className="px-3 py-1.5 text-xs bg-blue-900/50 text-blue-400 hover:bg-blue-800/50 rounded transition-colors"
                              >
                                Hide from Shopping
                              </button>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Set up 301 redirects to similar products')}
                                className="px-3 py-1.5 text-xs bg-purple-900/50 text-purple-400 hover:bg-purple-800/50 rounded transition-colors"
                              >
                                Add Redirects
                              </button>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Products discontinued - removed from feed')}
                                className="px-3 py-1.5 text-xs bg-orange-900/50 text-orange-400 hover:bg-orange-800/50 rounded transition-colors"
                              >
                                Remove from Feed
                              </button>
                            </>
                          )}
                          {issue.issue_code === 'personal_hardships_policy_violation' && (
                            <>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Reviewed titles - removed health claims')}
                                className="px-3 py-1.5 text-xs bg-blue-900/50 text-blue-400 hover:bg-blue-800/50 rounded transition-colors"
                              >
                                Remove Health Claims
                              </button>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'verified', 'Warning only - products still approved')}
                                className="px-3 py-1.5 text-xs bg-green-900/50 text-green-400 hover:bg-green-800/50 rounded transition-colors"
                              >
                                Accept Warning
                              </button>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Excluded sensitive products from Shopping Ads')}
                                className="px-3 py-1.5 text-xs bg-purple-900/50 text-purple-400 hover:bg-purple-800/50 rounded transition-colors"
                              >
                                Exclude from Ads
                              </button>
                            </>
                          )}
                          {/* Generic options for other issue types */}
                          {!['landing_page_error', 'personal_hardships_policy_violation'].includes(issue.issue_code) && (
                            <>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'verified', 'Informational warning - no action needed')}
                                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors"
                              >
                                Accept (Info Only)
                              </button>
                              <button
                                onClick={() => updateResolutionStatus(issue.issue_code, 'fixed', 'Triggered feed resync')}
                                className="px-3 py-1.5 text-xs bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 rounded transition-colors"
                              >
                                Resync Feed
                              </button>
                            </>
                          )}
                        </div>

                        {/* Custom notes input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add custom resolution note..."
                            className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                updateResolutionStatus(issue.issue_code, 'fixed', e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              if (input?.value) {
                                updateResolutionStatus(issue.issue_code, 'fixed', input.value)
                                input.value = ''
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 rounded transition-colors"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>

                      {/* Affected Products */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400">
                          Affected Products ({issue.products.length})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {issue.products.slice(0, 20).map((product) => (
                          <div
                            key={product.product_id}
                            className="flex items-center justify-between p-2 bg-gray-900 rounded text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-blue-400">{product.offer_id}</span>
                              <span className="text-white truncate max-w-md">{product.title}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-400">
                              <span>{formatNumber(product.impressions_30d)} imp</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(product.approval_status)}`}>
                                {product.approval_status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {issue.products.length > 20 && (
                          <div className="text-center text-sm text-gray-500 py-2">
                            ... and {issue.products.length - 20} more products
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {auditData.issues.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                No issues found - all products are healthy!
              </div>
            )}
          </div>
        )}
      </section>

      {/* Products Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {/* Filter Tabs */}
        <div className="border-b border-gray-800">
          <nav className="flex flex-wrap">
            <TabButton
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              icon={Package}
              label="All"
              count={tabCounts.all}
            />
            <TabButton
              active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              icon={CheckCircle}
              label="Approved"
              count={tabCounts.approved}
              color="text-green-400"
            />
            <TabButton
              active={statusFilter === 'disapproved'}
              onClick={() => setStatusFilter('disapproved')}
              icon={XCircle}
              label="Disapproved"
              count={tabCounts.disapproved}
              color="text-red-400"
            />
            <TabButton
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              icon={Clock}
              label="Pending"
              count={tabCounts.pending}
              color="text-yellow-400"
            />
            <TabButton
              active={statusFilter === 'has_issues'}
              onClick={() => setStatusFilter('has_issues')}
              icon={AlertTriangle}
              label="Has Issues"
              count={tabCounts.has_issues}
              color="text-orange-400"
            />
          </nav>
        </div>

        {/* Search and Sort */}
        <div className="p-4 border-b border-gray-800 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by SKU or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="impressions">Sort by Impressions</option>
              <option value="clicks">Sort by Clicks</option>
              <option value="issues">Sort by Issues</option>
              <option value="status">Sort by Status</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Title</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Issues</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Impressions</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Clicks</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {loading ? 'Loading...' : 'No products found'}
                  </td>
                </tr>
              ) : (
                products.slice(0, 50).map((product) => (
                  <ProductRow
                    key={product.product_id}
                    product={product}
                    expanded={expandedProduct === product.product_id}
                    onToggle={() => setExpandedProduct(
                      expandedProduct === product.product_id ? null : product.product_id
                    )}
                    onCopy={() => copyProductIssues(product)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {products.length > 50 && (
          <div className="p-4 border-t border-gray-800 text-center text-sm text-gray-500">
            Showing top 50 of {products.length} products
          </div>
        )}
      </section>
    </div>
  )
}

// Components
function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string
  value: string
  icon: any
  color: string
  subtext?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && (
        <p className="text-xs text-gray-500 mt-1">{subtext}</p>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color = 'text-gray-400',
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
  count: number
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-purple-500 text-white bg-gray-800/50'
          : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : color}`} />
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-700 text-gray-400'}`}>
        {count}
      </span>
    </button>
  )
}

function ProductRow({
  product,
  expanded,
  onToggle,
  onCopy,
}: {
  product: MerchantProduct
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
}) {
  return (
    <>
      <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <span className="font-mono text-sm text-blue-400">{product.offer_id}</span>
        </td>
        <td className="px-4 py-3">
          <div className="max-w-sm truncate text-white">{product.title}</div>
          {product.brand && (
            <div className="text-xs text-gray-500">{product.brand}</div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(product.approval_status)}`}>
            {product.approval_status}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {product.issue_count > 0 ? (
            <div className="flex items-center justify-center gap-1">
              {product.error_count > 0 && (
                <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs">
                  {product.error_count}
                </span>
              )}
              {product.warning_count > 0 && (
                <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded text-xs">
                  {product.warning_count}
                </span>
              )}
              {product.issue_count - product.error_count - product.warning_count > 0 && (
                <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded text-xs">
                  {product.issue_count - product.error_count - product.warning_count}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-600">--</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-gray-300">
          {formatNumber(product.impressions_30d)}
        </td>
        <td className="px-4 py-3 text-right text-gray-300">
          {formatNumber(product.clicks_30d)}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Copy issue details"
            >
              <Copy className="w-4 h-4" />
            </button>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </td>
      </tr>
      {expanded && product.issues.length > 0 && (
        <tr className="bg-gray-800/30">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-300 mb-3">Issues ({product.issues.length})</div>
              {product.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-gray-900 rounded border border-gray-700"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${getSeverityStyle(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  <div className="flex-1">
                    <div className="font-mono text-sm text-white">{issue.code}</div>
                    <div className="text-sm text-gray-400 mt-1">{issue.description}</div>
                    {issue.detail && (
                      <div className="text-xs text-gray-500 mt-1">{issue.detail}</div>
                    )}
                    {issue.resolution && (
                      <div className="text-xs text-green-400 mt-2">
                        Resolution: {issue.resolution}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    approved: 'bg-green-900/30 text-green-400',
    disapproved: 'bg-red-900/30 text-red-400',
    pending: 'bg-yellow-900/30 text-yellow-400',
    // Resolution statuses
    in_progress: 'bg-blue-900/30 text-blue-400',
    fixed: 'bg-cyan-900/30 text-cyan-400',
    verified: 'bg-emerald-900/30 text-emerald-400',
  }
  return styles[status] || 'bg-gray-700 text-gray-400'
}

function getSeverityStyle(severity: string): string {
  const styles: Record<string, string> = {
    error: 'bg-red-900/30 text-red-400',
    warning: 'bg-orange-900/30 text-orange-400',
    suggestion: 'bg-yellow-900/30 text-yellow-400',
  }
  return styles[severity] || 'bg-gray-700 text-gray-400'
}

function getFixabilityStyle(fixability: string): string {
  const styles: Record<string, string> = {
    auto: 'bg-green-900/30 text-green-400',
    'semi-auto': 'bg-blue-900/30 text-blue-400',
    manual: 'bg-purple-900/30 text-purple-400',
    unknown: 'bg-gray-700 text-gray-400',
  }
  return styles[fixability] || 'bg-gray-700 text-gray-400'
}
