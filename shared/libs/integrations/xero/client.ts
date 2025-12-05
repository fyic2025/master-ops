/**
 * Xero Connector
 *
 * Provides type-safe Xero API client with built-in:
 * - OAuth 2.0 authentication with multi-tenant support
 * - Rate limiting (60 requests per minute per tenant)
 * - Automatic retries
 * - Error handling and logging
 * - Token refresh management
 *
 * Usage:
 * ```typescript
 * import { xeroClient } from '@/shared/libs/integrations/xero'
 *
 * // Set tenant (organization)
 * xeroClient.setTenant('tenant-id-here')
 *
 * // Fetch accounts
 * const accounts = await xeroClient.accounts.list()
 *
 * // Get trial balance
 * const trialBalance = await xeroClient.reports.getTrialBalance({ date: '2024-12-31' })
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'
import {
  XeroAccount,
  XeroAccountsResponse,
  XeroJournal,
  XeroJournalsResponse,
  XeroInvoice,
  XeroInvoicesResponse,
  XeroReport,
  XeroReportsResponse,
  XeroBankTransaction,
  XeroBankTransactionsResponse,
  XeroContact,
  XeroContactsResponse,
  XeroOrganization,
  XeroOAuthToken,
  XeroConnection,
  XeroQueryOptions,
  XeroReportOptions,
} from './types'

dotenv.config()

export interface XeroConfig {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  scopes?: string[]
}

export interface XeroTokenStore {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tenantId?: string
}

class XeroConnector extends BaseConnector {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private scopes: string[]
  private baseUrl = 'https://api.xero.com/api.xro/2.0'
  private identityUrl = 'https://identity.xero.com'
  private currentTenantId?: string
  private tokenStore: Map<string, XeroTokenStore> = new Map()

  constructor(config: XeroConfig = {}) {
    super('xero', {
      rateLimiter: {
        maxRequests: 60,
        windowMs: 60000, // 60 requests per minute
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000, // 30 second timeout
    })

    this.clientId = config.clientId || process.env.XERO_CLIENT_ID || ''
    this.clientSecret = config.clientSecret || process.env.XERO_CLIENT_SECRET || ''
    this.redirectUri = config.redirectUri || process.env.XERO_REDIRECT_URI || 'http://localhost:3000/callback'
    this.scopes = config.scopes || [
      'offline_access',
      'accounting.transactions.read',
      'accounting.transactions', // Write access for bank transactions
      'accounting.journals.read',
      'accounting.reports.read',
      'accounting.contacts.read',
      'accounting.contacts', // Write access for creating contacts
      'accounting.settings.read',
    ]

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Xero credentials are required. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET environment variables.'
      )
    }
  }

  /**
   * Set the current tenant (organization) to use for API calls
   */
  setTenant(tenantId: string): void {
    this.currentTenantId = tenantId
  }

  /**
   * Get the current tenant ID
   */
  getCurrentTenant(): string | undefined {
    return this.currentTenantId
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: state || crypto.randomBytes(16).toString('hex'),
    })

    return `${this.identityUrl}/connect/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<XeroOAuthToken> {
    return this.execute('exchangeCodeForToken', async () => {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

      const response = await fetch(`${this.identityUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw ErrorHandler.authentication(`Failed to exchange code for token: ${error}`, {
          service: 'xero',
          operation: 'exchangeCodeForToken',
        })
      }

      return response.json() as XeroOAuthToken
    })
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<XeroOAuthToken> {
    return this.execute('refreshAccessToken', async () => {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

      const response = await fetch(`${this.identityUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw ErrorHandler.authentication(`Failed to refresh token: ${error}`, {
          service: 'xero',
          operation: 'refreshAccessToken',
        })
      }

      return response.json() as XeroOAuthToken
    })
  }

  /**
   * Store tokens for a tenant
   */
  storeTokens(tenantId: string, token: XeroOAuthToken): void {
    this.tokenStore.set(tenantId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      tenantId,
    })
  }

  /**
   * Get stored tokens for current tenant
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.currentTenantId) {
      throw ErrorHandler.validation('No tenant ID set. Call setTenant() first.', {
        service: 'xero',
      })
    }

    const stored = this.tokenStore.get(this.currentTenantId)
    if (!stored) {
      throw ErrorHandler.authentication('No tokens found for tenant. Authenticate first.', {
        service: 'xero',
        details: { tenantId: this.currentTenantId },
      })
    }

    // Check if token is expired (with 5 minute buffer)
    if (stored.expiresAt - Date.now() < 300000) {
      // Refresh token
      const newToken = await this.refreshAccessToken(stored.refreshToken)
      this.storeTokens(this.currentTenantId, newToken)
      return newToken.access_token
    }

    return stored.accessToken
  }

  /**
   * Get connections (tenants) for the authenticated user
   */
  async getConnections(): Promise<XeroConnection[]> {
    return this.execute('getConnections', async () => {
      // Use any stored token to get connections
      const firstToken = Array.from(this.tokenStore.values())[0]
      if (!firstToken) {
        throw ErrorHandler.authentication('No tokens available. Authenticate first.', {
          service: 'xero',
        })
      }

      const response = await fetch(`${this.identityUrl}/connections`, {
        headers: {
          'Authorization': `Bearer ${firstToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }

      return response.json() as XeroConnection[]
    })
  }

  /**
   * Make authenticated request to Xero API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const accessToken = await this.getValidAccessToken()

    if (!this.currentTenantId) {
      throw ErrorHandler.validation('No tenant ID set', { service: 'xero' })
    }

    const url = new URL(path, this.baseUrl)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.append(key, value.join(','))
          } else {
            url.searchParams.append(key, String(value))
          }
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'xero-tenant-id': this.currentTenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw await this.handleErrorResponse(response)
    }

    return response.json() as T
  }

  /**
   * Handle error responses from Xero API
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    let errorMessage = `Xero API error: ${response.status} ${response.statusText}`

    try {
      const errorData = await response.json() as { Message?: string; Detail?: string }
      if (errorData.Message) {
        errorMessage = errorData.Message
      } else if (errorData.Detail) {
        errorMessage = errorData.Detail
      }
    } catch {
      // If we can't parse JSON, use status text
    }

    if (response.status === 401) {
      return ErrorHandler.authentication(errorMessage, { service: 'xero' })
    } else if (response.status === 403) {
      return ErrorHandler.authorization(errorMessage, { service: 'xero' })
    } else if (response.status === 404) {
      return ErrorHandler.notFound(errorMessage, { service: 'xero' })
    } else if (response.status === 429) {
      return ErrorHandler.rateLimit(errorMessage, { service: 'xero' })
    } else if (response.status >= 500) {
      return ErrorHandler.serviceUnavailable(errorMessage, { service: 'xero' })
    } else {
      return ErrorHandler.validation(errorMessage, { service: 'xero' })
    }
  }

  /**
   * Health check - verify API connectivity
   */
  protected async performHealthCheck(): Promise<void> {
    if (!this.currentTenantId) {
      throw new Error('No tenant set for health check')
    }

    // Simple check: try to get organisation details
    await this.organisations.getCurrent()
  }

  // ==================== ORGANISATIONS ====================

  readonly organisations = {
    /**
     * Get current organisation details
     */
    getCurrent: (): Promise<XeroOrganization> =>
      this.execute('organisations.getCurrent', async () => {
        const response = await this.request<{ Organisations: XeroOrganization[] }>(
          'GET',
          '/Organisation'
        )
        return response.Organisations[0]
      }),
  }

  // ==================== ACCOUNTS ====================

  readonly accounts = {
    /**
     * List all accounts
     */
    list: (options?: XeroQueryOptions): Promise<XeroAccount[]> =>
      this.execute('accounts.list', async () => {
        const response = await this.request<XeroAccountsResponse>(
          'GET',
          '/Accounts',
          undefined,
          options
        )
        return response.Accounts || []
      }),

    /**
     * Get a specific account by ID
     */
    get: (accountId: string): Promise<XeroAccount> =>
      this.execute('accounts.get', async () => {
        const response = await this.request<XeroAccountsResponse>(
          'GET',
          `/Accounts/${accountId}`
        )
        return response.Accounts[0]
      }),

    /**
     * Get account by code
     */
    getByCode: (code: string): Promise<XeroAccount> =>
      this.execute('accounts.getByCode', async () => {
        const response = await this.request<XeroAccountsResponse>(
          'GET',
          '/Accounts',
          undefined,
          { where: `Code=="${code}"` }
        )
        if (!response.Accounts || response.Accounts.length === 0) {
          throw ErrorHandler.notFound(`Account with code ${code} not found`, {
            service: 'xero',
          })
        }
        return response.Accounts[0]
      }),
  }

  // ==================== JOURNALS ====================

  readonly journals = {
    /**
     * List journals with pagination
     */
    list: (options?: { offset?: number; paymentsOnly?: boolean }): Promise<XeroJournal[]> =>
      this.execute('journals.list', async () => {
        const response = await this.request<XeroJournalsResponse>(
          'GET',
          '/Journals',
          undefined,
          options
        )
        return response.Journals || []
      }),

    /**
     * Get a specific journal by ID
     */
    get: (journalId: string): Promise<XeroJournal> =>
      this.execute('journals.get', async () => {
        const response = await this.request<XeroJournalsResponse>(
          'GET',
          `/Journals/${journalId}`
        )
        return response.Journals[0]
      }),
  }

  // ==================== INVOICES ====================

  readonly invoices = {
    /**
     * List invoices
     */
    list: (options?: XeroQueryOptions): Promise<XeroInvoice[]> =>
      this.execute('invoices.list', async () => {
        const response = await this.request<XeroInvoicesResponse>(
          'GET',
          '/Invoices',
          undefined,
          options
        )
        return response.Invoices || []
      }),

    /**
     * Get a specific invoice by ID
     */
    get: (invoiceId: string): Promise<XeroInvoice> =>
      this.execute('invoices.get', async () => {
        const response = await this.request<XeroInvoicesResponse>(
          'GET',
          `/Invoices/${invoiceId}`
        )
        return response.Invoices[0]
      }),
  }

  // ==================== CONTACTS ====================

  readonly contacts = {
    /**
     * List contacts
     */
    list: (options?: XeroQueryOptions): Promise<XeroContact[]> =>
      this.execute('contacts.list', async () => {
        const response = await this.request<XeroContactsResponse>(
          'GET',
          '/Contacts',
          undefined,
          options
        )
        return response.Contacts || []
      }),

    /**
     * Get a specific contact by ID
     */
    get: (contactId: string): Promise<XeroContact> =>
      this.execute('contacts.get', async () => {
        const response = await this.request<XeroContactsResponse>(
          'GET',
          `/Contacts/${contactId}`
        )
        return response.Contacts[0]
      }),

    /**
     * Search contacts by name
     */
    search: (name: string): Promise<XeroContact[]> =>
      this.execute('contacts.search', async () => {
        const response = await this.request<XeroContactsResponse>(
          'GET',
          '/Contacts',
          undefined,
          { where: `Name.Contains("${name}")` }
        )
        return response.Contacts || []
      }),
  }

  // ==================== BANK TRANSACTIONS ====================

  readonly bankTransactions = {
    /**
     * List bank transactions
     */
    list: (options?: XeroQueryOptions): Promise<XeroBankTransaction[]> =>
      this.execute('bankTransactions.list', async () => {
        const response = await this.request<XeroBankTransactionsResponse>(
          'GET',
          '/BankTransactions',
          undefined,
          options
        )
        return response.BankTransactions || []
      }),

    /**
     * Get a specific bank transaction by ID
     */
    get: (transactionId: string): Promise<XeroBankTransaction> =>
      this.execute('bankTransactions.get', async () => {
        const response = await this.request<XeroBankTransactionsResponse>(
          'GET',
          `/BankTransactions/${transactionId}`
        )
        return response.BankTransactions[0]
      }),

    /**
     * Create a new bank transaction
     */
    create: (transaction: Partial<XeroBankTransaction>): Promise<XeroBankTransaction> =>
      this.execute('bankTransactions.create', async () => {
        const response = await this.request<XeroBankTransactionsResponse>(
          'POST',
          '/BankTransactions',
          { BankTransactions: [transaction] }
        )
        return response.BankTransactions[0]
      }),

    /**
     * Update an existing bank transaction
     */
    update: (transactionId: string, transaction: Partial<XeroBankTransaction>): Promise<XeroBankTransaction> =>
      this.execute('bankTransactions.update', async () => {
        const response = await this.request<XeroBankTransactionsResponse>(
          'POST',
          `/BankTransactions/${transactionId}`,
          { BankTransactions: [transaction] }
        )
        return response.BankTransactions[0]
      }),
  }

  // ==================== CONTACTS (Enhanced) ====================

  readonly contactsExtended = {
    /**
     * Create a new contact
     */
    create: (contact: Partial<XeroContact>): Promise<XeroContact> =>
      this.execute('contacts.create', async () => {
        const response = await this.request<XeroContactsResponse>(
          'POST',
          '/Contacts',
          { Contacts: [contact] }
        )
        return response.Contacts[0]
      }),

    /**
     * Update an existing contact
     */
    update: (contactId: string, contact: Partial<XeroContact>): Promise<XeroContact> =>
      this.execute('contacts.update', async () => {
        const response = await this.request<XeroContactsResponse>(
          'POST',
          `/Contacts/${contactId}`,
          { Contacts: [contact] }
        )
        return response.Contacts[0]
      }),
  }

  // ==================== REPORTS ====================

  readonly reports = {
    /**
     * Get Trial Balance report
     */
    getTrialBalance: (options?: XeroReportOptions): Promise<XeroReport> =>
      this.execute('reports.getTrialBalance', async () => {
        const response = await this.request<XeroReportsResponse>(
          'GET',
          '/Reports/TrialBalance',
          undefined,
          options
        )
        return response.Reports[0]
      }),

    /**
     * Get Profit and Loss report
     */
    getProfitAndLoss: (options?: XeroReportOptions): Promise<XeroReport> =>
      this.execute('reports.getProfitAndLoss', async () => {
        const response = await this.request<XeroReportsResponse>(
          'GET',
          '/Reports/ProfitAndLoss',
          undefined,
          options
        )
        return response.Reports[0]
      }),

    /**
     * Get Balance Sheet report
     */
    getBalanceSheet: (options?: XeroReportOptions): Promise<XeroReport> =>
      this.execute('reports.getBalanceSheet', async () => {
        const response = await this.request<XeroReportsResponse>(
          'GET',
          '/Reports/BalanceSheet',
          undefined,
          options
        )
        return response.Reports[0]
      }),

    /**
     * Get Bank Summary report
     */
    getBankSummary: (options?: XeroReportOptions): Promise<XeroReport> =>
      this.execute('reports.getBankSummary', async () => {
        const response = await this.request<XeroReportsResponse>(
          'GET',
          '/Reports/BankSummary',
          undefined,
          options
        )
        return response.Reports[0]
      }),

    /**
     * Get Executive Summary report
     */
    getExecutiveSummary: (options?: XeroReportOptions): Promise<XeroReport> =>
      this.execute('reports.getExecutiveSummary', async () => {
        const response = await this.request<XeroReportsResponse>(
          'GET',
          '/Reports/ExecutiveSummary',
          undefined,
          options
        )
        return response.Reports[0]
      }),
  }
}

// Export singleton instance
export const xeroClient = new XeroConnector()

// Export class for custom instances
export { XeroConnector }
