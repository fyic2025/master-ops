/**
 * Unit Tests for n8n Utils
 *
 * Comprehensive test suite for utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  CRON_SCHEDULES,
  parseCronExpression,
  generateWorkflowName,
  addWorkflowPrefix,
  validateWorkflow,
  checkNamingConvention,
  calculateSuccessRate,
  getExecutionDuration,
  analyzeExecutionPatterns,
  sanitizeWorkflow,
  generateWorkflowDocs,
} from './utils'
import type { N8nWorkflow, N8nExecution } from './client'

describe('Cron Helpers', () => {
  describe('CRON_SCHEDULES', () => {
    it('should have common cron schedules', () => {
      expect(CRON_SCHEDULES.EVERY_MINUTE).toBe('* * * * *')
      expect(CRON_SCHEDULES.EVERY_5_MINUTES).toBe('*/5 * * * *')
      expect(CRON_SCHEDULES.HOURLY).toBe('0 * * * *')
      expect(CRON_SCHEDULES.DAILY_MIDNIGHT).toBe('0 0 * * *')
    })
  })

  describe('parseCronExpression()', () => {
    it('should parse common cron expressions', () => {
      expect(parseCronExpression('* * * * *')).toBe('Every minute')
      expect(parseCronExpression('*/5 * * * *')).toBe('Every 5 minutes')
      expect(parseCronExpression('0 * * * *')).toBe('Hourly')
      expect(parseCronExpression('0 9 * * *')).toBe('Daily at 9 AM')
      expect(parseCronExpression('0 0 * * *')).toBe('Daily at midnight')
    })

    it('should return original expression for unknown patterns', () => {
      const customCron = '15 2 * * 3'
      expect(parseCronExpression(customCron)).toBe(customCron)
    })
  })
})

describe('Workflow Naming', () => {
  describe('generateWorkflowName()', () => {
    it('should generate kebab-case workflow name', () => {
      const name = generateWorkflowName('sync', 'orders to unleashed')

      expect(name).toBe('sync-orders-to-unleashed')
    })

    it('should handle prefix and suffix', () => {
      const name = generateWorkflowName('prod', 'user sync', 'v2')

      expect(name).toBe('prod-user-sync-v2')
    })

    it('should remove special characters', () => {
      const name = generateWorkflowName('test', 'data & files')

      expect(name).toBe('test-data-files')
    })

    it('should convert to lowercase', () => {
      const name = generateWorkflowName('SYNC', 'Data Items')

      expect(name).toBe('sync-data-items')
    })

    it('should handle multiple spaces', () => {
      const name = generateWorkflowName('sync', 'data   items')

      expect(name).toBe('sync-data-items')
    })
  })

  describe('addWorkflowPrefix()', () => {
    it('should add emoji prefix', () => {
      const name = addWorkflowPrefix('My Workflow', '🚀')

      expect(name).toBe('🚀 My Workflow')
    })

    it('should add text prefix', () => {
      const name = addWorkflowPrefix('My Workflow', 'PROD')

      expect(name).toBe('PROD My Workflow')
    })

    it('should remove existing emoji prefix', () => {
      const name = addWorkflowPrefix('🎯 Old Workflow', '🚀')

      expect(name).toBe('🚀 Old Workflow')
    })

    it('should remove existing text prefix', () => {
      const name = addWorkflowPrefix('TEST Old Workflow', 'PROD')

      expect(name).toBe('PROD Old Workflow')
    })

    it('should handle multiple prefixes', () => {
      const name = addWorkflowPrefix('🚀 TEST Workflow', '✅')

      expect(name).toBe('✅ Workflow')
    })
  })
})

describe('Workflow Validation', () => {
  describe('validateWorkflow()', () => {
    it('should validate complete workflow', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Valid Workflow',
        nodes: [
          {
            name: 'Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect missing name', () => {
      const workflow: Partial<N8nWorkflow> = {
        nodes: [],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow name is required')
    })

    it('should detect missing nodes', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have at least one node')
    })

    it('should detect missing connections object', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [
          {
            name: 'Node',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow connections object is required')
    })

    it('should detect missing trigger node', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [
          {
            name: 'Set',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'Workflow must have a trigger node (cron, webhook, or manual trigger)'
      )
    })

    it('should accept cron trigger', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [
          {
            name: 'Cron',
            type: 'n8n-nodes-base.cron',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(true)
    })

    it('should accept webhook trigger', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(true)
    })

    it('should accept manual trigger', () => {
      const workflow: Partial<N8nWorkflow> = {
        name: 'Test',
        nodes: [
          {
            name: 'Manual',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(true)
    })
  })

  describe('checkNamingConvention()', () => {
    it('should validate good workflow name', () => {
      const result = checkNamingConvention('Sync Orders to Unleashed')

      expect(result.valid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should detect name too short', () => {
      const result = checkNamingConvention('Sync')

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Workflow name is too short')
      expect(result.suggestions).toContain(
        'Use a more descriptive name (at least 5 characters)'
      )
    })

    it('should detect generic name "workflow"', () => {
      const result = checkNamingConvention('My Workflow')

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Workflow uses a generic name')
    })

    it('should detect generic name "test"', () => {
      const result = checkNamingConvention('Test Workflow')

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Workflow uses a generic name')
    })

    it('should suggest against ALL CAPS', () => {
      const result = checkNamingConvention('SYNC ORDERS NOW')

      expect(result.suggestions).toContain(
        'Consider using title case or sentence case instead of ALL CAPS'
      )
    })

    it('should allow short ALL CAPS (acronyms)', () => {
      const result = checkNamingConvention('API')

      // Should have other issues but not the CAPS suggestion
      const hasCapsIssue = result.suggestions.some((s) => s.includes('ALL CAPS'))
      expect(hasCapsIssue).toBe(false)
    })
  })
})

describe('Execution Analysis', () => {
  describe('calculateSuccessRate()', () => {
    it('should calculate 100% success rate', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T00:00:00Z',
          stoppedAt: '2024-01-01T00:00:05Z',
          workflowId: 'wf-1',
          status: 'success',
        },
        {
          id: '2',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T01:00:00Z',
          stoppedAt: '2024-01-01T01:00:05Z',
          workflowId: 'wf-1',
          status: 'success',
        },
      ]

      const rate = calculateSuccessRate(executions)

      expect(rate).toBe(100)
    })

    it('should calculate 50% success rate', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T00:00:00Z',
          stoppedAt: '2024-01-01T00:00:05Z',
          workflowId: 'wf-1',
          status: 'success',
        },
        {
          id: '2',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T01:00:00Z',
          stoppedAt: '2024-01-01T01:00:05Z',
          workflowId: 'wf-1',
          status: 'error',
        },
      ]

      const rate = calculateSuccessRate(executions)

      expect(rate).toBe(50)
    })

    it('should return 0 for empty array', () => {
      const rate = calculateSuccessRate([])

      expect(rate).toBe(0)
    })

    it('should return 0 for all failures', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T00:00:00Z',
          stoppedAt: '2024-01-01T00:00:05Z',
          workflowId: 'wf-1',
          status: 'error',
        },
      ]

      const rate = calculateSuccessRate(executions)

      expect(rate).toBe(0)
    })
  })

  describe('getExecutionDuration()', () => {
    it('should calculate duration in seconds', () => {
      const execution: N8nExecution = {
        id: '1',
        finished: true,
        mode: 'trigger',
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: '2024-01-01T00:00:05Z',
        workflowId: 'wf-1',
      }

      const duration = getExecutionDuration(execution)

      expect(duration).toBe(5)
    })

    it('should return null if startedAt missing', () => {
      const execution: N8nExecution = {
        id: '1',
        finished: true,
        mode: 'trigger',
        startedAt: '',
        workflowId: 'wf-1',
      }

      const duration = getExecutionDuration(execution)

      expect(duration).toBeNull()
    })

    it('should return null if stoppedAt missing', () => {
      const execution: N8nExecution = {
        id: '1',
        finished: false,
        mode: 'trigger',
        startedAt: '2024-01-01T00:00:00Z',
        workflowId: 'wf-1',
      }

      const duration = getExecutionDuration(execution)

      expect(duration).toBeNull()
    })
  })

  describe('analyzeExecutionPatterns()', () => {
    it('should analyze execution patterns', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T09:00:00Z',
          stoppedAt: '2024-01-01T09:00:05Z',
          workflowId: 'wf-1',
          status: 'success',
        },
        {
          id: '2',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T09:15:00Z',
          stoppedAt: '2024-01-01T09:15:10Z',
          workflowId: 'wf-1',
          status: 'success',
        },
        {
          id: '3',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T14:00:00Z',
          stoppedAt: '2024-01-01T14:00:02Z',
          workflowId: 'wf-1',
          status: 'error',
          data: {
            resultData: {
              error: {
                message: 'Connection timeout',
              },
            },
          },
        },
      ]

      const analysis = analyzeExecutionPatterns(executions)

      expect(analysis.totalExecutions).toBe(3)
      expect(analysis.successRate).toBeCloseTo(66.67, 1)
      expect(analysis.averageDuration).toBeCloseTo(5.67, 1)
      expect(analysis.failureReasons).toContain('Connection timeout')
      expect(analysis.peakHours).toContain(9)
    })

    it('should handle executions without duration', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: false,
          mode: 'trigger',
          startedAt: '2024-01-01T00:00:00Z',
          workflowId: 'wf-1',
          status: 'running',
        },
      ]

      const analysis = analyzeExecutionPatterns(executions)

      expect(analysis.averageDuration).toBeNull()
    })

    it('should extract unique failure reasons', () => {
      const executions: N8nExecution[] = [
        {
          id: '1',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T00:00:00Z',
          stoppedAt: '2024-01-01T00:00:05Z',
          workflowId: 'wf-1',
          status: 'error',
          data: {
            resultData: {
              error: {
                message: 'Timeout',
              },
            },
          },
        },
        {
          id: '2',
          finished: true,
          mode: 'trigger',
          startedAt: '2024-01-01T01:00:00Z',
          stoppedAt: '2024-01-01T01:00:05Z',
          workflowId: 'wf-1',
          status: 'error',
          data: {
            resultData: {
              error: {
                message: 'Timeout',
              },
            },
          },
        },
      ]

      const analysis = analyzeExecutionPatterns(executions)

      expect(analysis.failureReasons).toEqual(['Timeout'])
    })
  })
})

describe('Export Helpers', () => {
  describe('sanitizeWorkflow()', () => {
    it('should remove ID fields', () => {
      const workflow: N8nWorkflow = {
        id: 'wf-123',
        name: 'Test',
        nodes: [],
        connections: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        versionId: 'v1',
      }

      const sanitized = sanitizeWorkflow(workflow)

      expect(sanitized).not.toHaveProperty('id')
      expect(sanitized).not.toHaveProperty('createdAt')
      expect(sanitized).not.toHaveProperty('updatedAt')
      expect(sanitized).not.toHaveProperty('versionId')
    })

    it('should preserve name and nodes', () => {
      const workflow: N8nWorkflow = {
        id: 'wf-123',
        name: 'Test Workflow',
        nodes: [
          {
            name: 'Node',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [240, 300],
          },
        ],
        connections: {},
      }

      const sanitized = sanitizeWorkflow(workflow)

      expect(sanitized.name).toBe('Test Workflow')
      expect(sanitized.nodes).toHaveLength(1)
    })

    it('should sanitize credential data', () => {
      const workflow: N8nWorkflow = {
        name: 'Test',
        nodes: [
          {
            name: 'HTTP',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [240, 300],
            credentials: {
              httpAuth: {
                id: 'cred-123',
                name: 'My Credential',
              },
            },
          },
        ],
        connections: {},
      }

      const sanitized = sanitizeWorkflow(workflow)

      expect(sanitized.nodes[0].credentials).toEqual({
        httpAuth: {
          name: 'My Credential',
        },
      })
    })
  })

  describe('generateWorkflowDocs()', () => {
    it('should generate workflow documentation', () => {
      const workflow: N8nWorkflow = {
        id: 'wf-123',
        name: 'Test Workflow',
        nodes: [
          {
            name: 'Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            typeVersion: 1,
            position: [240, 300],
          },
          {
            name: 'Action',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [460, 300],
          },
        ],
        connections: {},
        active: true,
        tags: ['automation', 'test'],
        settings: {
          timezone: 'Australia/Melbourne',
          executionTimeout: 300,
        },
      }

      const docs = generateWorkflowDocs(workflow)

      expect(docs).toContain('# Test Workflow')
      expect(docs).toContain('**Tags**: automation, test')
      expect(docs).toContain('**Status**: 🟢 Active')
      expect(docs).toContain('**Nodes**: 2')
      expect(docs).toContain('## Trigger')
      expect(docs).toContain('- **Type**: n8n-nodes-base.scheduleTrigger')
      expect(docs).toContain('## Nodes')
      expect(docs).toContain('1. **Trigger**')
      expect(docs).toContain('2. **Action**')
      expect(docs).toContain('## Settings')
      expect(docs).toContain('- **Timezone**: Australia/Melbourne')
      expect(docs).toContain('- **Timeout**: 300s')
    })

    it('should show inactive status', () => {
      const workflow: N8nWorkflow = {
        name: 'Inactive Workflow',
        nodes: [],
        connections: {},
        active: false,
      }

      const docs = generateWorkflowDocs(workflow)

      expect(docs).toContain('**Status**: ⚫ Inactive')
    })

    it('should handle workflow without tags', () => {
      const workflow: N8nWorkflow = {
        name: 'No Tags',
        nodes: [],
        connections: {},
      }

      const docs = generateWorkflowDocs(workflow)

      expect(docs).not.toContain('**Tags**')
    })

    it('should handle workflow without settings', () => {
      const workflow: N8nWorkflow = {
        name: 'No Settings',
        nodes: [],
        connections: {},
      }

      const docs = generateWorkflowDocs(workflow)

      expect(docs).not.toContain('## Settings')
    })
  })
})
