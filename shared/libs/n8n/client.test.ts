/**
 * Unit Tests for n8n Client
 *
 * Comprehensive test suite for N8nClient class
 * Target: 80%+ code coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { N8nClient, createN8nClient } from './client'
import { mockN8nAPI } from '../../../test/mocks/n8n-api.mock'

describe('N8nClient', () => {
  let client: N8nClient
  let mockFetch: ReturnType<typeof mockN8nAPI.createMockFetch>

  beforeEach(() => {
    // Reset mock API before each test
    mockN8nAPI.reset()

    // Create mock fetch
    mockFetch = mockN8nAPI.createMockFetch()
    global.fetch = mockFetch as any

    // Create client with test config
    client = new N8nClient({
      baseUrl: 'https://test.n8n.local',
      apiKey: 'test-api-key-12345',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create client with provided config', () => {
      const testClient = new N8nClient({
        baseUrl: 'https://custom.n8n.io',
        apiKey: 'custom-key',
      })

      expect(testClient).toBeInstanceOf(N8nClient)
    })

    it('should create client with environment variables', () => {
      process.env.N8N_BASE_URL = 'https://env.n8n.io'
      process.env.N8N_API_KEY = 'env-api-key'

      const testClient = new N8nClient()

      expect(testClient).toBeInstanceOf(N8nClient)
    })

    it('should remove trailing slash from baseUrl', async () => {
      const testClient = new N8nClient({
        baseUrl: 'https://test.n8n.local/',
        apiKey: 'test-api-key-12345',
      })

      await testClient.listWorkflows()

      // Verify fetch was called without trailing slash
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.n8n.local/api/v1/workflows',
        expect.any(Object)
      )
    })

    it('should throw error if baseUrl is missing', () => {
      delete process.env.N8N_BASE_URL

      expect(() => new N8nClient({ apiKey: 'test' })).toThrow(
        'N8N_BASE_URL and N8N_API_KEY must be provided'
      )
    })

    it('should throw error if apiKey is missing', () => {
      delete process.env.N8N_API_KEY

      expect(() => new N8nClient({ baseUrl: 'https://test.n8n.local' })).toThrow(
        'N8N_BASE_URL and N8N_API_KEY must be provided'
      )
    })
  })

  describe('Workflow Methods', () => {
    describe('listWorkflows()', () => {
      it('should list all workflows', async () => {
        const result = await client.listWorkflows()

        expect(result).toHaveProperty('data')
        expect(Array.isArray(result.data)).toBe(true)
        expect(result.data.length).toBeGreaterThan(0)
      })

      it('should filter workflows by active status', async () => {
        const result = await client.listWorkflows({ active: true })

        expect(result.data.every((w) => w.active === true)).toBe(true)
      })

      it('should filter workflows by tags', async () => {
        const result = await client.listWorkflows({ tags: ['test'] })

        expect(result.data.every((w) => w.tags?.includes('test'))).toBe(true)
      })

      it('should send correct HTTP request', async () => {
        await client.listWorkflows()

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.n8n.local/api/v1/workflows',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'X-N8N-API-KEY': 'test-api-key-12345',
            }),
          })
        )
      })
    })

    describe('getWorkflow()', () => {
      it('should get workflow by ID', async () => {
        const workflow = await client.getWorkflow('wf-test-001')

        expect(workflow).toHaveProperty('id', 'wf-test-001')
        expect(workflow).toHaveProperty('name')
        expect(workflow).toHaveProperty('nodes')
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.getWorkflow('non-existent')).rejects.toThrow('404')
      })
    })

    describe('createWorkflow()', () => {
      it('should create new workflow', async () => {
        const newWorkflow = {
          name: 'New Test Workflow',
          nodes: [
            {
              name: 'Trigger',
              type: 'n8n-nodes-base.manual',
              typeVersion: 1,
              position: [240, 300] as [number, number],
            },
          ],
          connections: {},
        }

        const created = await client.createWorkflow(newWorkflow)

        expect(created).toHaveProperty('id')
        expect(created).toHaveProperty('name', 'New Test Workflow')
        expect(created).toHaveProperty('createdAt')
        expect(created).toHaveProperty('updatedAt')
      })

      it('should send correct HTTP request', async () => {
        const workflow = {
          name: 'Test',
          nodes: [],
          connections: {},
        }

        await client.createWorkflow(workflow)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.n8n.local/api/v1/workflows',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.any(String),
          })
        )
      })
    })

    describe('updateWorkflow()', () => {
      it('should update existing workflow', async () => {
        const updated = await client.updateWorkflow('wf-test-001', {
          name: 'Updated Name',
        })

        expect(updated).toHaveProperty('name', 'Updated Name')
        expect(updated.updatedAt).not.toBe(updated.createdAt)
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(
          client.updateWorkflow('non-existent', { name: 'Test' })
        ).rejects.toThrow('404')
      })
    })

    describe('deleteWorkflow()', () => {
      it('should delete workflow', async () => {
        await expect(client.deleteWorkflow('wf-test-001')).resolves.toBeUndefined()

        // Verify workflow was deleted
        await expect(client.getWorkflow('wf-test-001')).rejects.toThrow('404')
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.deleteWorkflow('non-existent')).rejects.toThrow('404')
      })
    })

    describe('activateWorkflow()', () => {
      it('should activate workflow', async () => {
        const workflow = await client.activateWorkflow('wf-test-002')

        expect(workflow.active).toBe(true)
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.activateWorkflow('non-existent')).rejects.toThrow('404')
      })
    })

    describe('deactivateWorkflow()', () => {
      it('should deactivate workflow', async () => {
        const workflow = await client.deactivateWorkflow('wf-test-001')

        expect(workflow.active).toBe(false)
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.deactivateWorkflow('non-existent')).rejects.toThrow('404')
      })
    })
  })

  describe('Execution Methods', () => {
    describe('listExecutions()', () => {
      it('should list all executions', async () => {
        const result = await client.listExecutions()

        expect(result).toHaveProperty('data')
        expect(Array.isArray(result.data)).toBe(true)
      })

      it('should filter by workflow ID', async () => {
        const result = await client.listExecutions({ workflowId: 'wf-test-001' })

        expect(result.data.every((e) => e.workflowId === 'wf-test-001')).toBe(true)
      })

      it('should filter by status', async () => {
        const result = await client.listExecutions({ status: 'success' })

        expect(result.data.every((e) => e.status === 'success')).toBe(true)
      })

      it('should respect limit parameter', async () => {
        const result = await client.listExecutions({ limit: 1 })

        expect(result.data.length).toBeLessThanOrEqual(1)
      })
    })

    describe('getExecution()', () => {
      it('should get execution by ID', async () => {
        const execution = await client.getExecution('exec-001')

        expect(execution).toHaveProperty('id', 'exec-001')
        expect(execution).toHaveProperty('workflowId')
      })

      it('should throw error for non-existent execution', async () => {
        await expect(client.getExecution('non-existent')).rejects.toThrow('404')
      })
    })

    describe('deleteExecution()', () => {
      it('should delete execution', async () => {
        await expect(client.deleteExecution('exec-001')).resolves.toBeUndefined()

        // Verify execution was deleted
        await expect(client.getExecution('exec-001')).rejects.toThrow('404')
      })
    })

    describe('executeWorkflow()', () => {
      it('should execute workflow manually', async () => {
        const execution = await client.executeWorkflow('wf-test-001')

        expect(execution).toHaveProperty('id')
        expect(execution).toHaveProperty('mode', 'manual')
        expect(execution).toHaveProperty('workflowId', 'wf-test-001')
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.executeWorkflow('non-existent')).rejects.toThrow('404')
      })
    })
  })

  describe('Credential Methods', () => {
    describe('listCredentials()', () => {
      it('should list all credentials', async () => {
        const result = await client.listCredentials()

        expect(result).toHaveProperty('data')
        expect(Array.isArray(result.data)).toBe(true)
      })
    })

    describe('getCredential()', () => {
      it('should get credential by ID', async () => {
        const credential = await client.getCredential('cred-001')

        expect(credential).toHaveProperty('id', 'cred-001')
        expect(credential).toHaveProperty('name')
        expect(credential).toHaveProperty('type')
      })

      it('should throw error for non-existent credential', async () => {
        await expect(client.getCredential('non-existent')).rejects.toThrow('404')
      })
    })
  })

  describe('Utility Methods', () => {
    describe('findWorkflowsByName()', () => {
      it('should find workflows by string pattern', async () => {
        const workflows = await client.findWorkflowsByName('Cron')

        expect(workflows.length).toBeGreaterThan(0)
        expect(workflows.every((w) => /Cron/i.test(w.name))).toBe(true)
      })

      it('should find workflows by regex pattern', async () => {
        const workflows = await client.findWorkflowsByName(/^Test/)

        expect(workflows.length).toBeGreaterThan(0)
        expect(workflows.every((w) => /^Test/.test(w.name))).toBe(true)
      })

      it('should return empty array if no matches', async () => {
        const workflows = await client.findWorkflowsByName('NonExistent12345')

        expect(workflows).toEqual([])
      })
    })

    describe('getActiveWorkflows()', () => {
      it('should return only active workflows', async () => {
        const workflows = await client.getActiveWorkflows()

        expect(workflows.every((w) => w.active === true)).toBe(true)
      })
    })

    describe('getRecentExecutions()', () => {
      it('should get recent executions for workflow', async () => {
        const executions = await client.getRecentExecutions('wf-test-001')

        expect(Array.isArray(executions)).toBe(true)
      })

      it('should respect limit parameter', async () => {
        const executions = await client.getRecentExecutions('wf-test-001', 1)

        expect(executions.length).toBeLessThanOrEqual(1)
      })

      it('should default to 10 executions', async () => {
        const executions = await client.getRecentExecutions('wf-test-001')

        expect(executions.length).toBeLessThanOrEqual(10)
      })
    })

    describe('getWorkflowStats()', () => {
      it('should calculate workflow statistics', async () => {
        const stats = await client.getWorkflowStats('wf-test-001')

        expect(stats).toHaveProperty('total')
        expect(stats).toHaveProperty('success')
        expect(stats).toHaveProperty('error')
        expect(stats).toHaveProperty('running')
        expect(stats).toHaveProperty('waiting')
        expect(stats.total).toBe(stats.success + stats.error + stats.running + stats.waiting)
      })

      it('should handle workflows with no executions', async () => {
        const stats = await client.getWorkflowStats('wf-test-002')

        expect(stats.total).toBe(0)
        expect(stats.success).toBe(0)
      })
    })

    describe('cloneWorkflow()', () => {
      it('should clone workflow with new name', async () => {
        const cloned = await client.cloneWorkflow('wf-test-001', 'Cloned Workflow')

        expect(cloned).toHaveProperty('name', 'Cloned Workflow')
        expect(cloned.id).not.toBe('wf-test-001')
        expect(cloned.active).toBe(false)
        expect(cloned).not.toHaveProperty('versionId')
      })

      it('should clone workflow with default name', async () => {
        const original = await client.getWorkflow('wf-test-001')
        const cloned = await client.cloneWorkflow('wf-test-001')

        expect(cloned.name).toBe(`${original.name} (Copy)`)
      })

      it('should throw error for non-existent workflow', async () => {
        await expect(client.cloneWorkflow('non-existent')).rejects.toThrow('404')
      })
    })

    describe('healthCheck()', () => {
      it('should return true for healthy connection', async () => {
        const healthy = await client.healthCheck()

        expect(healthy).toBe(true)
      })

      it('should return false for unhealthy connection', async () => {
        // Create client with invalid credentials
        const badClient = new N8nClient({
          baseUrl: 'https://test.n8n.local',
          apiKey: 'invalid-key',
        })

        const healthy = await badClient.healthCheck()

        expect(healthy).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw descriptive error on API error', async () => {
      // Create client with invalid API key
      const badClient = new N8nClient({
        baseUrl: 'https://test.n8n.local',
        apiKey: 'invalid-key',
      })

      await expect(badClient.listWorkflows()).rejects.toThrow(/401.*Unauthorized/)
    })

    it('should include status code in error message', async () => {
      await expect(client.getWorkflow('non-existent')).rejects.toThrow(/404/)
    })

    it('should include status text in error message', async () => {
      await expect(client.getWorkflow('non-existent')).rejects.toThrow(/Not Found/)
    })
  })

  describe('Factory Function', () => {
    it('should create client via createN8nClient()', () => {
      const testClient = createN8nClient({
        baseUrl: 'https://test.n8n.local',
        apiKey: 'test-key',
      })

      expect(testClient).toBeInstanceOf(N8nClient)
    })
  })
})
