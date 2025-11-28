'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SkipForward, RotateCcw, MoreHorizontal, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface QueueEntry {
  id: string
  hubspot_contact_id: string
  email: string
  company_name: string
  lead_category: string | null
  queue_status: string
  queued_at: string
  processed_at: string | null
  approved_tag_added_at: string | null
  first_login_at: string | null
  shopify_customer_id: string | null
}

async function fetchQueue(status: string): Promise<{ queue: QueueEntry[] }> {
  const res = await fetch(`/api/prospecting/queue?status=${status}&limit=20`)
  if (!res.ok) throw new Error('Failed to fetch queue')
  return res.json()
}

async function performAction(action: string, queueId: string, reason?: string) {
  const res = await fetch('/api/prospecting/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, queueId, reason })
  })
  if (!res.ok) throw new Error('Action failed')
  return res.json()
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

export function QueueTable() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['prospecting-queue', statusFilter],
    queryFn: () => fetchQueue(statusFilter),
    refetchInterval: 30000,
  })

  const actionMutation = useMutation({
    mutationFn: ({ action, queueId, reason }: { action: string; queueId: string; reason?: string }) =>
      performAction(action, queueId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-queue'] })
      queryClient.invalidateQueries({ queryKey: ['prospecting-summary'] })
      setActionMenuId(null)
    }
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Queue</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Awaiting Login</option>
          <option value="active">Active</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Company</th>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Category</th>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Status</th>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Added</th>
                <th className="px-3 py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.queue?.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <div>
                      <p className="text-white">{entry.company_name}</p>
                      <p className="text-xs text-gray-500">{entry.email}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      entry.lead_category === 'beauty' ? 'bg-pink-900/30 text-pink-400' :
                      entry.lead_category === 'fitness' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {entry.lead_category || 'none'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={entry.queue_status} />
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {formatTimeAgo(entry.queued_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === entry.id ? null : entry.id)}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>

                      {actionMenuId === entry.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                          {entry.queue_status === 'failed' && (
                            <button
                              onClick={() => actionMutation.mutate({ action: 'retry', queueId: entry.id })}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-gray-700"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Retry Processing
                            </button>
                          )}
                          {entry.queue_status === 'pending' && (
                            <button
                              onClick={() => actionMutation.mutate({
                                action: 'skip',
                                queueId: entry.id,
                                reason: 'Skipped via dashboard'
                              })}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-gray-700"
                            >
                              <SkipForward className="w-4 h-4" />
                              Skip Contact
                            </button>
                          )}
                          {entry.hubspot_contact_id && (
                            <a
                              href={`https://app.hubspot.com/contacts/contact/${entry.hubspot_contact_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-gray-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View in HubSpot
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!data?.queue?.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-900/30 text-yellow-400',
    processing: 'bg-blue-900/30 text-blue-400',
    sent: 'bg-blue-900/30 text-blue-400',
    active: 'bg-green-900/30 text-green-400',
    expired: 'bg-gray-800 text-gray-400',
    failed: 'bg-red-900/30 text-red-400',
    skipped: 'bg-gray-800 text-gray-500',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  )
}
