'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Loader2, FileText } from 'lucide-react'

interface DispatchProduct {
  id: number
  product_id: number
  product_name: string
  sku: string
  supplier_name: string
  orders_per_week: number
  recommended_stock: number
  validity_issue: string | null
  product_inventory: number | null
  product_visible: boolean | null
  avg_dispatch_days: number
}

interface StockCopyToClaudeButtonProps {
  products: DispatchProduct[]
  action?: 'fix_all' | 'investigate' | 'supplier_report'
  className?: string
  compact?: boolean
}

export function StockCopyToClaudeButton({
  products,
  action = 'fix_all',
  className = '',
  compact = false,
}: StockCopyToClaudeButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    if (products.length === 0) return

    setLoading(true)
    try {
      // Generate prompt via API
      const response = await fetch('/api/stock/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate prompt')
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(data.prompt)
      setCopied(true)

      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    } finally {
      setLoading(false)
    }
  }

  if (products.length === 0) {
    return null
  }

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleCopy()
        }}
        disabled={loading}
        title="Copy to Claude Code"
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
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    )
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
        <FileText className="w-4 h-4" />
      )}
      {copied
        ? 'Copied!'
        : `Copy ${products.length} to Claude`
      }
    </button>
  )
}

export default StockCopyToClaudeButton
