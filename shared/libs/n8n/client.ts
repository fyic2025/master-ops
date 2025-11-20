/**
 * n8n API Client
 *
 * Comprehensive client for interacting with n8n REST API
 * Provides type-safe methods for all n8n operations
 */

import * as dotenv from 'dotenv'

dotenv.config()

// ============================================================================
// Types
// ============================================================================

export interface N8nConfig {
  baseUrl: string
  apiKey: string
}

export interface N8nWorkflow {
  id?: string
  name: string
  nodes: N8nNode[]
  connections: Record<string, any>
  active?: boolean
  settings?: N8nWorkflowSettings
  staticData?: any
  tags?: string[]
  versionId?: string
  createdAt?: string
  updatedAt?: string
}

export interface N8nNode {
  id?: string
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  parameters?: Record<string, any>
  credentials?: Record<string, any>
  webhookId?: string
  notesInFlow?: boolean
  notes?: string
  disabled?: boolean
}

export interface N8nWorkflowSettings {
  executionOrder?: 'v0' | 'v1'
  saveDataErrorExecution?: 'all' | 'none'
  saveDataSuccessExecution?: 'all' | 'none'
  saveManualExecutions?: boolean
  callerPolicy?: 'any' | 'workflowsFromSameOwner' | 'workflowsFromAList' | 'none'
  executionTimeout?: number
  timezone?: string
  errorWorkflow?: string
}

export interface N8nExecution {
  id: string
  finished: boolean
  mode: 'manual' | 'trigger' | 'webhook' | 'retry'
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  workflowData?: N8nWorkflow
  data?: any
  status?: 'running' | 'success' | 'error' | 'waiting'
}

export interface N8nCredential {
  id: string
  name: string
  type: string
  data?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// ============================================================================
// N8n Client Class
// ============================================================================

export class N8nClient {
  private config: N8nConfig

  constructor(config?: Partial<N8nConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.N8N_BASE_URL || '',
      apiKey: config?.apiKey || process.env.N8N_API_KEY || '',
    }

    if (!this.config.baseUrl || !this.config.apiKey) {
      throw new Error(
        'N8N_BASE_URL and N8N_API_KEY must be provided via config or environment variables'
      )
    }

    // Remove trailing slash from baseUrl
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '')
  }

  // --------------------------------------------------------------------------
  // HTTP Request Handler
  // --------------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1${endpoint}`

    const headers: Record<string, string> = {
      'X-N8N-API-KEY': this.config.apiKey,
    }

    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `n8n API Error (${response.status} ${response.statusText}): ${errorText}`
      )
    }

    return response.json()
  }

  // --------------------------------------------------------------------------
  // Workflow Methods
  // --------------------------------------------------------------------------

  /**
   * List all workflows
   */
  async listWorkflows(options?: {
    active?: boolean
    tags?: string[]
  }): Promise<{ data: N8nWorkflow[] }> {
    let endpoint = '/workflows'
    const params = new URLSearchParams()

    if (options?.active !== undefined) {
      params.append('active', String(options.active))
    }

    if (options?.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','))
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    return this.request<{ data: N8nWorkflow[] }>('GET', endpoint)
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('GET', `/workflows/${workflowId}`)
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<N8nWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('POST', '/workflows', workflow)
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    workflowId: string,
    workflow: Partial<N8nWorkflow>
  ): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('PUT', `/workflows/${workflowId}`, workflow)
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request('DELETE', `/workflows/${workflowId}`)
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('POST', `/workflows/${workflowId}/activate`)
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('POST', `/workflows/${workflowId}/deactivate`)
  }

  // --------------------------------------------------------------------------
  // Execution Methods
  // --------------------------------------------------------------------------

  /**
   * List workflow executions
   */
  async listExecutions(options?: {
    workflowId?: string
    status?: 'success' | 'error' | 'waiting' | 'running'
    limit?: number
  }): Promise<{ data: N8nExecution[] }> {
    let endpoint = '/executions'
    const params = new URLSearchParams()

    if (options?.workflowId) {
      params.append('workflowId', options.workflowId)
    }

    if (options?.status) {
      params.append('status', options.status)
    }

    if (options?.limit) {
      params.append('limit', String(options.limit))
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    return this.request<{ data: N8nExecution[] }>('GET', endpoint)
  }

  /**
   * Get a specific execution by ID
   */
  async getExecution(executionId: string): Promise<N8nExecution> {
    return this.request<N8nExecution>('GET', `/executions/${executionId}`)
  }

  /**
   * Delete an execution
   */
  async deleteExecution(executionId: string): Promise<void> {
    await this.request('DELETE', `/executions/${executionId}`)
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string): Promise<N8nExecution> {
    return this.request<N8nExecution>('POST', `/workflows/${workflowId}/execute`)
  }

  // --------------------------------------------------------------------------
  // Credentials Methods
  // --------------------------------------------------------------------------

  /**
   * List all credentials
   */
  async listCredentials(): Promise<{ data: N8nCredential[] }> {
    return this.request<{ data: N8nCredential[] }>('GET', '/credentials')
  }

  /**
   * Get a specific credential by ID
   */
  async getCredential(credentialId: string): Promise<N8nCredential> {
    return this.request<N8nCredential>('GET', `/credentials/${credentialId}`)
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Find workflows by name pattern
   */
  async findWorkflowsByName(namePattern: string | RegExp): Promise<N8nWorkflow[]> {
    const { data: workflows } = await this.listWorkflows()
    const pattern = typeof namePattern === 'string'
      ? new RegExp(namePattern, 'i')
      : namePattern

    return workflows.filter((wf) => pattern.test(wf.name))
  }

  /**
   * Get active workflows only
   */
  async getActiveWorkflows(): Promise<N8nWorkflow[]> {
    const { data: workflows } = await this.listWorkflows({ active: true })
    return workflows
  }

  /**
   * Get recent executions for a workflow
   */
  async getRecentExecutions(
    workflowId: string,
    limit: number = 10
  ): Promise<N8nExecution[]> {
    const { data: executions } = await this.listExecutions({ workflowId, limit })
    return executions
  }

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    total: number
    success: number
    error: number
    running: number
    waiting: number
  }> {
    const { data: executions } = await this.listExecutions({ workflowId, limit: 100 })

    const stats = {
      total: executions.length,
      success: 0,
      error: 0,
      running: 0,
      waiting: 0,
    }

    executions.forEach((exec) => {
      if (exec.status) {
        stats[exec.status]++
      } else if (exec.finished && !exec.stoppedAt) {
        stats.success++
      } else if (!exec.finished) {
        stats.error++
      }
    })

    return stats
  }

  /**
   * Import workflow from JSON file
   */
  async importWorkflowFromFile(filePath: string): Promise<N8nWorkflow> {
    const fs = await import('fs')
    const path = await import('path')

    const absolutePath = path.resolve(filePath)
    const fileContent = fs.readFileSync(absolutePath, 'utf-8')
    const workflow = JSON.parse(fileContent) as N8nWorkflow

    // Remove fields that shouldn't be sent on import
    delete workflow.id
    delete workflow.createdAt
    delete workflow.updatedAt

    return this.createWorkflow(workflow)
  }

  /**
   * Export workflow to JSON file
   */
  async exportWorkflowToFile(workflowId: string, outputPath: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId)
    const fs = await import('fs')
    const path = await import('path')

    const absolutePath = path.resolve(outputPath)
    fs.writeFileSync(absolutePath, JSON.stringify(workflow, null, 2), 'utf-8')
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(
    workflowId: string,
    newName?: string
  ): Promise<N8nWorkflow> {
    const workflow = await this.getWorkflow(workflowId)

    // Remove fields that shouldn't be cloned
    delete workflow.id
    delete workflow.createdAt
    delete workflow.updatedAt
    delete workflow.versionId

    // Set new name
    if (newName) {
      workflow.name = newName
    } else {
      workflow.name = `${workflow.name} (Copy)`
    }

    // Deactivate by default
    workflow.active = false

    return this.createWorkflow(workflow)
  }

  /**
   * Health check - verify connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listWorkflows()
      return true
    } catch (error) {
      return false
    }
  }
}

// ============================================================================
// Export default instance
// ============================================================================

export function createN8nClient(config?: Partial<N8nConfig>): N8nClient {
  return new N8nClient(config)
}

// Default export using environment variables
export const n8nClient = new N8nClient()
