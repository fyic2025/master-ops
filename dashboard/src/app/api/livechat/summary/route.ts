import { NextRequest, NextResponse } from 'next/server'
import { createBooClient } from '@/lib/supabase'

interface LiveChatSummary {
  business: string
  period: { from: string; to: string }
  metrics: {
    totalConversations: number
    activeNow: number
    avgResponseTime: number
    avgDuration: number
    avgMessages: number
    negativePercent: number
    urgentCount: number
  }
  byCategory: Record<string, number>
  bySentiment: Record<string, number>
  byUrgency: Record<string, number>
  pendingReplies: number
  lastSynced: string | null
  hasData: boolean
  message?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Only BOO has LiveChat
  if (business !== 'boo') {
    return NextResponse.json({
      business,
      hasData: false,
      message: 'LiveChat is only available for Buy Organics Online',
    })
  }

  try {
    const supabase = createBooClient()

    // Default to last 30 days
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const toDate = to || new Date().toISOString()

    // Fetch conversations in date range
    const { data: conversations, error: convError } = await supabase
      .from('livechat_conversations')
      .select('id, status, issue_category, sentiment, urgency, first_response_time_seconds, duration_seconds, message_count, started_at, last_synced_at')
      .gte('started_at', fromDate)
      .lte('started_at', toDate)

    if (convError) throw convError

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        business,
        hasData: false,
        message: 'No LiveChat conversations synced yet. Run the sync script first.',
      })
    }

    // Calculate metrics
    const totalConversations = conversations.length
    const activeNow = conversations.filter(c => c.status === 'active').length

    // Average response time (filter out nulls)
    const responseTimes = conversations
      .map(c => c.first_response_time_seconds)
      .filter((t): t is number => t !== null && t !== undefined)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    // Average duration
    const durations = conversations
      .map(c => c.duration_seconds)
      .filter((d): d is number => d !== null && d !== undefined)
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    // Average messages
    const avgMessages = conversations.reduce((sum, c) => sum + (c.message_count || 0), 0) / totalConversations

    // Sentiment breakdown
    const bySentiment: Record<string, number> = {}
    let negativeCount = 0
    conversations.forEach(c => {
      const sentiment = c.sentiment || 'unknown'
      bySentiment[sentiment] = (bySentiment[sentiment] || 0) + 1
      if (sentiment === 'negative') negativeCount++
    })
    const negativePercent = (negativeCount / totalConversations) * 100

    // Category breakdown
    const byCategory: Record<string, number> = {}
    conversations.forEach(c => {
      const category = c.issue_category || 'uncategorized'
      byCategory[category] = (byCategory[category] || 0) + 1
    })

    // Urgency breakdown
    const byUrgency: Record<string, number> = {}
    let urgentCount = 0
    conversations.forEach(c => {
      const urgency = c.urgency || 'unknown'
      byUrgency[urgency] = (byUrgency[urgency] || 0) + 1
      if (urgency === 'high' || urgency === 'critical') urgentCount++
    })

    // Get pending AI replies count
    let pendingReplies = 0
    try {
      const { count } = await supabase
        .from('livechat_ai_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      pendingReplies = count || 0
    } catch {
      // Table may not exist yet
    }

    // Get last sync time
    const lastSynced = conversations.reduce((latest, c) => {
      if (!c.last_synced_at) return latest
      return !latest || new Date(c.last_synced_at) > new Date(latest)
        ? c.last_synced_at
        : latest
    }, null as string | null)

    const summary: LiveChatSummary = {
      business,
      period: { from: fromDate, to: toDate },
      metrics: {
        totalConversations,
        activeNow,
        avgResponseTime: Math.round(avgResponseTime),
        avgDuration: Math.round(avgDuration),
        avgMessages: Math.round(avgMessages * 10) / 10,
        negativePercent: Math.round(negativePercent * 10) / 10,
        urgentCount,
      },
      byCategory,
      bySentiment,
      byUrgency,
      pendingReplies,
      lastSynced,
      hasData: true,
    }

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('LiveChat summary API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch LiveChat data' },
      { status: 500 }
    )
  }
}
