/**
 * LiveChat API Types
 *
 * Based on LiveChat Agent Chat API v3.5
 * https://developers.livechat.com/docs/messaging/agent-chat-api
 */

export interface LiveChatConfig {
  accountId: string
  entityId: string
  patBase64: string
}

// =============================================================================
// Chat/Thread Types
// =============================================================================

export interface LiveChatThread {
  id: string
  active: boolean
  user_ids: string[]
  events: LiveChatEvent[]
  properties?: Record<string, Record<string, any>>
  access?: {
    group_ids: number[]
  }
  previous_thread_id?: string
  next_thread_id?: string
  created_at: string
  closed_at?: string
  queue?: {
    position: number
    wait_time: number
  }
}

export interface LiveChatChat {
  id: string
  users: LiveChatUser[]
  threads: LiveChatThread[]
  properties?: Record<string, Record<string, any>>
  access?: {
    group_ids: number[]
  }
  is_followed: boolean
}

// =============================================================================
// User Types
// =============================================================================

export interface LiveChatUser {
  id: string
  type: 'customer' | 'agent'
  name?: string
  email?: string
  avatar?: string
  present?: boolean
  events_seen_up_to?: string
  last_seen_timestamp?: string
}

export interface LiveChatCustomer extends LiveChatUser {
  type: 'customer'
  session_fields?: Array<{ key: string; value: string }>
  statistics?: {
    chats_count: number
    threads_count: number
    visits_count: number
    page_views_count: number
    greetings_shown_count: number
    greetings_accepted_count: number
  }
}

export interface LiveChatAgent extends LiveChatUser {
  type: 'agent'
  routing_status?: 'accepting_chats' | 'not_accepting_chats' | 'offline'
}

// =============================================================================
// Event Types
// =============================================================================

export type LiveChatEventType =
  | 'message'
  | 'system_message'
  | 'file'
  | 'filled_form'
  | 'rich_message'
  | 'custom'

export interface LiveChatEvent {
  id: string
  type: LiveChatEventType
  created_at: string
  author_id: string
  text?: string
  properties?: Record<string, Record<string, any>>
  postback?: {
    id: string
    thread_id: string
    event_id: string
    type: string
    value: string
  }
}

export interface LiveChatMessage extends LiveChatEvent {
  type: 'message'
  text: string
  visibility?: 'all' | 'agents'
}

export interface LiveChatSystemMessage extends LiveChatEvent {
  type: 'system_message'
  system_message_type: string
  text?: string
  recipients?: 'all' | 'agents'
}

export interface LiveChatFile extends LiveChatEvent {
  type: 'file'
  name: string
  url: string
  content_type: string
  size: number
  width?: number
  height?: number
  thumbnail_url?: string
  thumbnail2x_url?: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface LiveChatListChatsResponse {
  chats_summary: Array<{
    id: string
    last_event_per_type: Record<string, LiveChatEvent>
    users: LiveChatUser[]
    last_thread_summary: {
      id: string
      created_at: string
      user_ids: string[]
      active: boolean
      properties?: Record<string, Record<string, any>>
    }
    properties?: Record<string, Record<string, any>>
    access?: {
      group_ids: number[]
    }
    order?: number
  }>
  found_chats: number
  next_page_id?: string
  previous_page_id?: string
}

export interface LiveChatListArchivesResponse {
  chats: Array<{
    id: string
    users: LiveChatUser[]
    thread: LiveChatThread
    properties?: Record<string, Record<string, any>>
    access?: {
      group_ids: number[]
    }
  }>
  found_chats: number
  next_page_id?: string
  previous_page_id?: string
}

export interface LiveChatGetChatResponse {
  id: string
  users: LiveChatUser[]
  threads: LiveChatThread[]
  properties?: Record<string, Record<string, any>>
  access?: {
    group_ids: number[]
  }
  is_followed: boolean
}

// =============================================================================
// Sync Types (for Supabase)
// =============================================================================

export interface LiveChatConversationRecord {
  livechat_id: string
  thread_id?: string
  customer_name?: string
  customer_email?: string
  customer_id?: string
  agent_name?: string
  agent_email?: string
  agent_id?: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  status: 'active' | 'closed' | 'queued' | 'pending'
  message_count: number
  customer_message_count: number
  agent_message_count: number
  first_response_time_seconds?: number
  tags?: any[]
  custom_variables?: Record<string, any>
  metadata?: Record<string, any>
}

export interface LiveChatMessageRecord {
  conversation_id: string
  livechat_message_id: string
  message_type: 'message' | 'system' | 'event' | 'file' | 'rich_message'
  author_type: 'customer' | 'agent' | 'system' | 'bot'
  author_id?: string
  author_name?: string
  content?: string
  content_type?: string
  attachments?: any[]
  created_at_livechat: string
  metadata?: Record<string, any>
}

// =============================================================================
// API Request Types
// =============================================================================

export interface ListArchivesFilters {
  from?: string      // ISO date string
  to?: string        // ISO date string
  thread_ids?: string[]
  agents?: string[]
  tags?: string[]
  sales?: {
    from?: number
    to?: number
  }
  goals?: {
    from?: number
    to?: number
  }
  surveys?: Array<{
    type: string
    answer: {
      id: string
      value?: string
    }
  }>
  event_types?: string[]
  greetings?: string[]
  agent_response?: 'first' | 'any'
  properties?: Record<string, Record<string, any>>
}

export interface ListArchivesOptions {
  filters?: ListArchivesFilters
  page_id?: string
  limit?: number
  sort_order?: 'asc' | 'desc'
  highlights?: {
    pre_tag?: string
    post_tag?: string
  }
}
