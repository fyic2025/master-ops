/**
 * Smartlead API Types
 *
 * Complete TypeScript types for Smartlead cold email outreach platform
 * API Documentation: https://helpcenter.smartlead.ai/en/articles/125-full-api-documentation
 */

export interface SmartleadConfig {
  apiKey?: string
  baseUrl?: string
  rateLimitPerSecond?: number
}

// ============================================================================
// Lead Types
// ============================================================================

export interface SmartleadLead {
  id?: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  company_name?: string
  website?: string
  location?: string
  linkedin_profile?: string
  custom_fields?: Record<string, string>
  campaign_lead_map_id?: string
  status?: LeadStatus
  created_at?: string
  updated_at?: string
}

export type LeadStatus = 'STARTED' | 'COMPLETED' | 'BLOCKED' | 'INPROGRESS' | 'PAUSED'

export interface AddLeadsRequest {
  lead_list: SmartleadLead[]
  ignore_global_block_list?: boolean
  ignore_unsubscribe_list?: boolean
  ignore_duplicate_leads_in_other_campaign?: boolean
}

export interface AddLeadsResponse {
  status: string
  message: string
  upload_count: number
  total_leads: number
  duplicates: number
  invalid_emails: number
}

export interface LeadCategory {
  id: string
  name: string
  color?: string
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface SmartleadCampaign {
  id: string
  name: string
  status: CampaignStatus
  client_id?: string
  created_at: string
  updated_at: string
  track_settings?: TrackSettings
  stop_lead_settings?: StopLeadSettings
  unsubscribe_text?: string
  send_as_plain_text?: boolean
  follow_up_percentage?: number
  enable_ai_esp_matching?: boolean
  schedule?: CampaignSchedule
}

export type CampaignStatus = 'DRAFTED' | 'ACTIVE' | 'COMPLETED' | 'STOPPED' | 'PAUSED'

export interface TrackSettings {
  open?: boolean
  click?: boolean
}

export interface StopLeadSettings {
  stop_on_reply?: boolean
  stop_on_auto_reply?: boolean
  stop_on_link_click?: boolean
}

export interface CampaignSchedule {
  timezone?: string
  days_of_the_week?: number[] // 0-6, where 0 is Sunday
  start_hour?: number // 0-23
  end_hour?: number // 0-23
  min_time_btw_emails?: number // minutes
  max_new_leads_per_day?: number
  schedule_start_time?: string // ISO date
}

export interface CreateCampaignRequest {
  name: string
  client_id?: string
}

export interface UpdateCampaignSettingsRequest {
  track_settings?: TrackSettings
  stop_lead_settings?: StopLeadSettings
  unsubscribe_text?: string
  send_as_plain_text?: boolean
  follow_up_percentage?: number
  client_id?: string
  enable_ai_esp_matching?: boolean
}

// ============================================================================
// Campaign Sequence Types
// ============================================================================

export interface CampaignSequence {
  id?: string
  seq_number: number
  seq_delay_details: SequenceDelayDetails
  seq_variants: SequenceVariant[]
}

export interface SequenceDelayDetails {
  delay_in_days?: number
  delay_in_hours?: number
  delay_in_minutes?: number
}

export interface SequenceVariant {
  id?: string
  subject: string
  email_body: string
  variant_label?: string
}

export interface SaveSequenceRequest {
  sequences: CampaignSequence[]
}

// ============================================================================
// Email Account Types
// ============================================================================

export interface SmartleadEmailAccount {
  id: string
  from_name: string
  from_email: string
  user_name: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  max_email_per_day: number
  daily_sent_count?: number
  warmup_enabled?: boolean
  warmup_details?: WarmupDetails
  custom_tracking_url?: string
  bcc?: string
  signature?: string
  client_id?: string
  time_to_wait_in_mins?: number
  created_at?: string
  email_provider?: EmailProvider
}

export type EmailProvider = 'GMAIL' | 'ZOHO' | 'OUTLOOK' | 'SMTP'

export interface WarmupDetails {
  total_warmup_per_day: number
  daily_rampup: number
  reply_rate_percentage: number
  warmup_key_id?: string
}

export interface CreateEmailAccountRequest {
  from_name: string
  from_email: string
  user_name: string
  password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  max_email_per_day: number
  warmup_enabled?: boolean
  daily_rampup?: number
  reply_rate_percentage?: number
  client_id?: string
}

export interface UpdateEmailAccountRequest {
  max_email_per_day?: number
  custom_tracking_url?: string
  bcc?: string
  signature?: string
  client_id?: string
  time_to_wait_in_mins?: number
}

export interface WarmupStatsResponse {
  stats_by_date: Array<{
    date: string
    sent_count: number
    reply_count: number
    save_from_spam_count: number
  }>
}

// ============================================================================
// Analytics & Statistics Types
// ============================================================================

export interface CampaignStatistics {
  lead_id: string
  lead_email: string
  lead_first_name?: string
  lead_last_name?: string
  email_sequence_number: number
  email_subject: string
  email_sent_time?: string
  email_opened_time?: string
  email_clicked_time?: string
  email_replied_time?: string
  email_bounced_time?: string
  email_unsubscribed_time?: string
  lead_status: LeadStatus
}

export interface CampaignAnalytics {
  id: number
  user_id: number
  created_at: string
  status: CampaignStatus
  name: string
  // Note: Smartlead API returns counts as strings
  sent_count: string
  open_count: string
  click_count: string
  reply_count: string
  block_count: string
  total_count: string
  sequence_count: string
  drafted_count: string
  unique_sent_count: string
  unique_open_count: string
  unique_click_count: string
  bounce_count: string
  unsubscribed_count: string
  tags: string | null
  client_id: string | null
  parent_campaign_id: string | null
  team_member_id: string | null
  send_as_plain_text: boolean
  client_name: string | null
  client_email: string | null
  client_company_name: string | null
  campaign_lead_stats: {
    total: number
    paused: number
    blocked: number
    revenue: number
    stopped: number
    completed: number
    inprogress: number
    interested: number
    notStarted: number
  }
}

export interface AnalyticsByDateRange {
  start_date: string
  end_date: string
  sent_count: number
  open_count: number
  click_count: number
  reply_count: number
  block_count: number
  bounce_count: number
  unsubscribed_count: number
}

// ============================================================================
// Message History Types
// ============================================================================

export interface MessageHistory {
  message_type: 'SENT' | 'REPLY'
  message_id: string
  time: string
  email_body: string
  subject?: string
  from_email?: string
  to_email?: string
}

export interface ReplyToLeadRequest {
  email_stats_id: string
  email_body: string
  reply_message_id: string
  reply_email_time: string
  reply_email_body: string
  cc?: string[]
  bcc?: string[]
  add_signature?: boolean
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface SmartleadWebhook {
  id?: string
  campaign_id?: string
  client_id?: string
  webhook_url: string
  event_types: WebhookEventType[]
  enabled?: boolean
  created_at?: string
}

export type WebhookEventType =
  | 'EMAIL_SENT'
  | 'EMAIL_OPEN'
  | 'EMAIL_LINK_CLICK'
  | 'EMAIL_REPLY'
  | 'LEAD_UNSUBSCRIBED'
  | 'LEAD_CATEGORY_UPDATED'

export interface WebhookPayload {
  event_type: WebhookEventType
  campaign_id: string
  lead_id: string
  lead_email: string
  timestamp: string
  data: Record<string, any>
}

// ============================================================================
// List & Pagination Types
// ============================================================================

export interface ListOptions {
  offset?: number
  limit?: number
}

export interface ListResponse<T> {
  results: T[]
  total?: number
  offset?: number
  limit?: number
}

// ============================================================================
// Client Management Types
// ============================================================================

export interface SmartleadClient {
  id: string
  name: string
  email?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface SmartleadErrorResponse {
  status: string
  message: string
  error_code?: string
  details?: Record<string, any>
}
