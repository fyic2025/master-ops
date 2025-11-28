'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface GoogleAdsMetric {
  id: string
  business: string
  campaign_id: string
  campaign_name: string
  date: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  conversion_value: number
  roas: number
}

const businessNames: Record<string, string> = {
  boo: 'BOO',
  teelixir: 'Teelixir',
  rhf: 'Red Hill Fresh',
}

async function fetchGoogleAdsMetrics(business?: string): Promise<GoogleAdsMetric[]> {
  let query = supabase
    .from('sync_google_ads_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(100)

  if (business && business !== 'all') {
    query = query.eq('business', business)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function fetchTodaySummary() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('sync_google_ads_metrics')
    .select('impressions, clicks, cost, conversions, conversion_value')
    .eq('date', today)

  if (error) return null

  const totals = (data || []).reduce(
    (acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      cost: acc.cost + (row.cost || 0),
      conversions: acc.conversions + (row.conversions || 0),
      conversion_value: acc.conversion_value + (row.conversion_value || 0),
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
  )

  return {
    ...totals,
    roas: totals.cost > 0 ? totals.conversion_value / totals.cost : 0,
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function PPCDashboard() {
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all')

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['google-ads-metrics', selectedBusiness],
    queryFn: () => fetchGoogleAdsMetrics(selectedBusiness),
    refetchInterval: 60000,
  })

  const { data: todaySummary } = useQuery({
    queryKey: ['google-ads-today'],
    queryFn: fetchTodaySummary,
    refetchInterval: 60000,
  })

  // Group metrics by campaign for the table
  const campaignMetrics = metrics?.reduce((acc: Record<string, any>, row) => {
    const key = `${row.business}-${row.campaign_id}`
    if (!acc[key]) {
      acc[key] = {
        ...row,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversion_value: 0,
      }
    }
    acc[key].impressions += row.impressions || 0
    acc[key].clicks += row.clicks || 0
    acc[key].cost += row.cost || 0
    acc[key].conversions += row.conversions || 0
    acc[key].conversion_value += row.conversion_value || 0
    return acc
  }, {})

  const campaigns = Object.values(campaignMetrics || {}).map((c: any) => ({
    ...c,
    roas: c.cost > 0 ? c.conversion_value / c.cost : 0,
  }))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">PPC Dashboard</h1>
        <p className="text-gray-400 mt-1">Google Ads performance across all accounts</p>
      </header>

      {/* Account Selector */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Accounts' },
          { key: 'boo', label: 'BOO' },
          { key: 'teelixir', label: 'Teelixir' },
          { key: 'rhf', label: 'Red Hill Fresh' },
        ].map((account) => (
          <button
            key={account.key}
            onClick={() => setSelectedBusiness(account.key)}
            className={`px-4 py-2 rounded-lg text-sm ${
              selectedBusiness === account.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {account.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Spend (Today)"
          value={todaySummary ? formatCurrency(todaySummary.cost) : '$--'}
          icon={DollarSign}
        />
        <KPICard
          title="Clicks"
          value={todaySummary ? formatNumber(todaySummary.clicks) : '--'}
          icon={MousePointer}
        />
        <KPICard
          title="Impressions"
          value={todaySummary ? formatNumber(todaySummary.impressions) : '--'}
          icon={Eye}
        />
        <KPICard
          title="ROAS"
          value={todaySummary ? `${todaySummary.roas.toFixed(2)}x` : '--x'}
          icon={TrendingUp}
        />
      </div>

      {/* Campaign Performance Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Campaign Performance</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            </div>
          ) : campaigns.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-3">Campaign</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3 text-right">Spend</th>
                  <th className="pb-3 text-right">Clicks</th>
                  <th className="pb-3 text-right">Conv.</th>
                  <th className="pb-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {campaigns.map((campaign: any) => (
                  <tr key={`${campaign.business}-${campaign.campaign_id}`} className="border-t border-gray-800">
                    <td className="py-3 text-white">{campaign.campaign_name || 'Unknown Campaign'}</td>
                    <td className="py-3 text-gray-400">{businessNames[campaign.business] || campaign.business}</td>
                    <td className="py-3 text-right text-white">{formatCurrency(campaign.cost)}</td>
                    <td className="py-3 text-right text-white">{formatNumber(campaign.clicks)}</td>
                    <td className="py-3 text-right text-white">{campaign.conversions}</td>
                    <td className={`py-3 text-right ${campaign.roas >= 3 ? 'text-green-500' : campaign.roas >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {campaign.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No campaign data available</p>
              <p className="text-sm text-gray-500 mt-1">Waiting for Google Ads developer token approval</p>
            </div>
          )}
        </div>
      </section>

      {/* Search Terms Queue */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Search Term Mining</h2>
          <span className="text-sm text-gray-500">0 pending review</span>
        </div>
        <div className="p-4 text-gray-400 text-sm">
          No search terms pending review
        </div>
      </section>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  )
}
