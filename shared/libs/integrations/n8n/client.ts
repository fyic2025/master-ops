/**
 * n8n Workflow Automation Connector
 *
 * Provides type-safe n8n API client for managing workflows programmatically.
 *
 * Usage:
 * ```typescript
 * import { n8nClient } from '@/shared/libs/integrations/n8n'
 *
 * const workflows = await n8nClient.workflows.list()
 * await n8nClient.workflows.activate('workflow-id')
 * const execution = await n8nClient.executions.get('execution-id')
 * ```
 */

import { BaseConnector } from '../base/base-connector'
import { ErrorHandler } from '../base/error-handler'
import * as dotenv from 'dotenv'

dotenv.config()

export interface N8nConfig {
  baseUrl?: string
  apiKey?: string
}

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  nodes: any[]
  connections: any
  settings?: any
  tags?: any[]
}

export interface N8nExecution {
  id: string
  finished: boolean
  mode: 'manual' | 'trigger' | 'webhook' | 'cli' | 'retry'
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  workflowData?: N8nWorkflow
  data?: any
}

export interface N8nExecutionSummary {
  id: string
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  workflowName?: string
  retryOf?: string
}

export interface N8nCredential {
  id: string
  name: string
  type: string
  createdAt: string
  updatedAt: string
}

class N8nConnector extends BaseConnector {
  private baseUrl: string
  private apiKey: string

  constructor(config: N8nConfig = {}) {
    super('n8n', {
      rateLimiter: {
        maxRequests: 120, // n8n typically allows 120 requests per minute
        windowMs: 60000,
      },
      retry: {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      timeout: 30000,
    })

    this.baseUrl = config.baseUrl || process.env.N8N_BASE_URL || ''
    this.apiKey = config.apiKey || process.env.N8N_API_KEY || ''

    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'n8n configuration required. Set N8N_BASE_URL and N8N_API_KEY environment variables.'
      )
    }

    // Ensure baseUrl doesn't end with slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '')
  }

  /**
   * Make authenticated request to n8n API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(path, `${this.baseUrl}/api/v1`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `n8n API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorBody)
        errorMessage = errorJson.message || errorMessage
      } catch {
        // Use default error message
      }

      throw ErrorHandler.wrap(new Error(errorMessage), {
        statusCode: response.status,
        service: 'n8n',
        details: {
          path,
          method,
          responseBody: errorBody,
        },
      })
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T
    }

    return response.json() as T
  }

  /**
   * Health check implementation
   */
  protected async performHealthCheck(): Promise<void> {
    await this.execute('healthCheck', async () => {
      // Try to fetch workflows list to verify API access
      await this.request('GET', '/workflows', undefined, { limit: 1 })
    })
  }

  // ==========================================================================
  // WORKFLOWS API
  // ==========================================================================

  workflows = {
    /**
     * Get workflow by ID
     */
    get: async (workflowId: string): Promise<N8nWorkflow> => {
      return this.execute('workflows.get', async () => {
        return this.request<N8nWorkflow>(
          'GET',
          `/workflows/${workflowId}`
        )
      }, { metadata: { workflowId } })
    },

    /**
     * List all workflows
     */
    list: async (options?: {
      active?: boolean
      tags?: string[]
    }): Promise<{ data: N8nWorkflow[] }> => {
      return this.execute('workflows.list', async () => {
        return this.request<{ data: N8nWorkflow[] }>(
          'GET',
          '/workflows',
          undefined,
          {
            active: options?.active,
            tags: options?.tags?.join(','),
          }
        )
      })
    },

    /**
     * Create workflow
     */
    create: async (workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> => {
      return this.execute('workflows.create', async () => {
        return this.request<N8nWorkflow>(
          'POST',
          '/workflows',
          workflow
        )
      }, { metadata: { name: workflow.name } })
    },

    /**
     * Update workflow
     */
    update: async (workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> => {
      return this.execute('workflows.update', async () => {
        return this.request<N8nWorkflow>(
          'PATCH',
          `/workflows/${workflowId}`,
          workflow
        )
      }, { metadata: { workflowId } })
    },

    /**
     * Delete workflow
     */
    delete: async (workflowId: string): Promise<void> => {
      return this.execute('workflows.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/workflows/${workflowId}`
        )
      }, { metadata: { workflowId } })
    },

    /**
     * Activate workflow
     */
    activate: async (workflowId: string): Promise<N8nWorkflow> => {
      return this.execute('workflows.activate', async () => {
        return this.request<N8nWorkflow>(
          'PATCH',
          `/workflows/${workflowId}`,
          { active: true }
        )
      }, { metadata: { workflowId } })
    },

    /**
     * Deactivate workflow
     */
    deactivate: async (workflowId: string): Promise<N8nWorkflow> => {
      return this.execute('workflows.deactivate', async () => {
        return this.request<N8nWorkflow>(
          'PATCH',
          `/workflows/${workflowId}`,
          { active: false }
        )
      }, { metadata: { workflowId } })
    },
  }

  // ==========================================================================
  // EXECUTIONS API
  // ==========================================================================

  executions = {
    /**
     * Get execution by ID
     */
    get: async (executionId: string): Promise<N8nExecution> => {
      return this.execute('executions.get', async () => {
        return this.request<N8nExecution>(
          'GET',
          `/executions/${executionId}`
        )
      }, { metadata: { executionId } })
    },

    /**
     * List executions with filters
     */
    list: async (options?: {
      workflowId?: string
      finished?: boolean
      limit?: number
      status?: 'error' | 'success' | 'waiting'
    }): Promise<{ data: N8nExecutionSummary[]; nextCursor?: string }> => {
      return this.execute('executions.list', async () => {
        return this.request<{ data: N8nExecutionSummary[]; nextCursor?: string }>(
          'GET',
          '/executions',
          undefined,
          {
            workflowId: options?.workflowId,
            finished: options?.finished,
            limit: options?.limit || 100,
            status: options?.status,
          }
        )
      })
    },

    /**
     * Delete execution
     */
    delete: async (executionId: string): Promise<void> => {
      return this.execute('executions.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/executions/${executionId}`
        )
      }, { metadata: { executionId } })
    },

    /**
     * Retry failed execution
     */
    retry: async (executionId: string): Promise<N8nExecution> => {
      return this.execute('executions.retry', async () => {
        return this.request<N8nExecution>(
          'POST',
          `/executions/${executionId}/retry`
        )
      }, { metadata: { executionId } })
    },
  }

  // ==========================================================================
  // CREDENTIALS API
  // ==========================================================================

  credentials = {
    /**
     * Get credential by ID
     */
    get: async (credentialId: string): Promise<N8nCredential> => {
      return this.execute('credentials.get', async () => {
        return this.request<N8nCredential>(
          'GET',
          `/credentials/${credentialId}`
        )
      }, { metadata: { credentialId } })
    },

    /**
     * List all credentials
     */
    list: async (options?: {
      type?: string
    }): Promise<{ data: N8nCredential[] }> => {
      return this.execute('credentials.list', async () => {
        return this.request<{ data: N8nCredential[] }>(
          'GET',
          '/credentials',
          undefined,
          { type: options?.type }
        )
      })
    },

    /**
     * Create credential
     */
    create: async (credential: {
      name: string
      type: string
      data: any
    }): Promise<N8nCredential> => {
      return this.execute('credentials.create', async () => {
        return this.request<N8nCredential>(
          'POST',
          '/credentials',
          credential
        )
      }, { metadata: { name: credential.name } })
    },

    /**
     * Delete credential
     */
    delete: async (credentialId: string): Promise<void> => {
      return this.execute('credentials.delete', async () => {
        return this.request<void>(
          'DELETE',
          `/credentials/${credentialId}`
        )
      }, { metadata: { credentialId } })
    },
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(workflowId: string, days: number = 7): Promise<{
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    successRate: number
  }> {
    return this.execute('getWorkflowStats', async () => {
      const executions = await this.executions.list({
        workflowId,
        limit: 1000,
      })

      const total = executions.data.length
      const successful = executions.data.filter(e => e.finished && !e.stoppedAt?.includes('error')).length
      const failed = total - successful

      return {
        totalExecutions: total,
        successfulExecutions: successful,
        failedExecutions: failed,
        successRate: total > 0 ? (successful / total) * 100 : 0,
      }
    }, { metadata: { workflowId, days } })
  }

  /**
   * Get all active workflows
   */
  async getActiveWorkflows(): Promise<N8nWorkflow[]> {
    return this.execute('getActiveWorkflows', async () => {
      const response = await this.workflows.list({ active: true })
      return response.data
    })
  }

  /**
   * Get failed executions for a workflow
   */
  async getFailedExecutions(workflowId: string, limit: number = 50): Promise<N8nExecutionSummary[]> {
    return this.execute('getFailedExecutions', async () => {
      const response = await this.executions.list({
        workflowId,
        status: 'error',
        limit,
      })
      return response.data
    }, { metadata: { workflowId, limit } })
  }
}

// Export singleton instance
export const n8nClient = new N8nConnector()

// Export class for custom instances
export { N8nConnector }
