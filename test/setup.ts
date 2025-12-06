/**
 * Test Setup
 *
 * Global test configuration and setup for Vitest
 */

import { vi } from 'vitest'
import * as dotenv from 'dotenv'

// Augment global namespace for test utilities
declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<unknown>
  }
}

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set default environment variables for tests
process.env.N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://test.n8n.local'
process.env.N8N_API_KEY = process.env.N8N_API_KEY || 'test-api-key-12345'

// Global test utilities
global.testUtils = {
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
}

// Mock console methods to reduce noise in tests (can be overridden per test)
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep errors visible
}
