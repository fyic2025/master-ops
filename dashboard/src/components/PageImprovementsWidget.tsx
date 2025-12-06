'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Play,
  X,
  ChevronRight,
  FileText,
  Zap,
  Palette,
  Code,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface PageImprovement {
  id: string
  title: string
  description: string
  improvement_type: 'ux' | 'performance' | 'feature' | 'code_quality'
  priority_score: number
  estimated_effort: 'small' | 'medium' | 'large'
  suggested_by: string
  created_at: string
  page_name: string
  route: string
  page_category: string
}

interface ImprovementsResponse {
  improvements: PageImprovement[]
  count: number
}

const typeConfig = {
  ux: { icon: Palette, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'UX' },
  performance: { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Performance' },
  feature: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Feature' },
  code_quality: { icon: Code, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Code Quality' },
}

const effortConfig = {
  small: { color: 'text-green-400', label: 'Small' },
  medium: { color: 'text-yellow-400', label: 'Medium' },
  large: { color: 'text-red-400', label: 'Large' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
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

function PriorityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 8) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (score >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()}`}>
      P{score}
    </span>
  )
}

export function PageImprovementsWidget() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<ImprovementsResponse>({
    queryKey: ['page-improvements'],
    queryFn: async () => {
      const response = await fetch('/api/page-improvements')
      if (!response.ok) throw new Error('Failed to fetch improvements')
      return response.json()
    },
    refetchInterval: 60000, // Refetch every minute
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, executionType }: { id: string; executionType: 'auto' | 'manual' }) => {
      const response = await fetch(`/api/page-improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', execution_type: executionType }),
      })
      if (!response.ok) throw new Error('Failed to approve improvement')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-improvements'] })
      setActionLoading(null)
    },
    onError: () => {
      setActionLoading(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/page-improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
      })
      if (!response.ok) throw new Error('Failed to reject improvement')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-improvements'] })
      setActionLoading(null)
    },
    onError: () => {
      setActionLoading(null)
    },
  })

  const handleApprove = (id: string, executionType: 'auto' | 'manual') => {
    setActionLoading(`${id}-${executionType}`)
    approveMutation.mutate({ id, executionType })
  }

  const handleReject = (id: string) => {
    setActionLoading(`${id}-reject`)
    rejectMutation.mutate({ id })
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading improvements...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Failed to load improvements</span>
        </div>
      </div>
    )
  }

  const improvements = data?.improvements || []
  const count = data?.count || 0

  if (count === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Page Improvements
          </h3>
          <Link
            href="/overall/pages"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View Registry
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>No pending improvements to review</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Page Improvements
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            {count} pending
          </span>
        </h3>
        <Link
          href="/overall/pages"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          View Registry
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Improvements List */}
      <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
        {improvements.slice(0, 5).map((improvement) => {
          const typeInfo = typeConfig[improvement.improvement_type]
          const effortInfo = effortConfig[improvement.estimated_effort]
          const TypeIcon = typeInfo.icon
          const isExpanded = expandedId === improvement.id

          return (
            <div key={improvement.id} className="p-4 hover:bg-gray-800/50 transition-colors">
              {/* Main Row */}
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                  <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                      {improvement.page_name}
                    </span>
                    <PriorityBadge score={improvement.priority_score} />
                  </div>

                  <h4 className="text-sm font-medium text-white truncate">
                    {improvement.title}
                  </h4>

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className={typeInfo.color}>{typeInfo.label}</span>
                    <span>•</span>
                    <span className={effortInfo.color}>{effortInfo.label} effort</span>
                    <span>•</span>
                    <span>{formatTimeAgo(improvement.created_at)}</span>
                  </div>

                  {/* Expanded Description */}
                  {isExpanded && (
                    <p className="mt-2 text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
                      {improvement.description}
                    </p>
                  )}
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : improvement.id)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 ml-11">
                <button
                  onClick={() => handleApprove(improvement.id, 'auto')}
                  disabled={actionLoading === `${improvement.id}-auto`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-green-500/10 text-green-400 border border-green-500/20
                    hover:bg-green-500/20 hover:border-green-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === `${improvement.id}-auto` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Auto
                </button>

                <button
                  onClick={() => handleApprove(improvement.id, 'manual')}
                  disabled={actionLoading === `${improvement.id}-manual`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-blue-500/10 text-blue-400 border border-blue-500/20
                    hover:bg-blue-500/20 hover:border-blue-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === `${improvement.id}-manual` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  Manual
                </button>

                <button
                  onClick={() => handleReject(improvement.id)}
                  disabled={actionLoading === `${improvement.id}-reject`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-red-500/10 text-red-400 border border-red-500/20
                    hover:bg-red-500/20 hover:border-red-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === `${improvement.id}-reject` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer - Show more link */}
      {count > 5 && (
        <div className="p-3 border-t border-gray-800 text-center">
          <Link
            href="/overall/pages?filter=pending"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View all {count} pending improvements
          </Link>
        </div>
      )}
    </div>
  )
}
