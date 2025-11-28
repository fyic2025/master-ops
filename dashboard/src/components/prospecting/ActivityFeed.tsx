'use client'

import { useQuery } from '@tanstack/react-query'
import { Mail, UserPlus, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface Email {
  id: string
  email_type: string
  recipient_email: string
  status: string
  sent_at: string | null
  scheduled_for: string
  company_name: string
}

interface Run {
  id: string
  run_date: string
  started_at: string
  completed_at: string | null
  status: string
  contacts_processed: number
  errors_count: number
}

interface ActivityData {
  emails: Email[]
  runs: Run[]
}

async function fetchActivity(): Promise<ActivityData> {
  const res = await fetch('/api/prospecting/activity')
  if (!res.ok) throw new Error('Failed to fetch activity')
  return res.json()
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  welcome: 'Welcome Email',
  reminder_1: 'First Reminder',
  reminder_2: 'Second Reminder',
  final_reminder: 'Final Reminder',
  expiry_notice: 'Expiry Notice'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function ActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['prospecting-activity'],
    queryFn: fetchActivity,
    refetchInterval: 30000,
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {/* Run Logs */}
          {data?.runs?.map(run => (
            <div key={run.id} className="p-3 border-b border-gray-800 hover:bg-gray-800/50">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  run.status === 'completed' ? 'bg-green-900/30' :
                  run.status === 'failed' ? 'bg-red-900/30' :
                  'bg-blue-900/30'
                }`}>
                  <UserPlus className={`w-4 h-4 ${
                    run.status === 'completed' ? 'text-green-400' :
                    run.status === 'failed' ? 'text-red-400' :
                    'text-blue-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    Daily batch: {run.contacts_processed} contacts processed
                    {run.errors_count > 0 && (
                      <span className="text-red-400"> ({run.errors_count} errors)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTimeAgo(run.started_at)}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
            </div>
          ))}

          {/* Emails */}
          {data?.emails?.map(email => (
            <div key={email.id} className="p-3 border-b border-gray-800 hover:bg-gray-800/50">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  email.status === 'sent' ? 'bg-green-900/30' :
                  email.status === 'failed' ? 'bg-red-900/30' :
                  'bg-gray-800'
                }`}>
                  <Mail className={`w-4 h-4 ${
                    email.status === 'sent' ? 'text-green-400' :
                    email.status === 'failed' ? 'text-red-400' :
                    'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {EMAIL_TYPE_LABELS[email.email_type] || email.email_type}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {email.company_name} - {email.recipient_email}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {email.sent_at
                      ? formatTimeAgo(email.sent_at)
                      : `Scheduled: ${formatTimeAgo(email.scheduled_for)}`
                    }
                  </p>
                </div>
                <StatusBadge status={email.status} />
              </div>
            </div>
          ))}

          {(!data?.emails?.length && !data?.runs?.length) && (
            <div className="p-8 text-center text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
    sent: { color: 'text-green-400 bg-green-900/30', icon: CheckCircle },
    completed: { color: 'text-green-400 bg-green-900/30', icon: CheckCircle },
    pending: { color: 'text-yellow-400 bg-yellow-900/30', icon: Clock },
    running: { color: 'text-blue-400 bg-blue-900/30', icon: Clock },
    failed: { color: 'text-red-400 bg-red-900/30', icon: XCircle },
    cancelled: { color: 'text-gray-400 bg-gray-800', icon: XCircle },
  }

  const cfg = config[status] || config.pending
  const Icon = cfg.icon

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}
