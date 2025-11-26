/**
 * Google Ads API Types
 *
 * TypeScript interfaces for Google Ads API v17 responses and requests.
 */

// Business identifiers
export type BusinessId = 'boo' | 'teelixir' | 'redhillfresh'

// OAuth2 credentials
export interface GoogleAdsCredentials {
  clientId: string
  clientSecret: string
  developerToken: string
  refreshToken: string
  customerId: string // Format: 123-456-7890 or 1234567890
}

// Campaign types
export type CampaignType =
  | 'SEARCH'
  | 'SHOPPING'
  | 'DISPLAY'
  | 'VIDEO'
  | 'PERFORMANCE_MAX'
  | 'SMART'
  | 'LOCAL'
  | 'DISCOVERY'

export type CampaignStatus = 'ENABLED' | 'PAUSED' | 'REMOVED'
export type AdGroupStatus = 'ENABLED' | 'PAUSED' | 'REMOVED'
export type KeywordMatchType = 'EXACT' | 'PHRASE' | 'BROAD'
export type KeywordStatus = 'ENABLED' | 'PAUSED' | 'REMOVED'

// Core entities
export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  type: CampaignType
  biddingStrategy?: string
  budget?: {
    amountMicros: string
    deliveryMethod: 'STANDARD' | 'ACCELERATED'
  }
  startDate?: string
  endDate?: string
}

export interface AdGroup {
  id: string
  name: string
  campaignId: string
  status: AdGroupStatus
  type?: string
  cpcBidMicros?: string
}

export interface Keyword {
  id: string
  adGroupId: string
  campaignId: string
  text: string
  matchType: KeywordMatchType
  status: KeywordStatus
  qualityScore?: number
  expectedCtr?: 'BELOW_AVERAGE' | 'AVERAGE' | 'ABOVE_AVERAGE'
  adRelevance?: 'BELOW_AVERAGE' | 'AVERAGE' | 'ABOVE_AVERAGE'
  landingPageExperience?: 'BELOW_AVERAGE' | 'AVERAGE' | 'ABOVE_AVERAGE'
  cpcBidMicros?: string
}

export interface SearchTerm {
  searchTerm: string
  adGroupId: string
  campaignId: string
  keywordId?: string
  keywordText?: string
  matchType?: KeywordMatchType
}

// Metrics
export interface CampaignMetrics {
  campaignId: string
  campaignName: string
  campaignType: CampaignType
  campaignStatus: CampaignStatus
  date: string
  impressions: number
  clicks: number
  costMicros: string
  conversions: number
  conversionValue: number
  ctr: number
  avgCpc: number
  roas: number
  impressionShare?: number
  budgetAmountMicros?: string
  budgetUtilization?: number
}

export interface KeywordMetrics {
  keywordId: string
  keywordText: string
  matchType: KeywordMatchType
  adGroupId: string
  campaignId: string
  date: string
  impressions: number
  clicks: number
  costMicros: string
  conversions: number
  conversionValue: number
  qualityScore?: number
  expectedCtr?: string
  adRelevance?: string
  landingPageExperience?: string
  avgPosition?: number
  impressionShare?: number
}

export interface SearchTermMetrics {
  searchTerm: string
  adGroupId: string
  campaignId: string
  keywordId?: string
  keywordText?: string
  date: string
  impressions: number
  clicks: number
  costMicros: string
  conversions: number
  conversionValue: number
}

export interface AccountMetrics {
  customerId: string
  date: string
  impressions: number
  clicks: number
  costMicros: string
  conversions: number
  conversionValue: number
  ctr: number
  avgCpc: number
  roas: number
}

// GAQL Query Response
export interface GaqlResponse<T = any> {
  results: T[]
  fieldMask?: string
  requestId?: string
  nextPageToken?: string
}

// List options
export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface CampaignListOptions {
  status?: CampaignStatus | CampaignStatus[]
  type?: CampaignType | CampaignType[]
  ids?: string[]
  limit?: number
}

export interface MetricsOptions {
  dateRange: DateRange
  campaignIds?: string[]
  adGroupIds?: string[]
  limit?: number
}

export interface SearchTermOptions {
  dateRange: DateRange
  campaignIds?: string[]
  adGroupIds?: string[]
  minImpressions?: number
  minClicks?: number
  limit?: number
}

// Mutations
export interface BidAdjustment {
  keywordId: string
  newBidMicros: string
}

export interface NegativeKeyword {
  campaignId: string
  text: string
  matchType: KeywordMatchType
}

export interface CampaignBudgetUpdate {
  campaignId: string
  budgetAmountMicros: string
}

// Health check response
export interface GoogleAdsHealthCheck {
  status: 'healthy' | 'unhealthy'
  customerId?: string
  accountName?: string
  currencyCode?: string
  timezone?: string
  campaignCount?: number
  error?: string
}

// Multi-account management
export interface AccountConfig {
  business: BusinessId
  customerId: string
  merchantCenterId?: string
  displayName: string
  currencyCode: string
  timezone: string
}
