'use client'

import { Play, Pause, Settings2, Filter } from 'lucide-react'

interface ControlPanelProps {
  enabled: boolean
  dailyLimit: number
  leadCategory: string | null
  onToggleEnabled: () => void
  onUpdateLimit: (limit: number) => void
  onUpdateCategory: (category: string | null) => void
  isUpdating: boolean
}

export function ControlPanel({
  enabled,
  dailyLimit,
  leadCategory,
  onToggleEnabled,
  onUpdateLimit,
  onUpdateCategory,
  isUpdating
}: ControlPanelProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-6">
        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleEnabled}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              enabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {enabled ? 'Pause Prospecting' : 'Resume Prospecting'}
          </button>
          <span className={`text-sm ${enabled ? 'text-green-400' : 'text-gray-500'}`}>
            {enabled ? 'System Active' : 'System Paused'}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-700" />

        {/* Daily Limit */}
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-400">Daily Limit:</label>
          <select
            value={dailyLimit}
            onChange={(e) => onUpdateLimit(parseInt(e.target.value))}
            disabled={isUpdating}
            className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm disabled:opacity-50"
          >
            {[1, 2, 3, 5, 10, 15, 20].map(n => (
              <option key={n} value={n}>{n} contacts/day</option>
            ))}
          </select>
        </div>

        <div className="h-8 w-px bg-gray-700" />

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-400">Lead Category:</label>
          <select
            value={leadCategory || 'all'}
            onChange={(e) => onUpdateCategory(e.target.value === 'all' ? null : e.target.value)}
            disabled={isUpdating}
            className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="all">All Categories</option>
            <option value="beauty">Beauty</option>
            <option value="fitness">Fitness</option>
          </select>
        </div>
      </div>
    </div>
  )
}
