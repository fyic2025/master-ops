'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2, Wrench, Zap, RefreshCw } from 'lucide-react'
import type { CicdIssue } from '@/lib/cicd/prompt-generator'
import { generateSingleIssuePrompt, generateBatchFixPrompt } from '@/lib/cicd/prompt-generator'

interface FixSingleButtonProps {
  issue: CicdIssue
  compact?: boolean
  className?: string
  onFixStarted?: () => void
}

async function markIssuesAsInProgress(issueIds: string[], prompt: string): Promise<boolean> {
  try {
    const response = await fetch('/api/cicd/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        issueIds,
        prompt
      })
    })
    return response.ok
  } catch (error) {
    console.error('Failed to mark issues as in_progress:', error)
    return false
  }
}

export function FixSingleButton({ issue, compact = false, className = '', onFixStarted }: FixSingleButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const prompt = generateSingleIssuePrompt(issue)

      // Mark issue as in_progress BEFORE copying
      await markIssuesAsInProgress([issue.id], prompt)

      // Copy prompt to clipboard
      await navigator.clipboard.writeText(prompt)
      setCopied(true)

      // Notify parent to refresh
      onFixStarted?.()

      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  // Show different state if issue is already in_progress
  const isInProgress = issue.fix_status === 'in_progress'
  const isFailed = issue.fix_status === 'failed'

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleCopy()
        }}
        title={isInProgress ? 'Fix in progress - click to re-copy prompt' : isFailed ? 'Retry fix' : 'Copy fix prompt to clipboard'}
        className={`p-1.5 rounded transition-colors ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : isInProgress
              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
              : isFailed
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : copied ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : isFailed ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <Wrench className="w-3.5 h-3.5" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleCopy()
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : isInProgress
            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
            : isFailed
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <CheckCircle className="w-4 h-4" />
      ) : isFailed ? (
        <RefreshCw className="w-4 h-4" />
      ) : (
        <Wrench className="w-4 h-4" />
      )}
      {copied ? 'Copied!' : isFailed ? 'Retry' : isInProgress ? 'Re-copy' : 'Fix'}
    </button>
  )
}

interface FixBatchButtonProps {
  issues: CicdIssue[]
  maxBatchSize?: number
  className?: string
  onFixStarted?: () => void
  variant?: 'primary' | 'retry'
}

export function FixBatchButton({
  issues,
  maxBatchSize = 10,
  className = '',
  onFixStarted,
  variant = 'primary'
}: FixBatchButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Take up to maxBatchSize issues
  const batchIssues = issues.slice(0, maxBatchSize)
  const totalBatches = Math.ceil(issues.length / maxBatchSize)
  const hasMoreBatches = issues.length > maxBatchSize

  const handleCopy = async () => {
    setLoading(true)
    try {
      const prompt = generateBatchFixPrompt(
        batchIssues,
        1,
        totalBatches
      )

      // Mark issues as in_progress BEFORE copying
      const issueIds = batchIssues.map(i => i.id)
      await markIssuesAsInProgress(issueIds, prompt)

      // Copy prompt to clipboard
      await navigator.clipboard.writeText(prompt)
      setCopied(true)

      // Notify parent to refresh
      onFixStarted?.()

      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  if (batchIssues.length === 0) {
    return null
  }

  const isRetry = variant === 'retry'

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : isRetry
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <CheckCircle className="w-4 h-4" />
      ) : isRetry ? (
        <RefreshCw className="w-4 h-4" />
      ) : (
        <Zap className="w-4 h-4" />
      )}
      {copied
        ? 'Copied!'
        : isRetry
          ? `Retry ${batchIssues.length} Failed`
          : hasMoreBatches
            ? `Fix First ${batchIssues.length} Issues`
            : `Fix All ${batchIssues.length} Issues`
      }
    </button>
  )
}

// Export index
export { FixSingleButton as default }
