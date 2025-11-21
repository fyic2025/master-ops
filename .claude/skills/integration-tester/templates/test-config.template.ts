/**
 * Integration Test Configuration Template
 *
 * Copy and customize this template for your integration tests
 */

import dotenv from 'dotenv'

dotenv.config()

/**
 * Test Configuration
 */
export const config = {
  // Service identification
  serviceName: 'MyAPI',

  // Base URL (from environment or hardcoded)
  baseUrl: process.env.SERVICE_BASE_URL || 'https://api.example.com',

  // Authentication configuration
  auth: {
    // Option 1: Bearer Token
    type: 'bearer' as const,
    token: process.env.SERVICE_API_TOKEN || '',

    // Option 2: API Key
    // type: 'apikey' as const,
    // key: process.env.SERVICE_API_KEY || '',
    // headerName: 'X-API-Key',

    // Option 3: HMAC Signature
    // type: 'hmac' as const,
    // apiId: process.env.SERVICE_API_ID || '',
    // apiKey: process.env.SERVICE_API_KEY || '',
    // algorithm: 'sha256' as const,
    // encoding: 'base64' as const,
  },

  // Endpoints to test (optional)
  endpoints: {
    health: '/health',
    list: '/api/resources',
    create: '/api/resources',
    read: '/api/resources/:id',
    update: '/api/resources/:id',
    delete: '/api/resources/:id',
  },

  // Request configuration
  request: {
    timeout: 10000, // 10 seconds
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },

  // Test data
  testData: {
    // Sample data for create operations
    createPayload: {
      name: 'Test Resource',
      description: 'Created by integration test',
      test: true,
    },

    // Sample data for update operations
    updatePayload: {
      name: 'Updated Test Resource',
    },

    // Search query for testing
    searchQuery: 'test',
  },

  // Test suites to run
  tests: {
    environment: true,
    connection: true,
    authentication: true,
    read: true,
    create: false, // Set to true if safe to create test data
    update: false, // Set to true if safe to modify data
    delete: false, // Set to true if safe to delete data
    pagination: true,
    search: true,
    performance: true,
  },
}

/**
 * Validation function for configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.baseUrl) {
    errors.push('baseUrl is required')
  }

  if (config.auth.type === 'bearer' && !config.auth.token) {
    errors.push('Bearer token is required')
  }

  if (config.auth.type === 'apikey' && !config.auth.key) {
    errors.push('API key is required')
  }

  if (config.auth.type === 'hmac' && (!config.auth.apiId || !config.auth.apiKey)) {
    errors.push('HMAC requires both apiId and apiKey')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Environment variables required
 */
export const requiredEnvVars = [
  'SERVICE_BASE_URL',
  'SERVICE_API_TOKEN', // or SERVICE_API_KEY, depending on auth type
]

/**
 * Export configuration
 */
export default config
