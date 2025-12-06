'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2, Wrench, Zap, RefreshCw, Play } from 'lucide-react'
import type { GMCIssue, GMCProduct } from '@/lib/merchant/prompt-generator'

interface GMCFixButtonProps {
  issue: GMCIssue
  products: GMCProduct[]
  business?: string
  compact?: boolean
  className?: string
  onFixStarted?: () => void
}

async function startFixAndCopyPrompt(
  issue: GMCIssue,
  business: string
): Promise<{ prompt: string; success: boolean }> {
  try {
    // Generate prompt via API
    const response = await fetch('/api/merchant/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate-prompt',
        business,
        issueCode: issue.issue_code
      })
    })

    const data = await response.json()

    if (!data.success || !data.prompt) {
      throw new Error(data.error || 'Failed to generate prompt')
    }

    // Mark as in_progress
    await fetch('/api/merchant/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        business,
        issueCode: issue.issue_code
      })
    })

    // Copy to clipboard
    await navigator.clipboard.writeText(data.prompt)

    return { prompt: data.prompt, success: true }
  } catch (error) {
    console.error('Failed to start fix:', error)
    return { prompt: '', success: false }
  }
}

export function GMCFixSingleButton({
  issue,
  products,
  business = 'boo',
  compact = false,
  className = '',
  onFixStarted
}: GMCFixButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const { success } = await startFixAndCopyPrompt(issue, business)

      if (success) {
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

  const isInProgress = issue.status === 'in_progress'
  const isFixed = issue.status === 'fixed'
  const isVerified = issue.status === 'verified'

  // Determine button style based on fixability
  const getButtonStyle = () => {
    if (copied) return 'bg-green-500/20 text-green-400 border border-green-500/30'
    if (isVerified) return 'bg-emerald-500/20 text-emerald-400 cursor-default'
    if (isFixed) return 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
    if (isInProgress) return 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'

    switch (issue.fixability) {
      case 'auto':
        return 'bg-green-600 hover:bg-green-700 text-white'
      case 'semi-auto':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      case 'manual':
      default:
        return 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  }

  const getButtonIcon = () => {
    if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin" />
    if (copied) return <CheckCircle className="w-3.5 h-3.5" />
    if (isVerified) return <CheckCircle className="w-3.5 h-3.5" />
    if (isFixed) return <RefreshCw className="w-3.5 h-3.5" />

    switch (issue.fixability) {
      case 'auto':
        return <Zap className="w-3.5 h-3.5" />
      case 'semi-auto':
        return <Play className="w-3.5 h-3.5" />
      case 'manual':
      default:
        return <Wrench className="w-3.5 h-3.5" />
    }
  }

  const getButtonLabel = () => {
    if (copied) return 'Copied!'
    if (isVerified) return 'Done'
    if (isFixed) return 'Re-copy'
    if (isInProgress) return 'In Progress'

    switch (issue.fixability) {
      case 'auto':
        return 'Auto Fix'
      case 'semi-auto':
        return 'Fix w/ AI'
      case 'manual':
      default:
        return 'Copy Fix'
    }
  }

  const getTooltip = () => {
    switch (issue.fixability) {
      case 'auto':
        return 'Auto-fixable - Click to fix via API'
      case 'semi-auto':
        return 'Semi-auto - Copy prompt for AI-assisted fix'
      case 'manual':
      default:
        return 'Manual fix required - Copy prompt for Claude Code'
    }
  }

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isVerified) handleCopy()
        }}
        title={getTooltip()}
        disabled={isVerified}
        className={`p-1.5 rounded transition-colors ${getButtonStyle()} ${className}`}
      >
        {getButtonIcon()}
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isVerified) handleCopy()
      }}
      title={getTooltip()}
      disabled={isVerified}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${getButtonStyle()} ${className}`}
    >
      {getButtonIcon()}
      {getButtonLabel()}
    </button>
  )
}

interface GMCFixBatchButtonProps {
  issues: GMCIssue[]
  allProducts: Map<string, GMCProduct[]>
  business?: string
  maxBatchSize?: number
  className?: string
  onFixStarted?: () => void
}

export function GMCFixBatchButton({
  issues,
  allProducts,
  business = 'boo',
  maxBatchSize = 10,
  className = '',
  onFixStarted
}: GMCFixBatchButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filter to only pending issues
  const pendingIssues = issues.filter(i => i.status === 'pending' || i.status === 'in_progress')
  const batchIssues = pendingIssues.slice(0, maxBatchSize)

  const handleBatchCopy = async () => {
    setLoading(true)
    try {
      // Generate batch prompt via API
      const response = await fetch('/api/merchant/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-prompt',
          business
          // No issueCode = batch prompt
        })
      })

      const data = await response.json()

      if (!data.success || !data.prompt) {
        throw new Error(data.error || 'Failed to generate batch prompt')
      }

      // Mark all issues as in_progress
      for (const issue of batchIssues) {
        await fetch('/api/merchant/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            business,
            issueCode: issue.issue_code
          })
        })
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(data.prompt)
      setCopied(true)
      onFixStarted?.()

      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy batch:', err)
    } finally {
      setLoading(false)
    }
  }

  if (batchIssues.length === 0) {
    return null
  }

  const totalProducts = batchIssues.reduce((sum, i) => sum + i.product_count, 0)

  return (
    <button
      onClick={handleBatchCopy}
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
        : `Fix All ${batchIssues.length} Issues (${totalProducts} products)`
      }
    </button>
  )
}

// Export index
export { GMCFixSingleButton as default }
