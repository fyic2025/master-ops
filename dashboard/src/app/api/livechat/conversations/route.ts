import { NextRequest, NextResponse } from 'next/server'
import { createBooClient } from '@/lib/supabase'

interface CustomerData {
  bc_customer_id: number | null
  order_count: number
  lifetime_value: number
  last_order_date: string | null
  past_chats_count: number
}

interface ConversationWithCustomer {
  id: string
  livechat_id: string
  thread_id: string | null
  customer_name: string | null
  customer_email: string | null
  agent_name: string | null
  started_at: string
  ended_at: string | null
  status: string
  issue_category: string | null
  sentiment: string | null
  urgency: string | null
  message_count: number
  first_response_time_seconds: number | null
  ai_summary: string | null
  customer_data: CustomerData | null
  latest_message_preview: string | null
  pending_suggestion_id: string | null
}

interface ConversationsResponse {
  conversations: ConversationWithCustomer[]
  total: number
  tabCounts: {
    all: number
    checkout_issues: number
    order_status: number
    returns_refunds: number
    stock_availability: number
    urgent: number
  }
  hasData: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const category = searchParams.get('category')
  const sentiment = searchParams.get('sentiment')
  const urgency = searchParams.get('urgency')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (business !== 'boo') {
    return NextResponse.json({
      conversations: [],
      total: 0,
      tabCounts: { all: 0, checkout_issues: 0, order_status: 0, returns_refunds: 0, stock_availability: 0, urgent: 0 },
      hasData: false,
      message: 'LiveChat is only available for Buy Organics Online',
    })
  }

  try {
    const supabase = createBooClient()

    // Default to last 30 days
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const toDate = to || new Date().toISOString()

    // Build query
    let query = supabase
      .from('livechat_conversations')
      .select(`
        id,
        livechat_id,
        thread_id,
        customer_name,
        customer_email,
        agent_name,
        started_at,
        ended_at,
        status,
        issue_category,
        sentiment,
        urgency,
        message_count,
        first_response_time_seconds,
        ai_summary
      `)
      .gte('started_at', fromDate)
      .lte('started_at', toDate)
      .order('started_at', { ascending: false })

    // Apply filters
    if (category && category !== 'all') {
      if (category === 'urgent') {
        query = query.in('urgency', ['high', 'critical'])
      } else {
        query = query.eq('issue_category', category)
      }
    }
    if (sentiment) query = query.eq('sentiment', sentiment)
    if (urgency) query = query.eq('urgency', urgency)
    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%,ai_summary.ilike.%${search}%`)
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('livechat_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', fromDate)
      .lte('started_at', toDate)

    // Apply same filters to count
    if (category && category !== 'all' && category !== 'urgent') {
      countQuery.eq('issue_category', category)
    }
    if (category === 'urgent') {
      countQuery.in('urgency', ['high', 'critical'])
    }

    const { count: total } = await countQuery

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: conversations, error: convError } = await query

    if (convError) throw convError

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        tabCounts: { all: 0, checkout_issues: 0, order_status: 0, returns_refunds: 0, stock_availability: 0, urgent: 0 },
        hasData: false,
      })
    }

    // Get tab counts
    const { data: allConvs } = await supabase
      .from('livechat_conversations')
      .select('issue_category, urgency')
      .gte('started_at', fromDate)
      .lte('started_at', toDate)

    const tabCounts = {
      all: allConvs?.length || 0,
      checkout_issues: allConvs?.filter(c => c.issue_category === 'checkout_issues').length || 0,
      order_status: allConvs?.filter(c => c.issue_category === 'order_status').length || 0,
      returns_refunds: allConvs?.filter(c => c.issue_category === 'returns_refunds').length || 0,
      stock_availability: allConvs?.filter(c => c.issue_category === 'stock_availability').length || 0,
      urgent: allConvs?.filter(c => c.urgency === 'high' || c.urgency === 'critical').length || 0,
    }

    // Get customer data from bc_orders
    const customerEmails = conversations
      .map(c => c.customer_email)
      .filter((e): e is string => !!e)

    let customerDataMap: Record<string, CustomerData> = {}

    if (customerEmails.length > 0) {
      // Get order data grouped by email
      const { data: orders } = await supabase
        .from('bc_orders')
        .select('customer_id, customer_email, total_inc_tax, date_created')
        .in('customer_email', customerEmails)

      if (orders) {
        // Aggregate by email
        const emailToData: Record<string, {
          customer_id: number | null
          orders: { total: number; date: string }[]
        }> = {}

        for (const order of orders) {
          const email = order.customer_email?.toLowerCase()
          if (!email) continue

          if (!emailToData[email]) {
            emailToData[email] = { customer_id: order.customer_id, orders: [] }
          }
          emailToData[email].orders.push({
            total: order.total_inc_tax || 0,
            date: order.date_created,
          })
        }

        // Calculate metrics
        for (const [email, data] of Object.entries(emailToData)) {
          const ltv = data.orders.reduce((sum, o) => sum + o.total, 0)
          const lastOrder = data.orders.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]

          customerDataMap[email] = {
            bc_customer_id: data.customer_id,
            order_count: data.orders.length,
            lifetime_value: Math.round(ltv * 100) / 100,
            last_order_date: lastOrder?.date || null,
            past_chats_count: 0, // Will be filled below
          }
        }
      }

      // Get past chats count for each customer
      const { data: chatCounts } = await supabase
        .from('livechat_conversations')
        .select('customer_email')
        .in('customer_email', customerEmails)

      if (chatCounts) {
        const emailChatCounts: Record<string, number> = {}
        for (const chat of chatCounts) {
          const email = chat.customer_email?.toLowerCase()
          if (email) {
            emailChatCounts[email] = (emailChatCounts[email] || 0) + 1
          }
        }
        for (const email of Object.keys(customerDataMap)) {
          customerDataMap[email].past_chats_count = emailChatCounts[email] || 0
        }
      }
    }

    // Get latest message preview for each conversation
    const convIds = conversations.map(c => c.id)
    const { data: latestMessages } = await supabase
      .from('livechat_messages')
      .select('conversation_id, content, author_type')
      .in('conversation_id', convIds)
      .eq('author_type', 'customer')
      .order('created_at_livechat', { ascending: false })

    const messagePreviewMap: Record<string, string> = {}
    for (const msg of latestMessages || []) {
      if (!messagePreviewMap[msg.conversation_id] && msg.content) {
        messagePreviewMap[msg.conversation_id] = msg.content.slice(0, 100)
      }
    }

    // Get pending suggestions
    let pendingSuggestionsMap: Record<string, string> = {}
    try {
      const { data: suggestions } = await supabase
        .from('livechat_ai_suggestions')
        .select('id, conversation_id')
        .in('conversation_id', convIds)
        .eq('status', 'pending')

      if (suggestions) {
        for (const s of suggestions) {
          pendingSuggestionsMap[s.conversation_id] = s.id
        }
      }
    } catch {
      // Table may not exist yet
    }

    // Build response
    const enrichedConversations: ConversationWithCustomer[] = conversations.map(c => ({
      ...c,
      customer_data: c.customer_email
        ? customerDataMap[c.customer_email.toLowerCase()] || null
        : null,
      latest_message_preview: messagePreviewMap[c.id] || null,
      pending_suggestion_id: pendingSuggestionsMap[c.id] || null,
    }))

    const response: ConversationsResponse = {
      conversations: enrichedConversations,
      total: total || 0,
      tabCounts,
      hasData: true,
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('LiveChat conversations API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
