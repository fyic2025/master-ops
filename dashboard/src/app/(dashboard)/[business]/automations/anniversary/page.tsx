'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Gift,
  Settings,
  BarChart3,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  MousePointer2,
  Loader2,
  AlertCircle,
  Send,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  TrendingUp,
  Package
} from 'lucide-react'

interface AnniversaryConfig {
  enabled: boolean
  daily_limit: number
  discount_percent: number
  expiration_days: number
  small_size_lead_days: number
  large_size_lead_days: number
  large_size_threshold_grams: number
  sender_email: string
  sender_name: string
  discount_code_format: string
}

interface AnniversaryStats {
  total_sent: number
  total_opened: number
  total_clicked: number
  total_converted: number
  total_failed: number
  total_revenue: number
  sent_today: number
  sent_this_week: number
  open_rate_percent: number
  click_rate_percent: number
  conversion_rate_percent: number
  upsell_sent: number
  repeat_only_sent: number
  upsell_converted: number
  avg_upsell_savings_percent: number
}

interface RecentEmail {
  id: string
  email: string
  first_name: string | null
  status: 'active' | 'sent' | 'clicked' | 'used' | 'expired' | 'failed'
  created_at: string
  converted_order_total: number | null
  original_product_type: string | null
  original_product_size: number | null
  is_largest_size: boolean
  upsell_savings_percent: number | null
}

interface QueueStatus {
  date: string
  summary: {
    total: number
    pending: number
    sent: number
    failed: number
  }
  byHour: Record<number, { pending: number; sent: number; failed: number }>
}

export default function AnniversaryPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<AnniversaryConfig | null>(null)
  const [stats, setStats] = useState<AnniversaryStats | null>(null)
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([])
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
  })
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchData = useCallback(async (date?: string) => {
    try {
      const targetDate = date || selectedDate
      const [configRes, statsRes, recentRes, queueRes] = await Promise.all([
        fetch('/api/automations/config'),
        fetch('/api/automations/anniversary/stats'),
        fetch('/api/automations/anniversary/recent'),
        fetch(`/api/automations/anniversary/queue?date=${targetDate}`)
      ])

      if (configRes.ok) {
        const data = await configRes.json()
        const anniversaryConfig = data.automations?.find((a: any) => a.automation_type === 'anniversary_upsell')
        if (anniversaryConfig) {
          setConfig({
            enabled: anniversaryConfig.enabled,
            ...anniversaryConfig.config
          })
        }
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (recentRes.ok) {
        const data = await recentRes.json()
        setRecentEmails(data.emails || [])
      }

      if (queueRes.ok) {
        const data = await queueRes.json()
        setQueueStatus(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    if (business !== 'teelixir') return
    fetchData()
  }, [business, fetchData])

  const toggleEnabled = async () => {
    if (!config) return
    setActionLoading('toggle')
    try {
      const res = await fetch('/api/automations/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_type: 'anniversary_upsell',
          enabled: !config.enabled
        })
      })
      if (res.ok) {
        setConfig({ ...config, enabled: !config.enabled })
        setSuccessMessage(`Automation ${!config.enabled ? 'enabled' : 'disabled'}`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1))
    const newDate = current.toISOString().split('T')[0]
    setSelectedDate(newDate)
    fetchData(newDate)
  }

  const isToday = selectedDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Anniversary Upsell</h1>
          <p className="text-gray-400 mt-1">Not available for this business</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Anniversary Upsell</h1>
          <p className="text-gray-400 mt-1">Send 15% discount offers with personalized upsell recommendations</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleEnabled}
            disabled={actionLoading === 'toggle'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              config?.enabled
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {actionLoading === 'toggle' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : config?.enabled ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {config?.enabled ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-400">
            &times;
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          label="Sent Today"
          value={stats?.sent_today ?? 0}
          subtext={`/ ${config?.daily_limit ?? 50} limit`}
          icon={Send}
          color="purple"
        />
        <StatCard
          label="Total Sent"
          value={stats?.total_sent ?? 0}
          icon={Gift}
          color="gray"
        />
        <StatCard
          label="Opened"
          value={stats?.total_opened ?? 0}
          subtext={`${stats?.open_rate_percent ?? 0}%`}
          icon={Eye}
          color="blue"
        />
        <StatCard
          label="Clicked"
          value={stats?.total_clicked ?? 0}
          subtext={`${stats?.click_rate_percent ?? 0}%`}
          icon={MousePointer2}
          color="yellow"
        />
        <StatCard
          label="Converted"
          value={stats?.total_converted ?? 0}
          subtext={`${stats?.conversion_rate_percent ?? 0}%`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Revenue"
          value={`$${stats?.total_revenue?.toFixed(0) ?? 0}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Upsells Sent"
          value={stats?.upsell_sent ?? 0}
          subtext={`${stats?.upsell_converted ?? 0} converted`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Avg Savings"
          value={`${stats?.avg_upsell_savings_percent?.toFixed(0) ?? 0}%`}
          subtext="per gram"
          icon={Package}
          color="blue"
        />
      </div>

      {/* Queue Schedule - Date Navigator */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Send Schedule
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium">
                {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className="text-gray-500 text-sm">{selectedDate}</span>
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue Summary */}
        {queueStatus && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{queueStatus.summary.total}</p>
              <p className="text-gray-500 text-xs">Scheduled</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{queueStatus.summary.pending}</p>
              <p className="text-gray-500 text-xs">Pending</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{queueStatus.summary.sent}</p>
              <p className="text-gray-500 text-xs">Sent</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{queueStatus.summary.failed}</p>
              <p className="text-gray-500 text-xs">Failed</p>
            </div>
          </div>
        )}

        {/* Hourly Breakdown */}
        {queueStatus && queueStatus.summary.total > 0 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm font-medium">Hourly Distribution</p>
            <div className="grid grid-cols-5 gap-2">
              {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => {
                const hourData = queueStatus.byHour[hour] || { pending: 0, sent: 0, failed: 0 }
                const total = hourData.pending + hourData.sent + hourData.failed
                if (total === 0) return null
                const label = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
                return (
                  <div key={hour} className="bg-gray-800 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    <div className="flex items-center justify-center gap-1">
                      {hourData.sent > 0 && <span className="text-green-400 text-sm font-medium">{hourData.sent}</span>}
                      {hourData.pending > 0 && <span className="text-yellow-400 text-sm font-medium">{hourData.pending}</span>}
                      {hourData.failed > 0 && <span className="text-red-400 text-sm font-medium">{hourData.failed}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {queueStatus && queueStatus.summary.total === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No emails scheduled for this date</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Discount</label>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <p className="text-white font-semibold">{config?.discount_percent ?? 15}% off</p>
              <p className="text-gray-500 text-sm">Expires in {config?.expiration_days ?? 14} days</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Code Format</label>
            <code className="block px-3 py-2 bg-gray-800 text-green-400 rounded-lg font-mono text-sm">
              {config?.discount_code_format ?? '{FULLNAME}15'}
            </code>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Daily Limit</label>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <p className="text-white font-semibold">{config?.daily_limit ?? 50} emails/day</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Lead Time (Small: 50g/100g)</label>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <p className="text-white">{config?.small_size_lead_days ?? 7} days before anniversary</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Lead Time (Large: 250g+)</label>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <p className="text-white">{config?.large_size_lead_days ?? 12} days before anniversary</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Send From</label>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <p className="text-white">{config?.sender_name ?? 'Colette from Teelixir'}</p>
              <p className="text-gray-500 text-sm">{config?.sender_email ?? 'colette@teelixir.com'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Recent Activity
        </h2>

        {recentEmails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No anniversary emails sent yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Sent</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentEmails.map((email) => (
                  <tr key={email.id} className="border-b border-gray-800/50">
                    <td className="py-3 text-white">{email.email}</td>
                    <td className="py-3 text-gray-400">{email.first_name || '-'}</td>
                    <td className="py-3 text-gray-400">
                      {email.original_product_type ? `${email.original_product_type} ${email.original_product_size}g` : '-'}
                    </td>
                    <td className="py-3">
                      {email.is_largest_size ? (
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Repeat</span>
                      ) : email.upsell_savings_percent ? (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          Upsell {email.upsell_savings_percent.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="py-3 text-gray-400 text-sm">
                      {new Date(email.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      {email.status === 'used' && email.converted_order_total ? (
                        <span className="text-green-400">${email.converted_order_total.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'gray'
}

function StatCard({ label, value, subtext, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    gray: 'text-gray-400 bg-gray-500/10',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-gray-500 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-400',
    sent: 'bg-blue-500/10 text-blue-400',
    clicked: 'bg-yellow-500/10 text-yellow-400',
    used: 'bg-green-500/10 text-green-400',
    expired: 'bg-gray-500/10 text-gray-400',
    failed: 'bg-red-500/10 text-red-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.sent}`}>
      {status}
    </span>
  )
}
