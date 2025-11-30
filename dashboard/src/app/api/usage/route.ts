import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface UsageRow {
  service: string
  usage_date: string
  call_count: number
  error_count: number
}

interface ServiceUsage {
  service: string
  displayName: string
  today: number
  last7d: number
  last30d: number
  todayErrors: number
  last7dErrors: number
  last30dErrors: number
}

// Map service codes to display names
const SERVICE_NAMES: Record<string, string> = {
  google_merchant: 'Google Merchant',
  gmc_performance: 'GMC Performance',
  gsc: 'Google Search Console',
  gsc_inspection: 'URL Inspection',
  xero: 'Xero',
  bigcommerce: 'BigCommerce',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  livechat: 'LiveChat',
  hubspot: 'HubSpot',
  unleashed: 'Unleashed',
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Get last 30 days of usage data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('api_usage_daily')
      .select('service, usage_date, call_count, error_count')
      .gte('usage_date', thirtyDaysAgoStr)
      .order('usage_date', { ascending: false })

    if (error) {
      console.error('Error fetching usage data:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate by service
    const usageByService: Record<string, ServiceUsage> = {}

    for (const row of (data as UsageRow[]) || []) {
      if (!usageByService[row.service]) {
        usageByService[row.service] = {
          service: row.service,
          displayName: SERVICE_NAMES[row.service] || row.service,
          today: 0,
          last7d: 0,
          last30d: 0,
          todayErrors: 0,
          last7dErrors: 0,
          last30dErrors: 0,
        }
      }

      const entry = usageByService[row.service]
      entry.last30d += row.call_count
      entry.last30dErrors += row.error_count

      if (row.usage_date >= sevenDaysAgoStr) {
        entry.last7d += row.call_count
        entry.last7dErrors += row.error_count
      }

      if (row.usage_date === today) {
        entry.today += row.call_count
        entry.todayErrors += row.error_count
      }
    }

    // Convert to array and sort by 30-day usage
    const services = Object.values(usageByService).sort((a, b) => b.last30d - a.last30d)

    // Calculate totals
    const totals = {
      today: services.reduce((sum, s) => sum + s.today, 0),
      last7d: services.reduce((sum, s) => sum + s.last7d, 0),
      last30d: services.reduce((sum, s) => sum + s.last30d, 0),
      todayErrors: services.reduce((sum, s) => sum + s.todayErrors, 0),
      last7dErrors: services.reduce((sum, s) => sum + s.last7dErrors, 0),
      last30dErrors: services.reduce((sum, s) => sum + s.last30dErrors, 0),
    }

    return NextResponse.json({
      services,
      totals,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('API usage route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
