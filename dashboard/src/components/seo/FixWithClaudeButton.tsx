'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2, Wrench, Zap, RefreshCw, Bot } from 'lucide-react'
import type { SeoIssue } from '@/lib/seo/prompt-generator'
import { generateSeoFixPrompt, generateBatchSeoFixPrompt, getRecommendedAction } from '@/lib/seo/prompt-generator'

interface SeoFixButtonProps {
  issue: SeoIssue
  business: string
  compact?: boolean
  className?: string
  onFixStarted?: () => void
}

async function startSeoFix(
  business: string,
  issueIds: string[],
  executionType: 'manual' | 'auto'
): Promise<{ success: boolean; taskId?: string; prompt?: string }> {
  try {
    const response = await fetch('/api/seo/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        business,
        issueIds,
        executionType
      })
    })
    const data = await response.json()
    return {
      success: response.ok,
      taskId: data.task?.id,
      prompt: data.prompt
    }
  } catch (error) {
    console.error('Failed to start SEO fix:', error)
    return { success: false }
  }
}

async function copyPrompt(business: string, issueIds: string[]): Promise<string | null> {
  try {
    const response = await fetch('/api/seo/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'copy_prompt',
        business,
        issueIds
      })
    })
    const data = await response.json()
    return data.prompt || null
  } catch (error) {
    console.error('Failed to get prompt:', error)
    return null
  }
}

export function SeoFixSingleButton({
  issue,
  business,
  compact = false,
  className = '',
  onFixStarted
}: SeoFixButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleManualFix = async () => {
    setLoading(true)
    setShowOptions(false)
    try {
      const result = await startSeoFix(business, [issue.id], 'manual')
      if (result.prompt) {
        await navigator.clipboard.writeText(result.prompt)
        setCopied(true)
        onFixStarted?.()
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFix = async () => {
    setLoading(true)
    setShowOptions(false)
    try {
      await startSeoFix(business, [issue.id], 'auto')
      onFixStarted?.()
    } catch (err) {
      console.error('Failed to start auto-fix:', err)
    } finally {
      setLoading(false)
    }
  }

  // Show different state based on fix_status
  const isInProgress = issue.fix_status === 'in_progress'
  const isFailed = issue.fix_status === 'failed'

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowOptions(!showOptions)
          }}
          title={isInProgress ? 'Fix in progress - click to re-copy prompt' : isFailed ? 'Retry fix' : 'Fix this issue'}
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

        {showOptions && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 min-w-[140px]">
            <button
              onClick={handleManualFix}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Prompt
            </button>
            <button
              onClick={handleAutoFix}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
            >
              <Bot className="w-3.5 h-3.5" />
              Auto-Fix
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowOptions(!showOptions)
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
        {copied ? 'Copied!' : isFailed ? 'Retry' : isInProgress ? 'Re-fix' : 'Fix'}
      </button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 min-w-[160px]">
          <button
            onClick={handleManualFix}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
          >
            <Copy className="w-4 h-4" />
            Copy to Claude Code
          </button>
          <button
            onClick={handleAutoFix}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
          >
            <Bot className="w-4 h-4" />
            Auto-Fix (Task Queue)
          </button>
        </div>
      )}
    </div>
  )
}

interface SeoFixBatchButtonProps {
  issues: SeoIssue[]
  business: string
  maxBatchSize?: number
  className?: string
  onFixStarted?: () => void
  variant?: 'primary' | 'retry'
}

export function SeoFixBatchButton({
  issues,
  business,
  maxBatchSize = 10,
  className = '',
  onFixStarted,
  variant = 'primary'
}: SeoFixBatchButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  // Take up to maxBatchSize issues
  const batchIssues = issues.slice(0, maxBatchSize)
  const totalBatches = Math.ceil(issues.length / maxBatchSize)
  const hasMoreBatches = issues.length > maxBatchSize

  const handleManualFix = async () => {
    setLoading(true)
    setShowOptions(false)
    try {
      const result = await startSeoFix(business, batchIssues.map(i => i.id), 'manual')
      if (result.prompt) {
        await navigator.clipboard.writeText(result.prompt)
        setCopied(true)
        onFixStarted?.()
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFix = async () => {
    setLoading(true)
    setShowOptions(false)
    try {
      await startSeoFix(business, batchIssues.map(i => i.id), 'auto')
      onFixStarted?.()
    } catch (err) {
      console.error('Failed to start auto-fix:', err)
    } finally {
      setLoading(false)
    }
  }

  if (batchIssues.length === 0) {
    return null
  }

  const isRetry = variant === 'retry'

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
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

      {showOptions && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 min-w-[180px]">
          <button
            onClick={handleManualFix}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
          >
            <Copy className="w-4 h-4" />
            Copy to Claude Code
          </button>
          <button
            onClick={handleAutoFix}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded"
          >
            <Bot className="w-4 h-4" />
            Auto-Fix All (Task Queue)
          </button>
        </div>
      )}
    </div>
  )
}

export { SeoFixSingleButton as default }
