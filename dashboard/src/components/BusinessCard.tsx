'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BusinessCode } from '@/lib/business-config'

interface BusinessCardProps {
  name: string
  code: BusinessCode
  platform: string
  color: string
}

interface BusinessMetrics {
  orders_today: number
  revenue_today: number
  revenue_mtd: number
  sync_status: string
}

async function fetchBusinessMetrics(code: string): Promise<BusinessMetrics | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('dashboard_business_metrics')
    .select('orders_today, revenue_today, revenue_mtd, sync_status')
    .eq('business', code)
    .eq('date', today)
    .maybeSingle()

  if (error) {
    console.error('Error fetching metrics:', error)
    return null
  }

  return data
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BusinessCard({ name, code, platform, color }: BusinessCardProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['business-metrics', code],
    queryFn: () => fetchBusinessMetrics(code),
    refetchInterval: 60000, // Refresh every minute
  })

  return (
    <Link href={`/${code}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
        <div className="flex items-start justify-between">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mt-3">{name}</h3>
        <p className="text-sm text-gray-500">{platform}</p>

        <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Orders Today</p>
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin mt-1" />
            ) : (
              <p className="text-lg font-semibold text-white">
                {metrics?.orders_today ?? '--'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenue</p>
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin mt-1" />
            ) : (
              <p className="text-lg font-semibold text-white">
                {metrics?.revenue_today ? formatCurrency(metrics.revenue_today) : '--'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
