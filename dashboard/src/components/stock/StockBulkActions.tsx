'use client'

import { useState } from 'react'
import { Clock, Loader2, CheckCircle, XCircle, FileText, ChevronDown } from 'lucide-react'
import { StockCopyToClaudeButton } from './StockCopyToClaudeButton'

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
  review_status?: string
}

interface StockBulkActionsProps {
  selectedProducts: DispatchProduct[]
  onAction?: () => void
  onClearSelection?: () => void
}

type BulkAction = 'disable_zero' | 'hide_invalid' | 'mark_reviewed' | 'queue_all'

export function StockBulkActions({
  selectedProducts,
  onAction,
  onClearSelection,
}: StockBulkActionsProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  const count = selectedProducts.length

  // Calculate action counts
  const zeroStockCount = selectedProducts.filter(
    p => p.validity_issue === 'out_of_stock' && p.product_visible
  ).length

  const invalidCount = selectedProducts.filter(
    p => ['not_found', 'discontinued'].includes(p.validity_issue || '')
  ).length

  const handleBulkAction = async (action: BulkAction) => {
    setLoading(true)
    setResult(null)
    setShowMenu(false)

    try {
      let productIds: number[] = []
      let queueAction: string = ''
      let params: Record<string, any> | undefined

      switch (action) {
        case 'disable_zero':
          productIds = selectedProducts
            .filter(p => p.validity_issue === 'out_of_stock' && p.product_visible)
            .map(p => p.id)
          queueAction = 'disable'
          break

        case 'hide_invalid':
          productIds = selectedProducts
            .filter(p => ['not_found', 'discontinued'].includes(p.validity_issue || ''))
            .map(p => p.id)
          queueAction = 'discontinue'
          break

        case 'mark_reviewed':
          // This is a local action, not a queue action
          const reviewIds = selectedProducts.map(p => p.id)
          for (const id of reviewIds) {
            await fetch('/api/dispatch-issues', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, review_status: 'reviewed' }),
            })
          }
          setResult({ success: true, message: `Marked ${reviewIds.length} as reviewed` })
          onAction?.()
          return

        case 'queue_all':
          // Queue all selected for their default action
          const toDisable = selectedProducts.filter(
            p => p.validity_issue === 'out_of_stock' && p.product_visible
          )
          const toDiscontinue = selectedProducts.filter(
            p => ['not_found', 'discontinued'].includes(p.validity_issue || '')
          )
          const toUpdate = selectedProducts.filter(
            p => !p.validity_issue && p.product_inventory !== null && p.product_inventory < p.recommended_stock
          )

          let totalQueued = 0

          if (toDisable.length > 0) {
            await fetch('/api/stock/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'disable',
                productIds: toDisable.map(p => p.id),
              }),
            })
            totalQueued += toDisable.length
          }

          if (toDiscontinue.length > 0) {
            await fetch('/api/stock/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'discontinue',
                productIds: toDiscontinue.map(p => p.id),
              }),
            })
            totalQueued += toDiscontinue.length
          }

          // Queue update_inventory items individually with their params
          for (const product of toUpdate) {
            await fetch('/api/stock/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_inventory',
                productIds: [product.id],
                params: { inventory_level: product.recommended_stock },
              }),
            })
            totalQueued++
          }

          setResult({ success: true, message: `Queued ${totalQueued} items` })
          onAction?.()
          return
      }

      if (productIds.length === 0) {
        setResult({ success: false, message: 'No matching products for this action' })
        return
      }

      const response = await fetch('/api/stock/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: queueAction,
          productIds,
          params,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to queue action')
      }

      setResult({ success: true, message: `Queued ${data.queued} items` })
      onAction?.()
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setLoading(false)
      setTimeout(() => setResult(null), 3000)
    }
  }

  if (count === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
      <span className="text-sm text-zinc-400">
        <span className="font-medium text-white">{count}</span> selected
      </span>

      <div className="w-px h-6 bg-zinc-700" />

      {/* Copy to Claude */}
      <StockCopyToClaudeButton products={selectedProducts} />

      {/* Bulk Queue Actions Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          Queue Actions
          <ChevronDown className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50">
            <button
              onClick={() => handleBulkAction('queue_all')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700/50 transition-colors first:rounded-t-lg"
            >
              <div className="font-medium">Queue All Selected</div>
              <div className="text-xs text-zinc-400">Auto-detect action per product</div>
            </button>

            {zeroStockCount > 0 && (
              <button
                onClick={() => handleBulkAction('disable_zero')}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700/50 transition-colors border-t border-zinc-700"
              >
                <div className="font-medium">Disable Zero-Stock ({zeroStockCount})</div>
                <div className="text-xs text-zinc-400">Hide from storefront</div>
              </button>
            )}

            {invalidCount > 0 && (
              <button
                onClick={() => handleBulkAction('hide_invalid')}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700/50 transition-colors border-t border-zinc-700"
              >
                <div className="font-medium">Hide Invalid ({invalidCount})</div>
                <div className="text-xs text-zinc-400">Set availability to disabled</div>
              </button>
            )}

            <button
              onClick={() => handleBulkAction('mark_reviewed')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700/50 transition-colors border-t border-zinc-700 last:rounded-b-lg"
            >
              <div className="font-medium">Mark as Reviewed ({count})</div>
              <div className="text-xs text-zinc-400">Update status (no BC changes)</div>
            </button>
          </div>
        )}
      </div>

      {/* Result feedback */}
      {result && (
        <div className={`flex items-center gap-2 text-sm ${
          result.success ? 'text-green-400' : 'text-red-400'
        }`}>
          {result.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {result.message}
        </div>
      )}

      {/* Clear selection */}
      <button
        onClick={onClearSelection}
        className="ml-auto text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Clear selection
      </button>
    </div>
  )
}

export default StockBulkActions
