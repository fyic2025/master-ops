'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Plus, Minus } from 'lucide-react'

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'annually'

export interface CashFlowPeriodConfig {
  periodType: PeriodType
  futurePeriods: number // Number of future periods to show
  startDate: Date
}

interface CashFlowPeriodSelectorProps {
  value: CashFlowPeriodConfig
  onChange: (config: CashFlowPeriodConfig) => void
}

const PERIOD_OPTIONS: { key: PeriodType; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annually', label: 'Annually' },
]

function getMelbourneNow(): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10)
  return new Date(get('year'), get('month') - 1, get('day'))
}

export function getDefaultPeriodConfig(): CashFlowPeriodConfig {
  return {
    periodType: 'monthly',
    futurePeriods: 3,
    startDate: getMelbourneNow(),
  }
}

export default function CashFlowPeriodSelector({ value, onChange }: CashFlowPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePeriodTypeChange = (periodType: PeriodType) => {
    onChange({ ...value, periodType })
  }

  const handleFuturePeriodsChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(12, value.futurePeriods + delta))
    onChange({ ...value, futurePeriods: newValue })
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === value.periodType)?.label || 'Monthly'

  return (
    <div className="flex items-center gap-3">
      {/* Period Type Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{periodLabel}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    handlePeriodTypeChange(option.key)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    value.periodType === option.key
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Future Periods Counter */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
        <button
          onClick={() => handleFuturePeriodsChange(-1)}
          disabled={value.futurePeriods <= 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-sm text-white min-w-[80px] text-center">
          +{value.futurePeriods} {value.futurePeriods === 1 ? 'period' : 'periods'}
        </span>
        <button
          onClick={() => handleFuturePeriodsChange(1)}
          disabled={value.futurePeriods >= 12}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
