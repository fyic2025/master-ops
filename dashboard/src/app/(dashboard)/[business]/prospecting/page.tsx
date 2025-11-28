'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Mail, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { ControlPanel } from '@/components/prospecting/ControlPanel'
import { FunnelVisualization } from '@/components/prospecting/FunnelVisualization'
import { ActivityFeed } from '@/components/prospecting/ActivityFeed'
import { QueueTable } from '@/components/prospecting/QueueTable'
import { WeeklyChart } from '@/components/prospecting/WeeklyChart'

interface ProspectingSummary {
  stats: {
    total_in_queue: number
    pending_outreach: number
    awaiting_login: number
    logged_in_active: number
    expired: number
    emails_sent_today: number
    emails_pending: number
  }
  funnel: Array<{
    category: string
    total: number
    pending: number
    sent: number
    active: number
    expired: number
    login_rate_pct: number
  }>
  weekly: Array<{
    run_date: string
    run_status: string
    contacts_processed: number
    accounts_created: number
    emails_queued: number
    errors_count: number
  }>
  config: {
    enabled: boolean
    daily_limit: number
    lead_category: string | null
  }
}

async function fetchSummary(): Promise<ProspectingSummary> {
  const res = await fetch('/api/prospecting/summary')
  if (!res.ok) throw new Error('Failed to fetch summary')
  return res.json()
}

async function updateConfig(updates: Partial<ProspectingSummary['config']>) {
  const res = await fetch('/api/prospecting/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) throw new Error('Failed to update config')
  return res.json()
}

export default function ProspectingPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['prospecting-summary'],
    queryFn: fetchSummary,
    refetchInterval: 30000,
  })

  const configMutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-summary'] })
    }
  })

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Prospecting Automation</h1>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Failed to load prospecting data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {
    total_in_queue: 0,
    pending_outreach: 0,
    awaiting_login: 0,
    logged_in_active: 0,
    expired: 0,
    emails_sent_today: 0,
    emails_pending: 0
  }

  const config = data?.config || {
    enabled: false,
    daily_limit: 5,
    lead_category: null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospecting Automation</h1>
          <p className="text-gray-400 mt-1">
            Automated HubSpot → Shopify → Gmail outreach pipeline
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Control Panel */}
      <ControlPanel
        enabled={config.enabled}
        dailyLimit={config.daily_limit}
        leadCategory={config.lead_category}
        onToggleEnabled={() => configMutation.mutate({ enabled: !config.enabled })}
        onUpdateLimit={(limit) => configMutation.mutate({ daily_limit: limit })}
        onUpdateCategory={(category) => configMutation.mutate({ lead_category: category })}
        isUpdating={configMutation.isPending}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="In Queue"
          value={stats.total_in_queue}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          icon={Mail}
          label="Awaiting Login"
          value={stats.awaiting_login}
          color="yellow"
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Customers"
          value={stats.logged_in_active}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          icon={Mail}
          label="Emails Today"
          value={stats.emails_sent_today}
          sublabel={stats.emails_pending > 0 ? `+${stats.emails_pending} pending` : undefined}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Funnel */}
        <div className="lg:col-span-1">
          <FunnelVisualization
            funnel={data?.funnel || []}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column - Chart & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <WeeklyChart
            stats={data?.weekly || []}
            isLoading={isLoading}
          />
          <ActivityFeed />
        </div>
      </div>

      {/* Queue Table */}
      <QueueTable />
    </div>
  )
}

interface StatCardProps {
  icon: typeof Users
  label: string
  value: number
  sublabel?: string
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
  isLoading: boolean
}

function StatCard({ icon: Icon, label, value, sublabel, color, isLoading }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-900/30 text-blue-400',
    green: 'bg-green-900/30 text-green-400',
    yellow: 'bg-yellow-900/30 text-yellow-400',
    purple: 'bg-purple-900/30 text-purple-400',
    red: 'bg-red-900/30 text-red-400',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          {isLoading ? (
            <div className="h-7 w-12 bg-gray-800 rounded animate-pulse mt-1" />
          ) : (
            <>
              <p className="text-2xl font-bold text-white">{value}</p>
              {sublabel && (
                <p className="text-xs text-gray-500">{sublabel}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
