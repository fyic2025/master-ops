'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Zap, Mail, Gift, Clock, CheckCircle2, XCircle, ChevronRight, Loader2,
  Target, Copy, CheckCircle, RefreshCw
} from 'lucide-react'
import { getAutomationsForBusiness, AUTOMATION_REGISTRY } from '@/lib/automations/registry'
import type { AutomationDefinition, AutomationConfig, AutomationStats } from '@/lib/automations/types'
import { AutomationCopyButton } from '@/components/automations/CopyToClaudeButton'

// Icon mapping for dynamic icon loading
const iconMap: Record<string, React.ElementType> = {
  Mail,
  Gift,
  Target,
  Zap,
}

export default function AutomationsPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<AutomationConfig[]>([])
  const [stats, setStats] = useState<Record<string, AutomationStats>>({})
  const [error, setError] = useState<string | null>(null)

  // Memoize automations to prevent infinite loop
  const availableAutomations = useMemo(
    () => getAutomationsForBusiness(business),
    [business]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build fetch promises based on available automations
      const fetchPromises: Promise<void>[] = []

      // Fetch configs
      fetchPromises.push(
        fetch('/api/automations/config')
          .then(res => res.ok ? res.json() : { automations: [] })
          .then(data => setConfigs(data.automations || []))
      )

      // Fetch stats for each automation that has a stats endpoint
      for (const automation of availableAutomations) {
        if (automation.endpoints.stats) {
          fetchPromises.push(
            fetch(automation.endpoints.stats)
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.stats) {
                  setStats(prev => ({ ...prev, [automation.slug]: data.stats }))
                }
              })
              .catch(() => {}) // Ignore individual stat errors
          )
        }
      }

      await Promise.all(fetchPromises)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [availableAutomations])

  useEffect(() => {
    if (availableAutomations.length > 0) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [fetchData, availableAutomations.length])

  // No automations for this business
  if (availableAutomations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 mt-1">Automated workflows and campaigns</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No automations configured for this business yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Automations can be added in the registry for {business}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 mt-1">Automated workflows and campaigns</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {availableAutomations.map((automation) => (
            <AutomationCard
              key={automation.slug}
              automation={automation}
              config={configs.find(c => c.automation_type === automation.slug)}
              stats={stats[automation.slug]}
              business={business}
            />
          ))}

          {/* Placeholder for future automations */}
          <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-6">
            <div className="flex items-center gap-3 text-gray-500">
              <Zap className="w-5 h-5" />
              <span>More automations coming soon...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AutomationCardProps {
  automation: AutomationDefinition
  config?: AutomationConfig
  stats?: AutomationStats
  business: string
}

function AutomationCard({ automation, config, stats, business }: AutomationCardProps) {
  const Icon = iconMap[automation.icon] || Zap
  const isEnabled = config?.enabled ?? false
  const lastRun = config?.last_run_at ? new Date(config.last_run_at) : null

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <Link href={`/${business}/automations/${automation.slug.replace('_', '-').replace('winback_40', 'winback').replace('anniversary_upsell', 'anniversary')}`} className="flex-1">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isEnabled ? 'bg-green-500/10' : 'bg-gray-800'}`}>
              <Icon className={`w-6 h-6 ${isEnabled ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
                {isEnabled ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">{automation.description}</p>

              {lastRun && (
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                  <Clock className="w-3 h-3" />
                  Last run: {formatRelativeTime(lastRun)} ({lastRun.toLocaleString()})
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 ml-4">
          <AutomationCopyButton
            automationType={automation.slug}
            business={business}
            compact
          />
          <Link href={`/${business}/automations/${automation.slug.replace('_', '-').replace('winback_40', 'winback').replace('anniversary_upsell', 'anniversary')}`}>
            <ChevronRight className="w-5 h-5 text-gray-600 hover:text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t border-gray-800">
          <div>
            <p className="text-gray-500 text-xs">Sent</p>
            <p className="text-white font-semibold">{stats.total_sent}</p>
            {stats.sent_today > 0 && (
              <p className="text-gray-600 text-xs">+{stats.sent_today} today</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs">Opened</p>
            <p className="text-white font-semibold">{stats.total_opened ?? 0}</p>
            <p className="text-gray-600 text-xs">{stats.open_rate_percent ?? 0}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Clicked</p>
            <p className="text-white font-semibold">{stats.total_clicked ?? 0}</p>
            <p className="text-gray-600 text-xs">{stats.click_rate_percent ?? 0}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Converted</p>
            <p className="text-white font-semibold">{stats.total_converted}</p>
            <p className="text-gray-600 text-xs">{stats.conversion_rate_percent ?? 0}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Revenue</p>
            <p className="text-green-400 font-semibold">${stats.total_revenue?.toFixed(0) ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}
