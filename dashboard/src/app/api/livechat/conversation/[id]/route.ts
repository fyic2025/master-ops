import { NextRequest, NextResponse } from 'next/server'
import { createBooClient } from '@/lib/supabase'

interface Message {
  id: string
  message_type: string
  author_type: string
  author_name: string | null
  content: string | null
  created_at_livechat: string
  attachments: any[]
}

interface CustomerData {
  bc_customer_id: number | null
  order_count: number
  lifetime_value: number
  last_order_date: string | null
  recent_orders: {
    order_id: number
    total: number
    status: string
    date: string
  }[]
  past_chats_count: number
}

interface AISuggestion {
  id: string
  suggested_reply: string
  edited_reply: string | null
  status: string
  created_at: string
}

interface ConversationDetail {
  id: string
  livechat_id: string
  thread_id: string | null
  customer_name: string | null
  customer_email: string | null
  agent_name: string | null
  agent_email: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: string
  issue_category: string | null
  sentiment: string | null
  urgency: string | null
  resolution_status: string | null
  message_count: number
  first_response_time_seconds: number | null
  ai_summary: string | null
  ai_insights: any
  messages: Message[]
  customer_data: CustomerData | null
  pending_suggestion: AISuggestion | null
  hasData: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id

  try {
    const supabase = createBooClient()

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('livechat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found', hasData: false },
        { status: 404 }
      )
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('livechat_messages')
      .select('id, message_type, author_type, author_name, content, created_at_livechat, attachments')
      .eq('conversation_id', conversationId)
      .order('created_at_livechat', { ascending: true })

    if (msgError) throw msgError

    // Fetch customer data from bc_orders
    let customerData: CustomerData | null = null

    if (conversation.customer_email) {
      const email = conversation.customer_email.toLowerCase()

      // Get total order count and LTV
      const { data: allOrders } = await supabase
        .from('bc_orders')
        .select('bc_order_id, customer_id, total_inc_tax, status, date_created')
        .ilike('customer_email', email)
        .order('date_created', { ascending: false })

      if (allOrders && allOrders.length > 0) {
        const ltv = allOrders.reduce((sum, o) => sum + (o.total_inc_tax || 0), 0)

        customerData = {
          bc_customer_id: allOrders[0].customer_id,
          order_count: allOrders.length,
          lifetime_value: Math.round(ltv * 100) / 100,
          last_order_date: allOrders[0].date_created,
          recent_orders: allOrders.slice(0, 5).map(o => ({
            order_id: o.bc_order_id,
            total: o.total_inc_tax || 0,
            status: o.status || 'unknown',
            date: o.date_created,
          })),
          past_chats_count: 0,
        }
      }

      // Get past chats count
      const { count: chatCount } = await supabase
        .from('livechat_conversations')
        .select('*', { count: 'exact', head: true })
        .ilike('customer_email', email)

      if (customerData) {
        customerData.past_chats_count = chatCount || 0
      } else {
        customerData = {
          bc_customer_id: null,
          order_count: 0,
          lifetime_value: 0,
          last_order_date: null,
          recent_orders: [],
          past_chats_count: chatCount || 0,
        }
      }
    }

    // Fetch pending AI suggestion
    let pendingSuggestion: AISuggestion | null = null
    try {
      const { data: suggestion } = await supabase
        .from('livechat_ai_suggestions')
        .select('id, suggested_reply, edited_reply, status, created_at')
        .eq('conversation_id', conversationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (suggestion) {
        pendingSuggestion = suggestion
      }
    } catch {
      // Table may not exist or no pending suggestion
    }

    const response: ConversationDetail = {
      id: conversation.id,
      livechat_id: conversation.livechat_id,
      thread_id: conversation.thread_id,
      customer_name: conversation.customer_name,
      customer_email: conversation.customer_email,
      agent_name: conversation.agent_name,
      agent_email: conversation.agent_email,
      started_at: conversation.started_at,
      ended_at: conversation.ended_at,
      duration_seconds: conversation.duration_seconds,
      status: conversation.status,
      issue_category: conversation.issue_category,
      sentiment: conversation.sentiment,
      urgency: conversation.urgency,
      resolution_status: conversation.resolution_status,
      message_count: conversation.message_count,
      first_response_time_seconds: conversation.first_response_time_seconds,
      ai_summary: conversation.ai_summary,
      ai_insights: conversation.ai_insights,
      messages: messages || [],
      customer_data: customerData,
      pending_suggestion: pendingSuggestion,
      hasData: true,
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('LiveChat conversation detail API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}
