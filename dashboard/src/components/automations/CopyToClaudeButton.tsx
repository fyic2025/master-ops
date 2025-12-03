'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2 } from 'lucide-react'
import type { AutomationDefinition, AutomationInstance, AutomationStats, QueueStatus, ExecutionLog } from '@/lib/automations/types'
import { generateClaudePrompt, generateQuickPrompt } from '@/lib/automations/prompt-generator'

interface CopyToClaudeButtonProps {
  definition: AutomationDefinition
  instance: AutomationInstance
  stats?: AutomationStats
  queue?: QueueStatus
  recentLogs?: ExecutionLog[]
  pool?: { total: number; available: number }
  compact?: boolean
  variant?: 'default' | 'quick'
  className?: string
}

export function CopyToClaudeButton({
  definition,
  instance,
  stats,
  queue,
  recentLogs,
  pool,
  compact = false,
  variant = 'default',
  className = '',
}: CopyToClaudeButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const context = { definition, instance, stats, queue, recentLogs, pool }
      const prompt = variant === 'quick'
        ? generateQuickPrompt(context)
        : generateClaudePrompt(context)

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
        title="Copy to Claude Code"
        className={`p-2 rounded-lg transition-colors ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
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
        <Copy className="w-4 h-4" />
      )}
      {copied ? 'Copied!' : variant === 'quick' ? 'Quick Copy' : 'Copy to Claude'}
    </button>
  )
}

// Export a simpler version that fetches its own data
interface SimpleCopyButtonProps {
  automationType: string
  business: string
  compact?: boolean
  className?: string
}

export function AutomationCopyButton({
  automationType,
  business,
  compact = false,
  className = '',
}: SimpleCopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      // Fetch the prompt from API
      const response = await fetch(`/api/automations/${business}/${automationType}/prompt`)
      if (!response.ok) throw new Error('Failed to fetch prompt')

      const { prompt } = await response.json()
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
        title="Copy to Claude Code"
        className={`p-2 rounded-lg transition-colors ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
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
        <Copy className="w-4 h-4" />
      )}
      {copied ? 'Copied!' : 'Copy to Claude'}
    </button>
  )
}
