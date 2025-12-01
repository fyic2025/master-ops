'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Mail,
  Settings,
  BarChart3,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  MousePointer2,
  Loader2,
  AlertCircle,
  Send
} from 'lucide-react'

interface WinbackConfig {
  enabled: boolean
  daily_limit: number
  discount_code: string
  discount_percent: number
  sender_email: string
  sender_name: string
  subject_template: string
  klaviyo_segment_id: string | null
}

interface WinbackStats {
  total_sent: number
  total_clicked: number
  total_converted: number
  total_bounced: number
  total_failed: number
  total_revenue: number
  sent_today: number
  sent_this_week: number
  click_rate_percent: number
  conversion_rate_percent: number
}

interface RecentEmail {
  id: string
  email: string
  first_name: string | null
  status: 'sent' | 'clicked' | 'converted' | 'bounced' | 'failed'
  sent_at: string
  order_total: number | null
}

interface UnengagedPool {
  total: number
  last_synced: string | null
}

export default function WinbackPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<WinbackConfig | null>(null)
  const [stats, setStats] = useState<WinbackStats | null>(null)
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([])
  const [unengagedPool, setUnengagedPool] = useState<UnengagedPool | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingLimit, setEditingLimit] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [configRes, statsRes, recentRes, poolRes] = await Promise.all([
        fetch('/api/automations/config'),
        fetch('/api/automations/winback/stats'),
        fetch('/api/automations/winback/recent'),
        fetch('/api/automations/winback/pool')
      ])

      if (configRes.ok) {
        const data = await configRes.json()
        const winbackConfig = data.automations?.find((a: any) => a.automation_type === 'winback_40')
        if (winbackConfig) {
          setConfig({
            enabled: winbackConfig.enabled,
            ...winbackConfig.config
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

      if (poolRes.ok) {
        const data = await poolRes.json()
        setUnengagedPool(data.pool)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (business !== 'teelixir') return
    fetchData()
  }, [business, fetchData])

  const toggleEnabled = async () => {
    if (!config) return
    setActionLoading('toggle')
    try {
      const res = await fetch('/api/automations/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_type: 'winback_40',
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

  const triggerSync = async () => {
    setActionLoading('sync')
    try {
      const res = await fetch('/api/automations/winback/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccessMessage(`Sync queued: ${data.message}`)
        setTimeout(() => setSuccessMessage(null), 5000)
        // Refresh data after a delay
        setTimeout(fetchData, 2000)
      } else {
        setError(data.error || 'Sync failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const triggerSendBatch = async () => {
    setActionLoading('send')
    try {
      const res = await fetch('/api/automations/winback/send', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccessMessage(`Send queued: ${data.message}`)
        setTimeout(() => setSuccessMessage(null), 5000)
        // Refresh data after a delay
        setTimeout(fetchData, 2000)
      } else {
        setError(data.error || 'Send failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const updateDailyLimit = async (newLimit: number) => {
    if (!config) return
    try {
      const res = await fetch('/api/automations/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_type: 'winback_40',
          config: { ...config, daily_limit: newLimit }
        })
      })
      if (res.ok) {
        setConfig({ ...config, daily_limit: newLimit })
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Winback Campaign</h1>
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
          <h1 className="text-2xl font-bold text-white">Winback Campaign</h1>
          <p className="text-gray-400 mt-1">Send 40% discount offers to unengaged customers</p>
        </div>

        {/* Enable/Disable Toggle */}
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Unengaged Pool"
          value={unengagedPool?.total ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Sent Today"
          value={stats?.sent_today ?? 0}
          subtext={`/ ${config?.daily_limit ?? 20} limit`}
          icon={Send}
          color="purple"
        />
        <StatCard
          label="Total Sent"
          value={stats?.total_sent ?? 0}
          icon={Mail}
          color="gray"
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
      </div>

      {/* Actions & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5" />
            Actions
          </h2>

          <div className="space-y-3">
            <button
              onClick={triggerSendBatch}
              disabled={actionLoading === 'send' || !config?.enabled}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'send' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Send Batch Now
            </button>

            <button
              onClick={triggerSync}
              disabled={actionLoading === 'sync'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'sync' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Sync Klaviyo Unengaged
            </button>
          </div>

          {unengagedPool?.last_synced && (
            <p className="text-gray-500 text-xs mt-4 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last synced: {new Date(unengagedPool.last_synced).toLocaleString()}
            </p>
          )}
        </div>

        {/* Settings Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h2>

          <div className="space-y-4">
            {/* Daily Limit */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Daily Send Limit</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={editingLimit ?? config?.daily_limit ?? 20}
                  onChange={(e) => setEditingLimit(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg cursor-pointer accent-purple-500"
                />
                <input
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={editingLimit ?? config?.daily_limit ?? 20}
                  onChange={(e) => setEditingLimit(parseInt(e.target.value) || 5)}
                  className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center font-bold"
                />
                {editingLimit !== null && editingLimit !== config?.daily_limit && (
                  <button
                    onClick={async () => {
                      await updateDailyLimit(editingLimit)
                      setEditingLimit(null)
                      setSuccessMessage('Daily limit updated')
                      setTimeout(() => setSuccessMessage(null), 2000)
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-medium"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Discount Code */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Discount Code</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 text-green-400 rounded-lg font-mono">
                  {config?.discount_code ?? 'MISSYOU40'}
                </code>
                <span className="text-gray-500">{config?.discount_percent ?? 40}% off</span>
              </div>
            </div>

            {/* Sender */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Send From</label>
              <div className="px-3 py-2 bg-gray-800 rounded-lg">
                <p className="text-white">{config?.sender_name ?? 'Colette from Teelixir'}</p>
                <p className="text-gray-500 text-sm">{config?.sender_email ?? 'colette@teelixir.com'}</p>
              </div>
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
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No emails sent yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Name</th>
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
                    <td className="py-3">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="py-3 text-gray-400 text-sm">
                      {new Date(email.sent_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      {email.status === 'converted' && email.order_total ? (
                        <span className="text-green-400">${email.order_total.toFixed(2)}</span>
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
    sent: 'bg-blue-500/10 text-blue-400',
    clicked: 'bg-yellow-500/10 text-yellow-400',
    converted: 'bg-green-500/10 text-green-400',
    bounced: 'bg-red-500/10 text-red-400',
    failed: 'bg-red-500/10 text-red-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.sent}`}>
      {status}
    </span>
  )
}
