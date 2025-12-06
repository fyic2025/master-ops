'use client'

import { useState } from 'react'
import { Clock, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface DispatchProduct {
  id: number
  product_id: number
  product_name: string
  sku: string
  validity_issue: string | null
  product_visible: boolean | null
  recommended_stock: number
  fix_status?: string
}

interface StockQueueButtonProps {
  product: DispatchProduct
  action?: 'disable' | 'discontinue' | 'update_inventory'
  compact?: boolean
  className?: string
  onQueued?: () => void
}

export function StockQueueButton({
  product,
  action,
  compact = false,
  className = '',
  onQueued,
}: StockQueueButtonProps) {
  const [loading, setLoading] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine default action based on product state
  const defaultAction = (): 'disable' | 'discontinue' | 'update_inventory' => {
    if (product.validity_issue === 'out_of_stock' && product.product_visible) {
      return 'disable'
    }
    if (['not_found', 'discontinued'].includes(product.validity_issue || '')) {
      return 'discontinue'
    }
    return 'update_inventory'
  }

  const selectedAction = action || defaultAction()

  const handleQueue = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stock/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          productIds: [product.id],
          priority: 5,
          params: selectedAction === 'update_inventory'
            ? { inventory_level: product.recommended_stock }
            : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to queue action')
      }

      setQueued(true)
      onQueued?.()

      setTimeout(() => setQueued(false), 3000)
    } catch (err: any) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  // Check current fix status
  const isQueued = product.fix_status === 'queued'
  const isProcessing = product.fix_status === 'processing'
  const isFailed = product.fix_status === 'failed'
  const isFixed = product.fix_status === 'fixed'

  // Get action label
  const getActionLabel = () => {
    switch (selectedAction) {
      case 'disable':
        return 'Disable'
      case 'discontinue':
        return 'Discontinue'
      case 'update_inventory':
        return `Set Stock: ${product.recommended_stock}`
    }
  }

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleQueue()
        }}
        disabled={loading || isQueued || isProcessing}
        title={
          isQueued ? 'Queued for processing'
            : isProcessing ? 'Processing...'
              : isFailed ? 'Retry action'
                : isFixed ? 'Already fixed'
                  : `Queue: ${getActionLabel()}`
        }
        className={`p-1.5 rounded transition-colors ${
          error
            ? 'bg-red-500/20 text-red-400'
            : queued
              ? 'bg-green-500/20 text-green-400'
              : isQueued
                ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
                : isProcessing
                  ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                  : isFailed
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : isFixed
                      ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                      : 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 hover:text-orange-300'
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : error ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : queued || isQueued ? (
          <Clock className="w-3.5 h-3.5" />
        ) : isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isFailed ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : isFixed ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleQueue()
      }}
      disabled={loading || isQueued || isProcessing || isFixed}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        error
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : queued
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isQueued
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed'
              : isProcessing
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed'
                : isFailed
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isFixed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : error ? (
        <AlertCircle className="w-4 h-4" />
      ) : queued || isQueued ? (
        <Clock className="w-4 h-4" />
      ) : isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFailed ? (
        <RefreshCw className="w-4 h-4" />
      ) : isFixed ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      {error
        ? 'Error'
        : queued
          ? 'Queued!'
          : isQueued
            ? 'Queued'
            : isProcessing
              ? 'Processing'
              : isFailed
                ? 'Retry'
                : isFixed
                  ? 'Fixed'
                  : 'Queue Fix'
      }
    </button>
  )
}

export default StockQueueButton
