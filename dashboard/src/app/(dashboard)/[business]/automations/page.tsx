'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Zap, Mail, Gift, Clock, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react'

interface AutomationConfig {
  id: string
  automation_type: string
  enabled: boolean
  config: {
    daily_limit?: number
    discount_code?: string
    discount_percent?: number
    sender_email?: string
    sender_name?: string
    subject_template?: string
  }
  last_run_at: string | null
  last_run_result: {
    emails_sent?: number
    errors?: number
    success?: boolean
  } | null
}

interface AutomationStats {
  total_sent: number
  total_opened: number
  total_clicked: number
  total_converted: number
  total_bounced: number
  total_failed: number
  total_revenue: number
  sent_today: number
  sent_this_week: number
  open_rate_percent: number
  click_rate_percent: number
  conversion_rate_percent: number
}

export default function AutomationsPage() {
  const params = useParams()
  const business = params?.business as string

  const [loading, setLoading] = useState(true)
  const [automations, setAutomations] = useState<AutomationConfig[]>([])
  const [stats, setStats] = useState<Record<string, AutomationStats>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (business !== 'teelixir') return

    async function fetchData() {
      try {
        const [configRes, winbackStatsRes, anniversaryStatsRes] = await Promise.all([
          fetch('/api/automations/config'),
          fetch('/api/automations/winback/stats'),
          fetch('/api/automations/anniversary/stats')
        ])

        if (configRes.ok) {
          const configData = await configRes.json()
          setAutomations(configData.automations || [])
        }

        if (winbackStatsRes.ok) {
          const winbackData = await winbackStatsRes.json()
          setStats(prev => ({ ...prev, winback_40: winbackData.stats }))
        }

        if (anniversaryStatsRes.ok) {
          const anniversaryData = await anniversaryStatsRes.json()
          setStats(prev => ({ ...prev, anniversary_upsell: anniversaryData.stats }))
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [business])

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 mt-1">Automated workflows and campaigns</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No automations configured for this business.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Automations</h1>
        <p className="text-gray-400 mt-1">Automated workflows and campaigns</p>
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
          {/* Winback Campaign Card */}
          <AutomationCard
            name="Winback Campaign"
            description="Send 40% discount offers to unengaged customers via GSuite email"
            href={`/${business}/automations/winback`}
            automation={automations.find(a => a.automation_type === 'winback_40')}
            stats={stats.winback_40}
          />

          {/* Anniversary Upsell Card */}
          <AutomationCard
            name="Anniversary Upsell"
            description="Send 15% discount with personalized upsell offers to first-time customers"
            href={`/${business}/automations/anniversary`}
            automation={automations.find(a => a.automation_type === 'anniversary_upsell')}
            stats={stats.anniversary_upsell}
            icon={Gift}
          />

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
  name: string
  description: string
  href: string
  automation?: AutomationConfig
  stats?: AutomationStats
  icon?: React.ElementType
}

function AutomationCard({ name, description, href, automation, stats, icon: Icon = Mail }: AutomationCardProps) {
  const isEnabled = automation?.enabled ?? false
  const lastRun = automation?.last_run_at ? new Date(automation.last_run_at) : null

  return (
    <Link href={href}>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isEnabled ? 'bg-green-500/10' : 'bg-gray-800'}`}>
              <Icon className={`w-6 h-6 ${isEnabled ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{name}</h3>
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
              <p className="text-gray-400 text-sm mt-1">{description}</p>

              {lastRun && (
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                  <Clock className="w-3 h-3" />
                  Last run: {lastRun.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t border-gray-800">
            <div>
              <p className="text-gray-500 text-xs">Sent</p>
              <p className="text-white font-semibold">{stats.total_sent}</p>
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
    </Link>
  )
}
