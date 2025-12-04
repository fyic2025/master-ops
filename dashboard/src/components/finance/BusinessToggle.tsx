'use client'

import { Building2 } from 'lucide-react'

export type BusinessView = 'teelixir' | 'elevate' | 'consolidated'

interface BusinessToggleProps {
  value: BusinessView
  onChange: (value: BusinessView) => void
}

const BUSINESSES: { key: BusinessView; label: string; color: string }[] = [
  { key: 'teelixir', label: 'Teelixir', color: 'bg-brand-teelixir' },
  { key: 'elevate', label: 'Elevate', color: 'bg-brand-elevate' },
  { key: 'consolidated', label: 'Consolidated', color: 'bg-purple-500' },
]

export default function BusinessToggle({ value, onChange }: BusinessToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
      {BUSINESSES.map((biz) => {
        const isActive = value === biz.key
        return (
          <button
            key={biz.key}
            onClick={() => onChange(biz.key)}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
              ${isActive
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full ${biz.color}`} />
            <span>{biz.label}</span>
          </button>
        )
      })}
    </div>
  )
}
