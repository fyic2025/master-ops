'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2, Wrench, Zap } from 'lucide-react'
import type { CicdIssue } from '@/lib/cicd/prompt-generator'
import { generateSingleIssuePrompt, generateBatchFixPrompt } from '@/lib/cicd/prompt-generator'

interface FixSingleButtonProps {
  issue: CicdIssue
  compact?: boolean
  className?: string
}

export function FixSingleButton({ issue, compact = false, className = '' }: FixSingleButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const prompt = generateSingleIssuePrompt(issue)
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleCopy()
        }}
        title="Copy fix prompt to clipboard"
        className={`p-1.5 rounded transition-colors ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : copied ? (
          <CheckCircle className="w-3.5 h-3.5" />
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
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Wrench className="w-4 h-4" />
      )}
      {copied ? 'Copied!' : 'Fix'}
    </button>
  )
}

interface FixBatchButtonProps {
  issues: CicdIssue[]
  maxBatchSize?: number
  className?: string
}

export function FixBatchButton({ issues, maxBatchSize = 10, className = '' }: FixBatchButtonProps) {
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
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
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

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Zap className="w-4 h-4" />
      )}
      {copied
        ? 'Copied!'
        : hasMoreBatches
          ? `Fix First ${batchIssues.length} Issues`
          : `Fix All ${batchIssues.length} Issues`
      }
    </button>
  )
}

// Export index
export { FixSingleButton as default }
