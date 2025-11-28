'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ArrowLeftRight } from 'lucide-react'

export interface DateRange {
  start: Date
  end: Date
  label: string
  key: string
}

export interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  showCompare?: boolean
  compareRange?: DateRange | null
  onCompareChange?: (range: DateRange | null) => void
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getDatePresets(): DateRange[] {
  const now = new Date()
  const today = startOfDay(now)

  // Today
  const todayRange: DateRange = {
    key: 'today',
    label: 'Today',
    start: today,
    end: endOfDay(now),
  }

  // Yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayRange: DateRange = {
    key: 'yesterday',
    label: 'Yesterday',
    start: yesterday,
    end: endOfDay(yesterday),
  }

  // MTD (Month to Date)
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const mtdRange: DateRange = {
    key: 'mtd',
    label: 'Month to Date',
    start: mtdStart,
    end: endOfDay(now),
  }

  // Last Month
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)
  const lastMonthRange: DateRange = {
    key: 'last_month',
    label: 'Last Month',
    start: lastMonthStart,
    end: endOfDay(lastMonthEnd),
  }

  // Last Quarter
  const currentQuarter = Math.floor(today.getMonth() / 3)
  const lastQuarterEnd = new Date(today.getFullYear(), currentQuarter * 3, 0)
  const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1)
  const lastQuarterRange: DateRange = {
    key: 'last_quarter',
    label: 'Last Quarter',
    start: lastQuarterStart,
    end: endOfDay(lastQuarterEnd),
  }

  // YTD (Year to Date)
  const ytdStart = new Date(today.getFullYear(), 0, 1)
  const ytdRange: DateRange = {
    key: 'ytd',
    label: 'Year to Date',
    start: ytdStart,
    end: endOfDay(now),
  }

  // Last Year
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31)
  const lastYearRange: DateRange = {
    key: 'last_year',
    label: 'Last Year',
    start: lastYearStart,
    end: endOfDay(lastYearEnd),
  }

  // Last 7 Days
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 6)
  const last7Range: DateRange = {
    key: 'last_7',
    label: 'Last 7 Days',
    start: last7Start,
    end: endOfDay(now),
  }

  // Last 30 Days
  const last30Start = new Date(today)
  last30Start.setDate(last30Start.getDate() - 29)
  const last30Range: DateRange = {
    key: 'last_30',
    label: 'Last 30 Days',
    start: last30Start,
    end: endOfDay(now),
  }

  return [
    todayRange,
    yesterdayRange,
    last7Range,
    last30Range,
    mtdRange,
    lastMonthRange,
    lastQuarterRange,
    ytdRange,
    lastYearRange,
  ]
}

export function getCompareRange(range: DateRange): DateRange {
  const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
  const compareEnd = new Date(range.start)
  compareEnd.setDate(compareEnd.getDate() - 1)
  const compareStart = new Date(compareEnd)
  compareStart.setDate(compareStart.getDate() - days + 1)

  return {
    key: 'compare',
    label: `${formatDate(compareStart)} - ${formatDate(compareEnd)}`,
    start: startOfDay(compareStart),
    end: endOfDay(compareEnd),
  }
}

export default function DateRangeSelector({
  value,
  onChange,
  showCompare = true,
  compareRange,
  onCompareChange,
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const presets = getDatePresets()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetClick = (preset: DateRange) => {
    onChange(preset)
    setIsOpen(false)
    setShowCustom(false)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      if (start <= end) {
        onChange({
          key: 'custom',
          label: `${formatDate(start)} - ${formatDate(end)}`,
          start: startOfDay(start),
          end: endOfDay(end),
        })
        setIsOpen(false)
        setShowCustom(false)
      }
    }
  }

  const handleCompareToggle = () => {
    if (compareRange) {
      onCompareChange?.(null)
    } else {
      onCompareChange?.(getCompareRange(value))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{value.label}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    value.key === preset.key
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="border-t border-gray-700 mt-2 pt-2">
                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    showCustom ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Custom Range
                </button>

                {showCustom && (
                  <div className="px-3 py-2 space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">Start</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full mt-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">End</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full mt-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    <button
                      onClick={handleCustomApply}
                      disabled={!customStart || !customEnd}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCompare && onCompareChange && (
        <button
          onClick={handleCompareToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            compareRange
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          {compareRange ? 'Comparing' : 'Compare'}
        </button>
      )}

      {compareRange && (
        <span className="text-sm text-gray-400">
          vs {compareRange.label}
        </span>
      )}
    </div>
  )
}
