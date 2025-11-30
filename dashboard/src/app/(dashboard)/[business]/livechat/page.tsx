'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  RefreshCw, MessageSquare, Clock, AlertTriangle,
  TrendingDown, Zap, Users, ExternalLink,
  Search, ChevronRight, ChevronDown, Copy, Check, Download,
  ShoppingBag, DollarSign, Calendar, MessageCircle, User
} from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets } from '@/components/DateRangeSelector'

// Types
interface CustomerData {
  bc_customer_id: number | null
  order_count: number
  lifetime_value: number
  last_order_date: string | null
  past_chats_count: number
  recent_orders?: {
    order_id: number
    total: number
    status: string
    date: string
  }[]
}

interface Conversation {
  id: string
  livechat_id: string
  customer_name: string | null
  customer_email: string | null
  agent_name: string | null
  started_at: string
  status: string
  issue_category: string | null
  sentiment: string | null
  urgency: string | null
  message_count: number
  ai_summary: string | null
  customer_data: CustomerData | null
  latest_message_preview: string | null
  pending_suggestion_id: string | null
}

interface Message {
  id: string
  message_type: string
  author_type: string
  author_name: string | null
  content: string | null
  created_at_livechat: string
}

interface ConversationDetail extends Conversation {
  messages: Message[]
  duration_seconds: number | null
  first_response_time_seconds: number | null
  ai_insights: any
}

interface Summary {
  metrics: {
    totalConversations: number
    activeNow: number
    avgResponseTime: number
    avgDuration: number
    negativePercent: number
    urgentCount: number
  }
  byCategory: Record<string, number>
  pendingReplies: number
  lastSynced: string | null
  hasData: boolean
  message?: string
}

type CategoryFilter = 'all' | 'checkout_issues' | 'order_status' | 'returns_refunds' | 'stock_availability' | 'urgent'

// Helpers
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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--'
  const mins = Math.floor(seconds / 60)
  return `${mins}min`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  }).format(value)
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    checkout_issues: 'bg-red-900/30 text-red-400',
    order_status: 'bg-blue-900/30 text-blue-400',
    returns_refunds: 'bg-orange-900/30 text-orange-400',
    stock_availability: 'bg-yellow-900/30 text-yellow-400',
    product_inquiry: 'bg-purple-900/30 text-purple-400',
    shipping: 'bg-cyan-900/30 text-cyan-400',
  }
  return colors[category || ''] || 'bg-gray-700 text-gray-300'
}

function getSentimentColor(sentiment: string | null): string {
  const colors: Record<string, string> = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
    mixed: 'text-yellow-400',
  }
  return colors[sentiment || ''] || 'text-gray-400'
}

function getUrgencyBadge(urgency: string | null): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-600 text-white',
    medium: 'bg-yellow-600 text-black',
    low: 'bg-gray-600 text-white',
  }
  return colors[urgency || ''] || 'bg-gray-700 text-gray-300'
}

// Components
function MetricCard({ label, value, icon: Icon, color, subtext }: {
  label: string
  value: string | number
  icon: any
  color: string
  subtext?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-800 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label, count, color }: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-orange-500 text-white'
          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
      }`}
    >
      {label}
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
        active ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
      } ${color || ''}`}>
        {count}
      </span>
    </button>
  )
}

export default function LiveChatPage() {
  const params = useParams()
  const business = params.business as string

  const [summary, setSummary] = useState<Summary | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<ConversationDetail | null>(null)
  const [tabCounts, setTabCounts] = useState({ all: 0, checkout_issues: 0, order_status: 0, returns_refunds: 0, stock_availability: 0, urgent: 0 })
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [ordersExpanded, setOrdersExpanded] = useState(false)

  // Date range
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'last_30') || presets[3])

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/livechat/summary?business=${business}&from=${dateRange.start.toISOString()}&to=${dateRange.end.toISOString()}`
      )
      if (!res.ok) throw new Error('Failed to fetch summary')
      const data = await res.json()
      setSummary(data)
    } catch (err: any) {
      console.error('Summary fetch error:', err)
    }
  }, [business, dateRange])

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
      const categoryParam = categoryFilter !== 'all' ? `&category=${categoryFilter}` : ''

      const res = await fetch(
        `/api/livechat/conversations?business=${business}&from=${dateRange.start.toISOString()}&to=${dateRange.end.toISOString()}${categoryParam}${searchParam}&limit=100`
      )
      if (!res.ok) throw new Error('Failed to fetch conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
      setTabCounts(data.tabCounts || { all: 0, checkout_issues: 0, order_status: 0, returns_refunds: 0, stock_availability: 0, urgent: 0 })
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [business, dateRange, categoryFilter, searchQuery])

  const fetchConversationDetail = async (convId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/livechat/conversation/${convId}`)
      if (!res.ok) throw new Error('Failed to fetch conversation')
      const data = await res.json()
      setSelectedConv(data)
    } catch (err: any) {
      console.error('Detail fetch error:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    fetchConversations()
  }, [fetchSummary, fetchConversations])

  const handleConvSelect = (conv: Conversation) => {
    fetchConversationDetail(conv.id)
  }

  const copyForClaudeCode = () => {
    if (!selectedConv) return

    const messages = selectedConv.messages
      .filter(m => m.content)
      .map(m => `[${m.author_type.toUpperCase()}] ${formatTime(m.created_at_livechat)}: ${m.content}`)
      .join('\n\n')

    const text = `## LiveChat Conversation
Customer: ${selectedConv.customer_name || 'Unknown'} (${selectedConv.customer_email || 'No email'})
Category: ${selectedConv.issue_category || 'Uncategorized'}
Sentiment: ${selectedConv.sentiment || 'Unknown'}
Urgency: ${selectedConv.urgency || 'Unknown'}
Started: ${formatDate(selectedConv.started_at)}
Duration: ${formatDuration(selectedConv.duration_seconds)}

### AI Summary
${selectedConv.ai_summary || 'No summary available'}

### Messages
${messages}

### Customer Context
${selectedConv.customer_data ? `
- BC Customer ID: ${selectedConv.customer_data.bc_customer_id || 'Not found'}
- Orders: ${selectedConv.customer_data.order_count}
- Lifetime Value: ${formatCurrency(selectedConv.customer_data.lifetime_value)}
- Last Order: ${selectedConv.customer_data.last_order_date ? formatDate(selectedConv.customer_data.last_order_date) : 'Never'}
- Past Chats: ${selectedConv.customer_data.past_chats_count}
` : 'No customer data available'}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // No data state
  if (!loading && !summary?.hasData) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">LiveChat Analytics</h1>
          <p className="text-gray-400 mt-1">Customer support insights and common issues</p>
        </header>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Data Available</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {summary?.message || 'LiveChat data has not been synced yet.'}
          </p>
          <a
            href="https://my.livechat.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Open LiveChat
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
          <h1 className="text-2xl font-bold text-white">LiveChat Analytics</h1>
          <p className="text-gray-400 mt-1">
            Customer support insights
            {summary?.lastSynced && (
              <span className="ml-2 text-gray-500">· Last synced: {formatDate(summary.lastSynced)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />
          <button
            onClick={() => { fetchSummary(); fetchConversations(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Conversations"
          value={summary?.metrics.totalConversations || 0}
          icon={MessageSquare}
          color="text-blue-400"
        />
        <MetricCard
          label="Active Now"
          value={summary?.metrics.activeNow || 0}
          icon={Zap}
          color="text-green-400"
        />
        <MetricCard
          label="Avg Response"
          value={summary?.metrics.avgResponseTime ? `${Math.round(summary.metrics.avgResponseTime / 60)}min` : '--'}
          icon={Clock}
          color="text-purple-400"
        />
        <MetricCard
          label="Negative"
          value={`${summary?.metrics.negativePercent || 0}%`}
          icon={TrendingDown}
          color="text-red-400"
        />
        <MetricCard
          label="Urgent"
          value={summary?.metrics.urgentCount || 0}
          icon={AlertTriangle}
          color="text-orange-400"
        />
        <MetricCard
          label="Pending Replies"
          value={summary?.pendingReplies || 0}
          icon={MessageCircle}
          color="text-cyan-400"
        />
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
        {/* Left: Conversation List */}
        <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="border-b border-gray-800 overflow-x-auto">
            <nav className="flex">
              <TabButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} label="All" count={tabCounts.all} />
              <TabButton active={categoryFilter === 'checkout_issues'} onClick={() => setCategoryFilter('checkout_issues')} label="Checkout" count={tabCounts.checkout_issues} />
              <TabButton active={categoryFilter === 'order_status'} onClick={() => setCategoryFilter('order_status')} label="Orders" count={tabCounts.order_status} />
              <TabButton active={categoryFilter === 'urgent'} onClick={() => setCategoryFilter('urgent')} label="Urgent" count={tabCounts.urgent} color="text-red-400" />
            </nav>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by email or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations found
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConvSelect(conv)}
                  className={`w-full p-3 border-b border-gray-800 text-left hover:bg-gray-800/50 transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {conv.customer_email || conv.customer_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(conv.issue_category)}`}>
                          {conv.issue_category?.replace('_', ' ') || 'uncategorized'}
                        </span>
                        {conv.urgency && ['high', 'critical'].includes(conv.urgency) && (
                          <span className={`px-2 py-0.5 rounded text-xs ${getUrgencyBadge(conv.urgency)}`}>
                            {conv.urgency}
                          </span>
                        )}
                      </div>
                      {conv.latest_message_preview && (
                        <p className="text-sm text-gray-400 mt-1 truncate">
                          {conv.latest_message_preview}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{formatRelativeTime(conv.started_at)}</p>
                      <p className="text-xs text-gray-600 mt-1">{conv.message_count} msgs</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Middle: Conversation Detail */}
        <div className="col-span-5 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation to view details</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedConv.customer_email || selectedConv.customer_name || 'Unknown Customer'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(selectedConv.issue_category)}`}>
                        {selectedConv.issue_category?.replace('_', ' ') || 'uncategorized'}
                      </span>
                      <span className={`text-sm ${getSentimentColor(selectedConv.sentiment)}`}>
                        {selectedConv.sentiment || 'unknown'}
                      </span>
                      {selectedConv.urgency && (
                        <span className={`px-2 py-0.5 rounded text-xs ${getUrgencyBadge(selectedConv.urgency)}`}>
                          {selectedConv.urgency}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={copyForClaudeCode}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy for Claude'}
                  </button>
                </div>
                {selectedConv.ai_summary && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-300">{selectedConv.ai_summary}</p>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.author_type === 'customer' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.author_type === 'customer'
                        ? 'bg-gray-800 text-white'
                        : 'bg-orange-600/20 text-orange-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-70">
                          {msg.author_type === 'customer' ? 'Customer' : msg.author_name || 'Agent'}
                        </span>
                        <span className="text-xs opacity-50">{formatTime(msg.created_at_livechat)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content || '[No content]'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Customer & Reply Panel */}
        <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Customer details will appear here</p>
              </div>
            </div>
          ) : (
            <>
              {/* Customer Info */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Info
                  </h4>
                  {selectedConv.customer_data?.bc_customer_id && (
                    <a
                      href={`https://store-hhhi.mybigcommerce.com/manage/customers/${selectedConv.customer_data.bc_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs bg-blue-900/30 px-2 py-1 rounded"
                    >
                      View in BC
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {selectedConv.customer_data ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setOrdersExpanded(!ordersExpanded)}
                        className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-2 text-left transition-colors"
                      >
                        <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                          <span className="flex items-center gap-2">
                            <ShoppingBag className="w-3 h-3" />
                            Orders
                          </span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${ordersExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <p className="font-semibold text-white">{selectedConv.customer_data.order_count}</p>
                      </button>
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                          <DollarSign className="w-3 h-3" />
                          LTV
                        </div>
                        <p className="font-semibold text-white">{formatCurrency(selectedConv.customer_data.lifetime_value)}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                          <Calendar className="w-3 h-3" />
                          Last Order
                        </div>
                        <p className="font-semibold text-white text-sm">
                          {selectedConv.customer_data.last_order_date
                            ? formatDate(selectedConv.customer_data.last_order_date).split(',')[0]
                            : 'Never'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                          <MessageCircle className="w-3 h-3" />
                          Past Chats
                        </div>
                        <p className="font-semibold text-white">{selectedConv.customer_data.past_chats_count}</p>
                      </div>
                    </div>

                    {/* Expandable Recent Orders */}
                    {ordersExpanded && selectedConv.customer_data.recent_orders && selectedConv.customer_data.recent_orders.length > 0 && (
                      <div className="bg-gray-800/30 rounded-lg p-2 space-y-2">
                        <p className="text-xs text-gray-400 font-medium">Recent Orders</p>
                        {selectedConv.customer_data.recent_orders.map((order) => (
                          <a
                            key={order.order_id}
                            href={`https://store-hhhi.mybigcommerce.com/manage/orders/${order.order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">#{order.order_id}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                order.status === 'Completed' || order.status === 'Shipped'
                                  ? 'bg-green-900/50 text-green-400'
                                  : order.status === 'Pending' || order.status === 'Awaiting Fulfillment'
                                  ? 'bg-yellow-900/50 text-yellow-400'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">
                                {new Date(order.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-white text-sm font-medium">{formatCurrency(order.total)}</span>
                              <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-blue-400" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No customer data found</p>
                )}
              </div>

              {/* AI Reply Section - Placeholder for Phase 2 */}
              <div className="flex-1 p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  AI Reply
                </h4>
                <div className="bg-gray-800/30 border border-gray-700 border-dashed rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm mb-3">AI reply generation coming soon</p>
                  <a
                    href="https://my.livechat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in LiveChat
                  </a>
                </div>
              </div>

              {/* Conversation Stats */}
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Started</span>
                  <span className="text-white">{formatDate(selectedConv.started_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{formatDuration(selectedConv.duration_seconds)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-400">Response Time</span>
                  <span className="text-white">{formatDuration(selectedConv.first_response_time_seconds)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
