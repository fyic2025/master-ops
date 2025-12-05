/**
 * LiveChat Connector
 *
 * Connects to LiveChat Agent Chat API v3.5 for fetching chat history.
 * Uses PAT (Personal Access Token) authentication via Basic Auth.
 *
 * API Docs: https://developers.livechat.com/docs/messaging/agent-chat-api
 */

import { BaseConnector, BaseConnectorConfig } from '../base/base-connector'
import {
  LiveChatConfig,
  LiveChatListArchivesResponse,
  LiveChatGetChatResponse,
  ListArchivesOptions,
  LiveChatThread,
  LiveChatUser,
  LiveChatEvent,
} from './types'

const LIVECHAT_API_URL = 'https://api.livechatinc.com/v3.5/agent/action'

export class LiveChatConnector extends BaseConnector {
  private readonly config: LiveChatConfig
  private readonly authHeader: string

  constructor(config: LiveChatConfig, connectorConfig?: BaseConnectorConfig) {
    super('livechat', {
      rateLimiter: {
        maxRequests: 10,     // LiveChat has strict rate limits
        windowMs: 1000,      // 10 requests per second
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      },
      timeout: 30000,
      ...connectorConfig,
    })

    this.config = config
    // LiveChat uses Basic Auth with account_id:pat
    this.authHeader = `Basic ${config.patBase64}`
  }

  /**
   * Make authenticated request to LiveChat API
   */
  private async request<T>(action: string, payload: Record<string, any> = {}): Promise<T> {
    const response = await fetch(`${LIVECHAT_API_URL}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      throw new Error(
        `LiveChat API error: ${response.status} - ${errorData.error?.message || errorData.message || errorText}`
      )
    }

    return response.json() as T
  }

  /**
   * Health check - list a single archive to verify connection
   */
  protected async performHealthCheck(): Promise<void> {
    await this.request<LiveChatListArchivesResponse>('list_archives', {
      limit: 1,
    })
  }

  /**
   * List archived chats with pagination
   */
  async listArchives(options: ListArchivesOptions = {}): Promise<LiveChatListArchivesResponse> {
    return this.execute('listArchives', async () => {
      return this.request<LiveChatListArchivesResponse>('list_archives', {
        filters: options.filters,
        page_id: options.page_id,
        limit: options.limit || 100,
        sort_order: options.sort_order || 'desc',
      })
    })
  }

  /**
   * Get a single chat with all threads
   */
  async getChat(chatId: string, threadId?: string): Promise<LiveChatGetChatResponse> {
    return this.execute('getChat', async () => {
      const payload: Record<string, any> = { chat_id: chatId }
      if (threadId) {
        payload.thread_id = threadId
      }
      return this.request<LiveChatGetChatResponse>('get_chat', payload)
    })
  }

  /**
   * List all archived chats within a date range
   * Handles pagination automatically
   */
  async listAllArchives(
    options: ListArchivesOptions = {},
    onProgress?: (fetched: number, total: number) => void
  ): Promise<LiveChatListArchivesResponse['chats']> {
    const allChats: LiveChatListArchivesResponse['chats'] = []
    let pageId: string | undefined
    let totalFound = 0

    do {
      const response = await this.listArchives({
        ...options,
        page_id: pageId,
        limit: 100,
      })

      allChats.push(...response.chats)
      totalFound = response.found_chats
      pageId = response.next_page_id

      if (onProgress) {
        onProgress(allChats.length, totalFound)
      }

      // Small delay between pages to be nice to the API
      if (pageId) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } while (pageId)

    return allChats
  }

  /**
   * Extract customer from users array
   */
  extractCustomer(users: LiveChatUser[]): LiveChatUser | undefined {
    return users.find(u => u.type === 'customer')
  }

  /**
   * Extract primary agent from users array
   */
  extractAgent(users: LiveChatUser[]): LiveChatUser | undefined {
    return users.find(u => u.type === 'agent')
  }

  /**
   * Calculate conversation statistics from a thread
   */
  calculateThreadStats(thread: LiveChatThread, users: LiveChatUser[]): {
    messageCount: number
    customerMessageCount: number
    agentMessageCount: number
    firstResponseTimeSeconds?: number
    durationSeconds?: number
  } {
    const customer = this.extractCustomer(users)
    const events = thread.events || []

    let messageCount = 0
    let customerMessageCount = 0
    let agentMessageCount = 0
    let firstCustomerMessageTime: Date | undefined
    let firstAgentResponseTime: Date | undefined

    for (const event of events) {
      if (event.type === 'message') {
        messageCount++
        const isCustomer = customer && event.author_id === customer.id

        if (isCustomer) {
          customerMessageCount++
          if (!firstCustomerMessageTime) {
            firstCustomerMessageTime = new Date(event.created_at)
          }
        } else {
          agentMessageCount++
          if (!firstAgentResponseTime && firstCustomerMessageTime) {
            firstAgentResponseTime = new Date(event.created_at)
          }
        }
      }
    }

    // Calculate first response time
    let firstResponseTimeSeconds: number | undefined
    if (firstCustomerMessageTime && firstAgentResponseTime) {
      firstResponseTimeSeconds = Math.round(
        (firstAgentResponseTime.getTime() - firstCustomerMessageTime.getTime()) / 1000
      )
    }

    // Calculate duration
    let durationSeconds: number | undefined
    if (thread.created_at && thread.closed_at) {
      durationSeconds = Math.round(
        (new Date(thread.closed_at).getTime() - new Date(thread.created_at).getTime()) / 1000
      )
    }

    return {
      messageCount,
      customerMessageCount,
      agentMessageCount,
      firstResponseTimeSeconds,
      durationSeconds,
    }
  }

  /**
   * Map event type to our message type
   */
  mapEventType(eventType: string): 'message' | 'system' | 'event' | 'file' | 'rich_message' {
    switch (eventType) {
      case 'message':
        return 'message'
      case 'system_message':
        return 'system'
      case 'file':
        return 'file'
      case 'rich_message':
        return 'rich_message'
      default:
        return 'event'
    }
  }

  /**
   * Determine author type from event and users
   */
  getAuthorType(
    event: LiveChatEvent,
    users: LiveChatUser[]
  ): 'customer' | 'agent' | 'system' | 'bot' {
    if (event.type === 'system_message') {
      return 'system'
    }

    const author = users.find(u => u.id === event.author_id)
    if (!author) {
      return 'system'
    }

    return author.type === 'customer' ? 'customer' : 'agent'
  }
}

export default LiveChatConnector
