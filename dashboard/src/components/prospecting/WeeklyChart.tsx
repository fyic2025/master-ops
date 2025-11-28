'use client'

import { Loader2 } from 'lucide-react'

interface WeeklyStats {
  run_date: string
  run_status: string
  contacts_processed: number
  accounts_created: number
  emails_queued: number
  errors_count: number
}

interface WeeklyChartProps {
  stats: WeeklyStats[]
  isLoading: boolean
}

export function WeeklyChart({ stats, isLoading }: WeeklyChartProps) {
  // Format and reverse so oldest is first (left to right)
  const chartData = stats
    .slice()
    .reverse()
    .map(s => {
      const date = new Date(s.run_date)
      return {
        date: date.toLocaleDateString('en-AU', { weekday: 'short' }),
        processed: s.contacts_processed,
        errors: s.errors_count,
      }
    })

  const maxValue = Math.max(...chartData.map(s => s.processed + s.errors), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">7-Day Activity</h2>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : chartData.length > 0 ? (
        <div className="p-4">
          {/* Simple bar chart */}
          <div className="flex items-end justify-between gap-2 h-40">
            {chartData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '120px' }}>
                  {day.processed > 0 && (
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${(day.processed / maxValue) * 100}%` }}
                      title={`${day.processed} processed`}
                    />
                  )}
                  {day.errors > 0 && (
                    <div
                      className="w-full bg-red-500 rounded-t"
                      style={{ height: `${(day.errors / maxValue) * 100}%` }}
                      title={`${day.errors} errors`}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500">{day.date}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-gray-400">Processed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-gray-400">Errors</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          No data for the past 7 days
        </div>
      )}
    </div>
  )
}
