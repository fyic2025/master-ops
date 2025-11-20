/**
 * Mock n8n API
 *
 * Complete mock implementation of n8n REST API for offline testing
 * Simulates all API endpoints with realistic behavior
 */

import { vi } from 'vitest'
import type { N8nWorkflow, N8nExecution, N8nCredential } from '../../shared/libs/n8n/client'

export class MockN8nAPI {
  private workflows: Map<string, N8nWorkflow> = new Map()
  private executions: Map<string, N8nExecution> = new Map()
  private credentials: Map<string, N8nCredential> = new Map()
  private nextWorkflowId = 1
  private nextExecutionId = 1
  private nextCredentialId = 1

  constructor() {
    this.reset()
  }

  /**
   * Reset all mock data
   */
  reset() {
    this.workflows.clear()
    this.executions.clear()
    this.credentials.clear()
    this.nextWorkflowId = 1
    this.nextExecutionId = 1
    this.nextCredentialId = 1

    // Add default test data
    this.addTestData()
  }

  /**
   * Add realistic test data
   */
  private addTestData() {
    // Test workflow 1: Simple cron workflow
    const workflow1: N8nWorkflow = {
      id: 'wf-test-001',
      name: 'Test Cron Workflow',
      nodes: [
        {
          name: 'Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [240, 300],
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] },
          },
        },
        {
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [460, 300],
          parameters: { url: 'https://api.example.com/test', method: 'GET' },
        },
      ],
      connections: {
        Schedule: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
      },
      active: true,
      settings: {
        timezone: 'Australia/Melbourne',
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
      },
      tags: ['test', 'automation'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    }
    this.workflows.set(workflow1.id!, workflow1)

    // Test workflow 2: Inactive webhook workflow
    const workflow2: N8nWorkflow = {
      id: 'wf-test-002',
      name: 'Test Webhook Workflow',
      nodes: [
        {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [240, 300],
          parameters: { path: 'test-webhook', httpMethod: 'POST' },
          webhookId: 'test-webhook',
        },
      ],
      connections: {},
      active: false,
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    }
    this.workflows.set(workflow2.id!, workflow2)

    // Test executions
    const execution1: N8nExecution = {
      id: 'exec-001',
      finished: true,
      mode: 'trigger',
      startedAt: '2024-01-10T10:00:00.000Z',
      stoppedAt: '2024-01-10T10:00:05.000Z',
      workflowId: 'wf-test-001',
      status: 'success',
      data: {
        resultData: {
          runData: {
            Schedule: [{ data: { main: [[{ json: {} }]] } }],
            'HTTP Request': [{ data: { main: [[{ json: { status: 'ok' } }]] } }],
          },
        },
      },
    }
    this.executions.set(execution1.id, execution1)

    const execution2: N8nExecution = {
      id: 'exec-002',
      finished: true,
      mode: 'trigger',
      startedAt: '2024-01-10T10:15:00.000Z',
      stoppedAt: '2024-01-10T10:15:02.000Z',
      workflowId: 'wf-test-001',
      status: 'error',
      data: {
        resultData: {
          error: {
            message: 'Connection timeout',
            description: 'The HTTP request timed out after 30 seconds',
          },
          lastNodeExecuted: 'HTTP Request',
          runData: {
            Schedule: [{ data: { main: [[{ json: {} }]] } }],
          },
        },
      },
    }
    this.executions.set(execution2.id, execution2)

    // Test credential
    const credential1: N8nCredential = {
      id: 'cred-001',
      name: 'Test API Credential',
      type: 'httpBasicAuth',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    this.credentials.set(credential1.id, credential1)
  }

  /**
   * Mock fetch implementation
   */
  createMockFetch() {
    return vi.fn(async (url: string, options: RequestInit = {}) => {
      const { method = 'GET', headers = {}, body } = options
      const apiKey = (headers as Record<string, string>)['X-N8N-API-KEY']

      // Validate API key
      if (!apiKey || apiKey !== 'test-api-key-12345') {
        return this.createResponse(401, { message: 'Unauthorized' })
      }

      // Parse URL and route
      const urlObj = new URL(url)
      const path = urlObj.pathname.replace('/api/v1', '')
      const segments = path.split('/').filter(Boolean)

      // Route to appropriate handler
      if (segments[0] === 'workflows') {
        return this.handleWorkflowRequest(method, segments, urlObj.searchParams, body)
      } else if (segments[0] === 'executions') {
        return this.handleExecutionRequest(method, segments, urlObj.searchParams, body)
      } else if (segments[0] === 'credentials') {
        return this.handleCredentialRequest(method, segments, urlObj.searchParams, body)
      }

      return this.createResponse(404, { message: 'Not found' })
    })
  }

  /**
   * Handle workflow requests
   */
  private async handleWorkflowRequest(
    method: string,
    segments: string[],
    params: URLSearchParams,
    body?: BodyInit | null
  ) {
    // GET /workflows - List workflows
    if (method === 'GET' && segments.length === 1) {
      const active = params.get('active')
      const tags = params.get('tags')

      let workflows = Array.from(this.workflows.values())

      if (active !== null) {
        workflows = workflows.filter((w) => w.active === (active === 'true'))
      }

      if (tags) {
        const tagList = tags.split(',')
        workflows = workflows.filter((w) =>
          w.tags?.some((tag) => tagList.includes(tag))
        )
      }

      return this.createResponse(200, { data: workflows })
    }

    // GET /workflows/{id} - Get workflow
    if (method === 'GET' && segments.length === 2) {
      const workflowId = segments[1]
      const workflow = this.workflows.get(workflowId)

      if (!workflow) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      return this.createResponse(200, workflow)
    }

    // POST /workflows - Create workflow
    if (method === 'POST' && segments.length === 1) {
      const workflow = JSON.parse(body as string) as N8nWorkflow

      const id = `wf-mock-${String(this.nextWorkflowId++).padStart(3, '0')}`
      const now = new Date().toISOString()

      const newWorkflow: N8nWorkflow = {
        ...workflow,
        id,
        createdAt: now,
        updatedAt: now,
      }

      this.workflows.set(id, newWorkflow)
      return this.createResponse(200, newWorkflow)
    }

    // PUT /workflows/{id} - Update workflow
    if (method === 'PUT' && segments.length === 2) {
      const workflowId = segments[1]
      const existing = this.workflows.get(workflowId)

      if (!existing) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      const updates = JSON.parse(body as string) as Partial<N8nWorkflow>
      const updated: N8nWorkflow = {
        ...existing,
        ...updates,
        id: workflowId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }

      this.workflows.set(workflowId, updated)
      return this.createResponse(200, updated)
    }

    // DELETE /workflows/{id} - Delete workflow
    if (method === 'DELETE' && segments.length === 2) {
      const workflowId = segments[1]

      if (!this.workflows.has(workflowId)) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      this.workflows.delete(workflowId)
      return this.createResponse(200, { success: true })
    }

    // POST /workflows/{id}/activate - Activate workflow
    if (method === 'POST' && segments[2] === 'activate') {
      const workflowId = segments[1]
      const workflow = this.workflows.get(workflowId)

      if (!workflow) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      workflow.active = true
      workflow.updatedAt = new Date().toISOString()
      this.workflows.set(workflowId, workflow)

      return this.createResponse(200, workflow)
    }

    // POST /workflows/{id}/deactivate - Deactivate workflow
    if (method === 'POST' && segments[2] === 'deactivate') {
      const workflowId = segments[1]
      const workflow = this.workflows.get(workflowId)

      if (!workflow) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      workflow.active = false
      workflow.updatedAt = new Date().toISOString()
      this.workflows.set(workflowId, workflow)

      return this.createResponse(200, workflow)
    }

    // POST /workflows/{id}/execute - Execute workflow
    if (method === 'POST' && segments[2] === 'execute') {
      const workflowId = segments[1]
      const workflow = this.workflows.get(workflowId)

      if (!workflow) {
        return this.createResponse(404, { message: 'Workflow not found' })
      }

      const executionId = `exec-mock-${String(this.nextExecutionId++).padStart(3, '0')}`
      const execution: N8nExecution = {
        id: executionId,
        finished: false,
        mode: 'manual',
        startedAt: new Date().toISOString(),
        workflowId,
        status: 'running',
      }

      this.executions.set(executionId, execution)

      // Simulate async completion after 100ms
      setTimeout(() => {
        execution.finished = true
        execution.stoppedAt = new Date().toISOString()
        execution.status = 'success'
        execution.data = {
          resultData: {
            runData: {},
          },
        }
        this.executions.set(executionId, execution)
      }, 100)

      return this.createResponse(200, execution)
    }

    return this.createResponse(404, { message: 'Not found' })
  }

  /**
   * Handle execution requests
   */
  private async handleExecutionRequest(
    method: string,
    segments: string[],
    params: URLSearchParams,
    body?: BodyInit | null
  ) {
    // GET /executions - List executions
    if (method === 'GET' && segments.length === 1) {
      const workflowId = params.get('workflowId')
      const status = params.get('status')
      const limit = parseInt(params.get('limit') || '100', 10)

      let executions = Array.from(this.executions.values())

      if (workflowId) {
        executions = executions.filter((e) => e.workflowId === workflowId)
      }

      if (status) {
        executions = executions.filter((e) => e.status === status)
      }

      executions = executions.slice(0, limit)

      return this.createResponse(200, { data: executions })
    }

    // GET /executions/{id} - Get execution
    if (method === 'GET' && segments.length === 2) {
      const executionId = segments[1]
      const execution = this.executions.get(executionId)

      if (!execution) {
        return this.createResponse(404, { message: 'Execution not found' })
      }

      return this.createResponse(200, execution)
    }

    // DELETE /executions/{id} - Delete execution
    if (method === 'DELETE' && segments.length === 2) {
      const executionId = segments[1]

      if (!this.executions.has(executionId)) {
        return this.createResponse(404, { message: 'Execution not found' })
      }

      this.executions.delete(executionId)
      return this.createResponse(200, { success: true })
    }

    return this.createResponse(404, { message: 'Not found' })
  }

  /**
   * Handle credential requests
   */
  private async handleCredentialRequest(
    method: string,
    segments: string[],
    params: URLSearchParams,
    body?: BodyInit | null
  ) {
    // GET /credentials - List credentials
    if (method === 'GET' && segments.length === 1) {
      const credentials = Array.from(this.credentials.values())
      return this.createResponse(200, { data: credentials })
    }

    // GET /credentials/{id} - Get credential
    if (method === 'GET' && segments.length === 2) {
      const credentialId = segments[1]
      const credential = this.credentials.get(credentialId)

      if (!credential) {
        return this.createResponse(404, { message: 'Credential not found' })
      }

      return this.createResponse(200, credential)
    }

    return this.createResponse(404, { message: 'Not found' })
  }

  /**
   * Create mock response
   */
  private createResponse(status: number, data: any): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: this.getStatusText(status),
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers({ 'content-type': 'application/json' }),
    } as Response
  }

  /**
   * Get HTTP status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      404: 'Not Found',
      500: 'Internal Server Error',
    }
    return statusTexts[status] || 'Unknown'
  }

  /**
   * Helper: Add workflow
   */
  addWorkflow(workflow: N8nWorkflow) {
    const id = workflow.id || `wf-mock-${String(this.nextWorkflowId++).padStart(3, '0')}`
    this.workflows.set(id, { ...workflow, id })
  }

  /**
   * Helper: Add execution
   */
  addExecution(execution: N8nExecution) {
    const id =
      execution.id || `exec-mock-${String(this.nextExecutionId++).padStart(3, '0')}`
    this.executions.set(id, { ...execution, id })
  }

  /**
   * Helper: Get workflow
   */
  getWorkflow(id: string): N8nWorkflow | undefined {
    return this.workflows.get(id)
  }

  /**
   * Helper: Get execution
   */
  getExecution(id: string): N8nExecution | undefined {
    return this.executions.get(id)
  }
}

// Export singleton instance
export const mockN8nAPI = new MockN8nAPI()
