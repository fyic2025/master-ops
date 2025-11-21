/**
 * Unit Tests for n8n Workflows
 *
 * Comprehensive test suite for workflow templates, node builders, and patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createCronWorkflow,
  createWebhookWorkflow,
  createSupabaseNode,
  createHttpNode,
  createCodeNode,
  createIfNode,
  createSetNode,
  createTaskMonitoringWorkflow,
  createDataSyncWorkflow,
  analyzeWorkflow,
  findUnusedNodes,
} from './workflows'
import { N8nClient } from './client'
import { mockN8nAPI } from '../../../test/mocks/n8n-api.mock'

describe('Workflow Templates', () => {
  describe('createCronWorkflow()', () => {
    it('should create cron workflow with basic config', () => {
      const workflow = createCronWorkflow({
        name: 'Test Cron',
        schedule: '*/5 * * * *',
        nodes: [],
      })

      expect(workflow.name).toBe('Test Cron')
      expect(workflow.nodes.length).toBe(1) // Trigger node
      expect(workflow.nodes[0].type).toBe('n8n-nodes-base.cron')
      expect(workflow.active).toBe(false)
    })

    it('should set cron schedule correctly', () => {
      const workflow = createCronWorkflow({
        name: 'Test',
        schedule: '0 9 * * *',
        nodes: [],
      })

      const trigger = workflow.nodes[0]
      expect(trigger.parameters?.triggerTimes?.item[0].cronExpression).toBe('0 9 * * *')
    })

    it('should add additional nodes after trigger', () => {
      const customNode = {
        name: 'Custom Node',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [450, 300] as [number, number],
      }

      const workflow = createCronWorkflow({
        name: 'Test',
        schedule: '* * * * *',
        nodes: [customNode],
      })

      expect(workflow.nodes.length).toBe(2)
      expect(workflow.nodes[1]).toEqual(customNode)
    })

    it('should set default timezone', () => {
      const workflow = createCronWorkflow({
        name: 'Test',
        schedule: '* * * * *',
        nodes: [],
      })

      expect(workflow.settings?.timezone).toBe('Australia/Melbourne')
    })

    it('should use custom timezone if provided', () => {
      const workflow = createCronWorkflow({
        name: 'Test',
        schedule: '* * * * *',
        nodes: [],
        timezone: 'America/New_York',
      })

      expect(workflow.settings?.timezone).toBe('America/New_York')
    })

    it('should save all execution data', () => {
      const workflow = createCronWorkflow({
        name: 'Test',
        schedule: '* * * * *',
        nodes: [],
      })

      expect(workflow.settings?.saveDataErrorExecution).toBe('all')
      expect(workflow.settings?.saveDataSuccessExecution).toBe('all')
    })
  })

  describe('createWebhookWorkflow()', () => {
    it('should create webhook workflow with basic config', () => {
      const workflow = createWebhookWorkflow({
        name: 'Test Webhook',
        webhookPath: 'test-hook',
        nodes: [],
      })

      expect(workflow.name).toBe('Test Webhook')
      expect(workflow.nodes.length).toBe(1)
      expect(workflow.nodes[0].type).toBe('n8n-nodes-base.webhook')
      expect(workflow.active).toBe(false)
    })

    it('should set webhook path correctly', () => {
      const workflow = createWebhookWorkflow({
        name: 'Test',
        webhookPath: 'my-webhook',
        nodes: [],
      })

      const trigger = workflow.nodes[0]
      expect(trigger.parameters?.path).toBe('my-webhook')
      expect(trigger.webhookId).toBe('my-webhook')
    })

    it('should default to POST method', () => {
      const workflow = createWebhookWorkflow({
        name: 'Test',
        webhookPath: 'test',
        nodes: [],
      })

      expect(workflow.nodes[0].parameters?.httpMethod).toBe('POST')
    })

    it('should support custom HTTP method', () => {
      const workflow = createWebhookWorkflow({
        name: 'Test',
        webhookPath: 'test',
        method: 'GET',
        nodes: [],
      })

      expect(workflow.nodes[0].parameters?.httpMethod).toBe('GET')
    })

    it('should add additional nodes after trigger', () => {
      const customNode = {
        name: 'Process Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [450, 300] as [number, number],
      }

      const workflow = createWebhookWorkflow({
        name: 'Test',
        webhookPath: 'test',
        nodes: [customNode],
      })

      expect(workflow.nodes.length).toBe(2)
      expect(workflow.nodes[1]).toEqual(customNode)
    })
  })
})

describe('Node Builders', () => {
  describe('createSupabaseNode()', () => {
    it('should create Supabase select node', () => {
      const node = createSupabaseNode({
        name: 'Get Data',
        operation: 'select',
        table: 'users',
        position: [400, 300],
      })

      expect(node.name).toBe('Get Data')
      expect(node.type).toBe('n8n-nodes-base.supabase')
      expect(node.parameters?.operation).toBe('select')
      expect(node.parameters?.tableId).toBe('users')
    })

    it('should create Supabase insert node', () => {
      const node = createSupabaseNode({
        name: 'Insert Record',
        operation: 'insert',
        table: 'tasks',
        position: [400, 300],
        data: { name: 'New Task', status: 'pending' },
      })

      expect(node.parameters?.operation).toBe('insert')
      expect(node.parameters?.fieldsUi).toEqual({ name: 'New Task', status: 'pending' })
    })

    it('should include filters when provided', () => {
      const node = createSupabaseNode({
        name: 'Get Failed Tasks',
        operation: 'select',
        table: 'tasks',
        position: [400, 300],
        filters: { status: { eq: 'failed' } },
      })

      expect(node.parameters?.filterType).toBe('manual')
      expect(node.parameters?.filters).toEqual({ status: { eq: 'failed' } })
    })

    it('should include credentials reference', () => {
      const node = createSupabaseNode({
        name: 'Test',
        operation: 'select',
        table: 'test',
        position: [400, 300],
      })

      expect(node.credentials).toHaveProperty('supabaseApi')
      expect(node.credentials?.supabaseApi).toEqual({
        id: 'supabase',
        name: 'Supabase account',
      })
    })
  })

  describe('createHttpNode()', () => {
    it('should create basic HTTP GET node', () => {
      const node = createHttpNode({
        name: 'API Call',
        url: 'https://api.example.com/data',
        position: [400, 300],
      })

      expect(node.name).toBe('API Call')
      expect(node.type).toBe('n8n-nodes-base.httpRequest')
      expect(node.parameters?.url).toBe('https://api.example.com/data')
      expect(node.parameters?.method).toBe('GET')
    })

    it('should support custom HTTP method', () => {
      const node = createHttpNode({
        name: 'POST Request',
        url: 'https://api.example.com/create',
        method: 'POST',
        position: [400, 300],
      })

      expect(node.parameters?.method).toBe('POST')
    })

    it('should include headers when provided', () => {
      const node = createHttpNode({
        name: 'With Headers',
        url: 'https://api.example.com',
        position: [400, 300],
        headers: {
          'X-API-Key': 'secret',
          'Content-Type': 'application/json',
        },
      })

      expect(node.parameters?.sendHeaders).toBe(true)
      expect(node.parameters?.headerParameters?.parameters).toHaveLength(2)
      expect(node.parameters?.headerParameters?.parameters[0]).toEqual({
        name: 'X-API-Key',
        value: 'secret',
      })
    })

    it('should include body when provided', () => {
      const node = createHttpNode({
        name: 'With Body',
        url: 'https://api.example.com',
        method: 'POST',
        position: [400, 300],
        body: { key: 'value' },
      })

      expect(node.parameters?.sendBody).toBe(true)
      expect(node.parameters?.bodyParameters).toEqual({ key: 'value' })
    })
  })

  describe('createCodeNode()', () => {
    it('should create code node with JavaScript', () => {
      const code = 'return [{ json: { test: true } }]'
      const node = createCodeNode({
        name: 'Transform',
        code,
        position: [400, 300],
      })

      expect(node.name).toBe('Transform')
      expect(node.type).toBe('n8n-nodes-base.code')
      expect(node.parameters?.jsCode).toBe(code)
      expect(node.parameters?.mode).toBe('runOnceForAllItems')
    })
  })

  describe('createIfNode()', () => {
    it('should create IF node with conditions', () => {
      const node = createIfNode({
        name: 'Check Status',
        position: [400, 300],
        conditions: [
          { field: 'status', operation: 'equals', value: 'active' },
          { field: 'count', operation: 'greaterThan', value: 0 },
        ],
      })

      expect(node.name).toBe('Check Status')
      expect(node.type).toBe('n8n-nodes-base.if')
      expect(node.parameters?.conditions?.conditions).toHaveLength(2)
      expect(node.parameters?.conditions?.conditions[0].leftValue).toBe('={{ $json.status }}')
      expect(node.parameters?.conditions?.conditions[0].operation).toBe('equals')
      expect(node.parameters?.conditions?.conditions[0].rightValue).toBe('active')
    })
  })

  describe('createSetNode()', () => {
    it('should create Set node with values', () => {
      const node = createSetNode({
        name: 'Set Values',
        position: [400, 300],
        values: {
          name: 'John Doe',
          age: 30,
          active: true,
        },
      })

      expect(node.name).toBe('Set Values')
      expect(node.type).toBe('n8n-nodes-base.set')
      expect(node.parameters?.assignments?.assignments).toHaveLength(3)

      const assignments = node.parameters?.assignments?.assignments
      expect(assignments.find((a: any) => a.name === 'name')?.type).toBe('string')
      expect(assignments.find((a: any) => a.name === 'age')?.type).toBe('number')
    })
  })
})

describe('Workflow Patterns', () => {
  let client: N8nClient
  let mockFetch: ReturnType<typeof mockN8nAPI.createMockFetch>

  beforeEach(() => {
    mockN8nAPI.reset()
    mockFetch = mockN8nAPI.createMockFetch()
    global.fetch = mockFetch as any

    client = new N8nClient({
      baseUrl: 'https://test.n8n.local',
      apiKey: 'test-api-key-12345',
    })
  })

  describe('createTaskMonitoringWorkflow()', () => {
    it('should create task monitoring workflow', async () => {
      const workflow = await createTaskMonitoringWorkflow(client)

      expect(workflow.name).toContain('Task Monitoring')
      expect(workflow.id).toBeDefined()
      expect(workflow.nodes.length).toBeGreaterThan(0)
    })

    it('should use custom schedule if provided', async () => {
      const workflow = await createTaskMonitoringWorkflow(client, {
        schedule: '0 * * * *',
      })

      const trigger = workflow.nodes.find((n) => n.type.includes('cron'))
      expect(trigger?.parameters?.triggerTimes?.item[0].cronExpression).toBe('0 * * * *')
    })

    it('should use custom task table if provided', async () => {
      const workflow = await createTaskMonitoringWorkflow(client, {
        taskTable: 'custom_tasks',
      })

      const supabaseNode = workflow.nodes.find((n) => n.type.includes('supabase'))
      expect(supabaseNode?.parameters?.tableId).toBe('custom_tasks')
    })
  })

  describe('createDataSyncWorkflow()', () => {
    it('should create data sync workflow', async () => {
      const workflow = await createDataSyncWorkflow(client, {
        name: 'Sync Test Data',
        sourceTable: 'source',
        targetUrl: 'https://api.example.com/sync',
      })

      expect(workflow.name).toBe('Sync Test Data')
      expect(workflow.id).toBeDefined()
      expect(workflow.nodes.some((n) => n.type.includes('supabase'))).toBe(true)
      expect(workflow.nodes.some((n) => n.type.includes('httpRequest'))).toBe(true)
    })

    it('should include transform node when transform code provided', async () => {
      const workflow = await createDataSyncWorkflow(client, {
        name: 'Test',
        sourceTable: 'source',
        targetUrl: 'https://api.example.com',
        transform: 'return items.map(i => ({ ...i, transformed: true }))',
      })

      expect(workflow.nodes.some((n) => n.type.includes('code'))).toBe(true)
    })

    it('should use custom schedule if provided', async () => {
      const workflow = await createDataSyncWorkflow(client, {
        name: 'Test',
        sourceTable: 'source',
        targetUrl: 'https://api.example.com',
        schedule: '0 0 * * *',
      })

      const trigger = workflow.nodes.find((n) => n.type.includes('cron'))
      expect(trigger?.parameters?.triggerTimes?.item[0].cronExpression).toBe('0 0 * * *')
    })
  })
})

describe('Workflow Analysis', () => {
  describe('analyzeWorkflow()', () => {
    it('should analyze simple workflow', () => {
      const workflow = {
        name: 'Simple',
        nodes: [
          { name: 'Trigger', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [0, 0] },
          { name: 'Action', type: 'n8n-nodes-base.set', typeVersion: 1, position: [200, 0] },
        ],
        connections: {},
      }

      const analysis = analyzeWorkflow(workflow as any)

      expect(analysis.complexity).toBe('simple')
      expect(analysis.nodeCount).toBe(2)
      expect(analysis.triggerType).toBe('n8n-nodes-base.cron')
      expect(analysis.estimatedExecutionTime).toBe('< 10s')
    })

    it('should analyze moderate complexity workflow', () => {
      const workflow = {
        name: 'Moderate',
        nodes: Array(7)
          .fill(null)
          .map((_, i) => ({
            name: `Node ${i}`,
            type: i === 0 ? 'n8n-nodes-base.cron' : 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [i * 200, 0],
          })),
        connections: {},
      }

      const analysis = analyzeWorkflow(workflow as any)

      expect(analysis.complexity).toBe('moderate')
      expect(analysis.nodeCount).toBe(7)
      expect(analysis.estimatedExecutionTime).toBe('10-30s')
    })

    it('should analyze complex workflow', () => {
      const workflow = {
        name: 'Complex',
        nodes: Array(12)
          .fill(null)
          .map((_, i) => ({
            name: `Node ${i}`,
            type: i === 0 ? 'n8n-nodes-base.webhook' : 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [i * 200, 0],
          })),
        connections: {},
      }

      const analysis = analyzeWorkflow(workflow as any)

      expect(analysis.complexity).toBe('complex')
      expect(analysis.nodeCount).toBe(12)
      expect(analysis.estimatedExecutionTime).toBe('> 30s')
    })

    it('should detect trigger type', () => {
      const scheduleTrigger = {
        name: 'Test',
        nodes: [
          {
            name: 'Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            typeVersion: 1,
            position: [0, 0],
          },
        ],
        connections: {},
      }

      const analysis1 = analyzeWorkflow(scheduleTrigger as any)
      expect(analysis1.triggerType).toBe('n8n-nodes-base.scheduleTrigger')

      const webhookTrigger = {
        name: 'Test',
        nodes: [
          { name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [0, 0] },
        ],
        connections: {},
      }

      const analysis2 = analyzeWorkflow(webhookTrigger as any)
      expect(analysis2.triggerType).toBe('n8n-nodes-base.webhook')
    })

    it('should detect error handling', () => {
      const withErrorHandling = {
        name: 'Test',
        nodes: [
          { name: 'Trigger', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [0, 0] },
          {
            name: 'Error Handler',
            type: 'n8n-nodes-base.errorTrigger',
            typeVersion: 1,
            position: [200, 0],
          },
        ],
        connections: {},
      }

      const analysis = analyzeWorkflow(withErrorHandling as any)
      expect(analysis.hasErrorHandling).toBe(true)
    })

    it('should detect error handling by node name', () => {
      const withErrorNode = {
        name: 'Test',
        nodes: [
          { name: 'Trigger', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [0, 0] },
          {
            name: 'Handle Error',
            type: 'n8n-nodes-base.code',
            typeVersion: 1,
            position: [200, 0],
          },
        ],
        connections: {},
      }

      const analysis = analyzeWorkflow(withErrorNode as any)
      expect(analysis.hasErrorHandling).toBe(true)
    })
  })

  describe('findUnusedNodes()', () => {
    it('should find nodes without connections', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { name: 'Trigger', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [0, 0] },
          { name: 'Connected', type: 'n8n-nodes-base.set', typeVersion: 1, position: [200, 0] },
          { name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 1, position: [400, 0] },
        ],
        connections: {
          Trigger: {
            main: [[{ node: 'Connected', type: 'main', index: 0 }]],
          },
        },
      }

      const unused = findUnusedNodes(workflow as any)

      expect(unused.length).toBe(1)
      expect(unused[0].name).toBe('Orphan')
    })

    it('should return empty array if all nodes connected', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { name: 'Trigger', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [0, 0] },
          { name: 'Node1', type: 'n8n-nodes-base.set', typeVersion: 1, position: [200, 0] },
        ],
        connections: {
          Trigger: {
            main: [[{ node: 'Node1', type: 'main', index: 0 }]],
          },
        },
      }

      const unused = findUnusedNodes(workflow as any)

      expect(unused).toEqual([])
    })
  })
})
