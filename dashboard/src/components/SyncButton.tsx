'use client'

import { useState } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SyncButtonProps {
  label?: string
  lastSynced?: string | null
  onSync: () => Promise<void>
  size?: 'sm' | 'md'
}

export function SyncButton({ label = 'Sync', lastSynced, onSync, size = 'md' }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSynced, setJustSynced] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await onSync()
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSynced = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Never'
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-1.5 text-sm gap-2'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`flex items-center ${sizeClasses} bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50`}
      >
        {justSynced ? (
          <Check className={`${iconSize} text-green-500`} />
        ) : (
          <RefreshCw className={`${iconSize} ${syncing ? 'animate-spin' : ''}`} />
        )}
        {label}
      </button>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {error ? (
          <>
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-red-400">{error}</span>
          </>
        ) : (
          <span>Last synced: {formatLastSynced(lastSynced)}</span>
        )}
      </div>
    </div>
  )
}

// Compact version for section headers
export function SyncIndicator({
  lastSynced,
  onSync,
  syncing = false
}: {
  lastSynced?: string | null
  onSync?: () => void
  syncing?: boolean
}) {
  const formatLastSynced = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Never'
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="flex items-center gap-2">
      {onSync && (
        <button
          onClick={onSync}
          disabled={syncing}
          className="p-1 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          title="Sync now"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      )}
      <span className="text-xs text-gray-500">
        {formatLastSynced(lastSynced)}
      </span>
    </div>
  )
}
