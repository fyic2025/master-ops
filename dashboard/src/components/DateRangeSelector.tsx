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

// Get current time in Melbourne timezone
function getMelbourneNow(): Date {
  const now = new Date()
  // Use Intl.DateTimeFormat for reliable parsing
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10)
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
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
  const now = getMelbourneNow()
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

  // Last 60 Days
  const last60Start = new Date(today)
  last60Start.setDate(last60Start.getDate() - 59)
  const last60Range: DateRange = {
    key: 'last_60',
    label: 'Last 60 Days',
    start: last60Start,
    end: endOfDay(now),
  }

  // Last 90 Days
  const last90Start = new Date(today)
  last90Start.setDate(last90Start.getDate() - 89)
  const last90Range: DateRange = {
    key: 'last_90',
    label: 'Last 90 Days',
    start: last90Start,
    end: endOfDay(now),
  }

  // Last 6 Calendar Months (full months before current month)
  // e.g., if Nov 2024, shows May 1 - Oct 31
  const last6MonthsEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
  const last6MonthsStart = new Date(last6MonthsEnd.getFullYear(), last6MonthsEnd.getMonth() - 5, 1) // First day, 6 months back
  const last6MonthsRange: DateRange = {
    key: 'last_6_months',
    label: 'Last 6 Months',
    start: last6MonthsStart,
    end: endOfDay(last6MonthsEnd),
  }

  // Last 12 Calendar Months (full months before current month)
  // e.g., if Nov 2024, shows Nov 1 2023 - Oct 31 2024
  const last12MonthsEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
  const last12MonthsStart = new Date(last12MonthsEnd.getFullYear(), last12MonthsEnd.getMonth() - 11, 1) // First day, 12 months back
  const last12MonthsRange: DateRange = {
    key: 'last_12_months',
    label: 'Last 12 Months',
    start: last12MonthsStart,
    end: endOfDay(last12MonthsEnd),
  }

  // Previous Year (full calendar year before last year)
  const prevYearStart = new Date(today.getFullYear() - 2, 0, 1)
  const prevYearEnd = new Date(today.getFullYear() - 2, 11, 31)
  const prevYearRange: DateRange = {
    key: 'prev_year',
    label: 'Previous Year',
    start: prevYearStart,
    end: endOfDay(prevYearEnd),
  }

  return [
    todayRange,
    yesterdayRange,
    last7Range,
    last30Range,
    last60Range,
    last90Range,
    last6MonthsRange,
    last12MonthsRange,
    mtdRange,
    lastMonthRange,
    lastQuarterRange,
    ytdRange,
    lastYearRange,
    prevYearRange,
  ]
}

export function getCompareRange(range: DateRange): DateRange {
  let compareStart: Date
  let compareEnd: Date

  // Calendar-based comparisons for specific presets
  if (range.key === 'last_month') {
    // Previous calendar month
    compareEnd = new Date(range.start.getFullYear(), range.start.getMonth(), 0) // Last day of month before
    compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth(), 1) // First day of that month
  } else if (range.key === 'last_quarter') {
    // Previous calendar quarter
    const quarterStartMonth = range.start.getMonth()
    compareEnd = new Date(range.start.getFullYear(), quarterStartMonth, 0) // Last day before quarter
    compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth() - 2, 1) // First day of prev quarter
  } else if (range.key === 'last_6_months') {
    // Previous 6 calendar months (before the Last 6 Months range)
    compareEnd = new Date(range.start.getFullYear(), range.start.getMonth(), 0) // Last day of month before range start
    compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth() - 5, 1) // 6 months back from that
  } else if (range.key === 'last_12_months') {
    // Previous 12 calendar months (same period year before)
    compareStart = new Date(range.start.getFullYear() - 1, range.start.getMonth(), 1)
    compareEnd = new Date(range.end.getFullYear() - 1, range.end.getMonth() + 1, 0)
  } else if (range.key === 'last_year') {
    // Previous calendar year (year before last year)
    compareStart = new Date(range.start.getFullYear() - 1, 0, 1)
    compareEnd = new Date(range.start.getFullYear() - 1, 11, 31)
  } else if (range.key === 'prev_year') {
    // Year before the previous year
    compareStart = new Date(range.start.getFullYear() - 1, 0, 1)
    compareEnd = new Date(range.start.getFullYear() - 1, 11, 31)
  } else if (range.key === 'ytd') {
    // Same period last year
    compareStart = new Date(range.start.getFullYear() - 1, range.start.getMonth(), range.start.getDate())
    compareEnd = new Date(range.end.getFullYear() - 1, range.end.getMonth(), range.end.getDate())
  } else if (range.key === 'mtd') {
    // Same period last month
    compareStart = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1)
    const endDay = Math.min(range.end.getDate(), new Date(range.start.getFullYear(), range.start.getMonth(), 0).getDate())
    compareEnd = new Date(range.start.getFullYear(), range.start.getMonth() - 1, endDay)
  } else {
    // Rolling periods (Last 7 Days, Last 30 Days, Today, Yesterday, Custom)
    // Use same duration, ending day before current range starts
    const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
    compareEnd = new Date(range.start)
    compareEnd.setDate(compareEnd.getDate() - 1)
    compareStart = new Date(compareEnd)
    compareStart.setDate(compareStart.getDate() - days + 1)
  }

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

              {/* Compare to Past Period - inside dropdown */}
              {showCompare && onCompareChange && (
                <div className="border-t border-gray-700 mt-2 pt-2">
                  <button
                    onClick={handleCompareToggle}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      compareRange
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      Compare to past
                    </span>
                    {compareRange && (
                      <span className="text-xs opacity-80">On</span>
                    )}
                  </button>
                  {compareRange && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      vs {compareRange.label}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {compareRange && (
        <span className="flex items-center gap-2 text-sm text-purple-400">
          <ArrowLeftRight className="w-4 h-4" />
          vs {compareRange.label}
        </span>
      )}
    </div>
  )
}
