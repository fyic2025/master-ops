#!/usr/bin/env node
/**
 * HubSpot Integration Validation Script
 *
 * Tests all components of the HubSpot integration:
 * - Environment variables
 * - API connectivity (HubSpot, Shopify, Unleashed, Supabase)
 * - HubSpot custom properties
 * - Supabase schema
 * - n8n workflow files
 *
 * Run: npx tsx scripts/validate-hubspot-integration.ts
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

config();

interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: ValidationResult[] = [];

function addResult(category: string, test: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.push({ category, test, status, message });
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function printHeader(text: string) {
  console.log(`\n${colors.blue}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}${colors.bold}${text}${colors.reset}`);
  console.log(`${colors.blue}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// ============================================================================
// 1. Environment Variables Validation
// ============================================================================
async function validateEnvironmentVariables() {
  printHeader('1. Validating Environment Variables');

  const requiredVars = [
    { name: 'HUBSPOT_ACCESS_TOKEN', phase: 1 },
    { name: 'SHOPIFY_SHOP_DOMAIN', phase: 1, alias: 'Teelixir Shopify Domain' },
    { name: 'SHOPIFY_ACCESS_TOKEN', phase: 1, alias: 'Teelixir Shopify Token' },
    { name: 'SHOPIFY_ELEVATE_SHOP_DOMAIN', phase: 1, alias: 'Elevate Shopify Domain' },
    { name: 'SHOPIFY_ELEVATE_ACCESS_TOKEN', phase: 1 },
    { name: 'SUPABASE_URL', phase: 1 },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', phase: 1 },
    { name: 'N8N_BASE_URL', phase: 1 },
    { name: 'UNLEASHED_TEELIXIR_API_ID', phase: 2 },
    { name: 'UNLEASHED_TEELIXIR_API_KEY', phase: 2 },
    { name: 'UNLEASHED_ELEVATE_API_ID', phase: 2 },
    { name: 'UNLEASHED_ELEVATE_API_KEY', phase: 2 },
  ];

  for (const { name, phase } of requiredVars) {
    const value = process.env[name];
    if (value) {
      addResult('Environment', name, 'pass', `✓ Set (Phase ${phase})`);
      console.log(`${colors.green}✓${colors.reset} ${name} (Phase ${phase})`);
    } else {
      addResult('Environment', name, 'fail', `✗ Not set (Phase ${phase})`);
      console.log(`${colors.red}✗${colors.reset} ${name} ${colors.red}NOT SET${colors.reset} (Phase ${phase})`);
    }
  }

  const optionalVars = [
    { name: 'N8N_API_KEY', purpose: 'n8n API operations' },
    { name: 'KLAVIYO_API_KEY', purpose: 'Phase 3 - Email engagement' },
    { name: 'SMARTLEAD_API_KEY', purpose: 'Phase 4 - Cold outreach' },
  ];

  console.log('\nOptional Variables:');
  for (const { name, purpose } of optionalVars) {
    const value = process.env[name];
    if (value) {
      addResult('Environment', name, 'pass', `✓ Set - ${purpose}`);
      console.log(`${colors.green}✓${colors.reset} ${name} - ${purpose}`);
    } else {
      addResult('Environment', name, 'warn', `○ Not set - ${purpose}`);
      console.log(`${colors.yellow}○${colors.reset} ${name} - ${colors.yellow}Not set${colors.reset} - ${purpose}`);
    }
  }
}

// ============================================================================
// 2. API Connectivity Tests
// ============================================================================
async function validateAPIConnectivity() {
  printHeader('2. Testing API Connectivity');

  // Test HubSpot
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    try {
      const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        },
      });

      if (response.ok) {
        addResult('API', 'HubSpot', 'pass', '✓ Connected successfully');
        console.log(`${colors.green}✓${colors.reset} HubSpot API - Connected`);
      } else {
        addResult('API', 'HubSpot', 'fail', `✗ HTTP ${response.status}`);
        console.log(`${colors.red}✗${colors.reset} HubSpot API - ${colors.red}HTTP ${response.status}${colors.reset}`);
      }
    } catch (error) {
      addResult('API', 'HubSpot', 'fail', `✗ ${(error as Error).message}`);
      console.log(`${colors.red}✗${colors.reset} HubSpot API - ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  } else {
    addResult('API', 'HubSpot', 'fail', '✗ Token not set');
    console.log(`${colors.red}✗${colors.reset} HubSpot API - ${colors.red}Token not set${colors.reset}`);
  }

  // Test Shopify Teelixir
  if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_SHOP_DOMAIN) {
    try {
      const response = await fetch(
        `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as { shop: { name: string } };
        addResult('API', 'Shopify Teelixir', 'pass', `✓ Connected - ${data.shop.name}`);
        console.log(`${colors.green}✓${colors.reset} Shopify Teelixir - Connected - ${data.shop.name}`);
      } else {
        addResult('API', 'Shopify Teelixir', 'fail', `✗ HTTP ${response.status}`);
        console.log(`${colors.red}✗${colors.reset} Shopify Teelixir - ${colors.red}HTTP ${response.status}${colors.reset}`);
      }
    } catch (error) {
      addResult('API', 'Shopify Teelixir', 'fail', `✗ ${(error as Error).message}`);
      console.log(`${colors.red}✗${colors.reset} Shopify Teelixir - ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  } else {
    addResult('API', 'Shopify Teelixir', 'fail', '✗ Credentials not set');
    console.log(`${colors.red}✗${colors.reset} Shopify Teelixir - ${colors.red}Credentials not set${colors.reset}`);
  }

  // Test Shopify Elevate
  if (process.env.SHOPIFY_ELEVATE_ACCESS_TOKEN && process.env.SHOPIFY_ELEVATE_SHOP_DOMAIN) {
    try {
      const response = await fetch(
        `https://${process.env.SHOPIFY_ELEVATE_SHOP_DOMAIN}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ELEVATE_ACCESS_TOKEN,
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as { shop: { name: string } };
        addResult('API', 'Shopify Elevate', 'pass', `✓ Connected - ${data.shop.name}`);
        console.log(`${colors.green}✓${colors.reset} Shopify Elevate - Connected - ${data.shop.name}`);
      } else {
        addResult('API', 'Shopify Elevate', 'fail', `✗ HTTP ${response.status}`);
        console.log(`${colors.red}✗${colors.reset} Shopify Elevate - ${colors.red}HTTP ${response.status}${colors.reset}`);
      }
    } catch (error) {
      addResult('API', 'Shopify Elevate', 'fail', `✗ ${(error as Error).message}`);
      console.log(`${colors.red}✗${colors.reset} Shopify Elevate - ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  } else {
    addResult('API', 'Shopify Elevate', 'fail', '✗ Credentials not set');
    console.log(`${colors.red}✗${colors.reset} Shopify Elevate - ${colors.red}Credentials not set${colors.reset}`);
  }

  // Test Unleashed Teelixir
  if (process.env.UNLEASHED_TEELIXIR_API_ID && process.env.UNLEASHED_TEELIXIR_API_KEY) {
    try {
      const response = await fetch('https://api.unleashedsoftware.com/Customers/1?pageSize=1', {
        headers: {
          'api-auth-id': process.env.UNLEASHED_TEELIXIR_API_ID,
          'api-auth-signature': process.env.UNLEASHED_TEELIXIR_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        addResult('API', 'Unleashed Teelixir', 'pass', '✓ Connected successfully');
        console.log(`${colors.green}✓${colors.reset} Unleashed Teelixir - Connected`);
      } else {
        addResult('API', 'Unleashed Teelixir', 'fail', `✗ HTTP ${response.status}`);
        console.log(`${colors.red}✗${colors.reset} Unleashed Teelixir - ${colors.red}HTTP ${response.status}${colors.reset}`);
      }
    } catch (error) {
      addResult('API', 'Unleashed Teelixir', 'fail', `✗ ${(error as Error).message}`);
      console.log(`${colors.red}✗${colors.reset} Unleashed Teelixir - ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  } else {
    addResult('API', 'Unleashed Teelixir', 'warn', '○ Credentials not set (Phase 2)');
    console.log(`${colors.yellow}○${colors.reset} Unleashed Teelixir - ${colors.yellow}Credentials not set (Phase 2)${colors.reset}`);
  }

  // Test Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (response.ok) {
        addResult('API', 'Supabase', 'pass', '✓ Connected successfully');
        console.log(`${colors.green}✓${colors.reset} Supabase - Connected`);
      } else {
        addResult('API', 'Supabase', 'fail', `✗ HTTP ${response.status}`);
        console.log(`${colors.red}✗${colors.reset} Supabase - ${colors.red}HTTP ${response.status}${colors.reset}`);
      }
    } catch (error) {
      addResult('API', 'Supabase', 'fail', `✗ ${(error as Error).message}`);
      console.log(`${colors.red}✗${colors.reset} Supabase - ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  } else {
    addResult('API', 'Supabase', 'fail', '✗ Credentials not set');
    console.log(`${colors.red}✗${colors.reset} Supabase - ${colors.red}Credentials not set${colors.reset}`);
  }
}

// ============================================================================
// 3. HubSpot Properties Validation
// ============================================================================
async function validateHubSpotProperties() {
  printHeader('3. Validating HubSpot Custom Properties');

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.log(`${colors.red}✗${colors.reset} HubSpot token not set - skipping property validation`);
    return;
  }

  const requiredProperties = {
    contacts: [
      'contact_type',
      'wholesale_account',
      'source_business',
      'shopify_customer_id',
      'unleashed_customer_code',
      'ambassador_status',
    ],
    companies: ['company_type', 'source_business', 'wholesale_discount_tier'],
    deals: ['deal_source', 'source_business', 'shopify_order_id', 'unleashed_order_id'],
  };

  for (const [objectType, properties] of Object.entries(requiredProperties)) {
    console.log(`\nChecking ${objectType} properties:`);

    for (const propertyName of properties) {
      try {
        const response = await fetch(
          `https://api.hubapi.com/crm/v3/properties/${objectType}/${propertyName}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            },
          }
        );

        if (response.ok) {
          addResult('HubSpot Properties', `${objectType}.${propertyName}`, 'pass', '✓ Exists');
          console.log(`  ${colors.green}✓${colors.reset} ${propertyName}`);
        } else if (response.status === 404) {
          addResult('HubSpot Properties', `${objectType}.${propertyName}`, 'fail', '✗ Not found');
          console.log(`  ${colors.red}✗${colors.reset} ${propertyName} ${colors.red}NOT FOUND${colors.reset}`);
        } else {
          addResult('HubSpot Properties', `${objectType}.${propertyName}`, 'fail', `✗ HTTP ${response.status}`);
          console.log(`  ${colors.red}✗${colors.reset} ${propertyName} ${colors.red}HTTP ${response.status}${colors.reset}`);
        }
      } catch (error) {
        addResult('HubSpot Properties', `${objectType}.${propertyName}`, 'fail', `✗ ${(error as Error).message}`);
        console.log(`  ${colors.red}✗${colors.reset} ${propertyName} ${colors.red}${(error as Error).message}${colors.reset}`);
      }
    }
  }
}

// ============================================================================
// 4. Supabase Schema Validation
// ============================================================================
async function validateSupabaseSchema() {
  printHeader('4. Validating Supabase Schema');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`${colors.red}✗${colors.reset} Supabase credentials not set - skipping schema validation`);
    return;
  }

  const requiredTables = ['hubspot_sync_log', 'integration_logs'];
  const requiredViews = ['hubspot_sync_recent', 'hubspot_sync_failed', 'hubspot_sync_health'];

  console.log('\nChecking tables:');
  for (const tableName of requiredTables) {
    try {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/${tableName}?limit=0`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        addResult('Supabase Schema', tableName, 'pass', '✓ Table exists');
        console.log(`  ${colors.green}✓${colors.reset} ${tableName}`);
      } else {
        addResult('Supabase Schema', tableName, 'fail', `✗ HTTP ${response.status}`);
        console.log(`  ${colors.red}✗${colors.reset} ${tableName} ${colors.red}NOT FOUND${colors.reset}`);
      }
    } catch (error) {
      addResult('Supabase Schema', tableName, 'fail', `✗ ${(error as Error).message}`);
      console.log(`  ${colors.red}✗${colors.reset} ${tableName} ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  }

  console.log('\nChecking views:');
  for (const viewName of requiredViews) {
    try {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/${viewName}?limit=0`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        addResult('Supabase Schema', viewName, 'pass', '✓ View exists');
        console.log(`  ${colors.green}✓${colors.reset} ${viewName}`);
      } else {
        addResult('Supabase Schema', viewName, 'fail', `✗ HTTP ${response.status}`);
        console.log(`  ${colors.red}✗${colors.reset} ${viewName} ${colors.red}NOT FOUND${colors.reset}`);
      }
    } catch (error) {
      addResult('Supabase Schema', viewName, 'fail', `✗ ${(error as Error).message}`);
      console.log(`  ${colors.red}✗${colors.reset} ${viewName} ${colors.red}${(error as Error).message}${colors.reset}`);
    }
  }
}

// ============================================================================
// 5. n8n Workflow Files Validation
// ============================================================================
function validateWorkflowFiles() {
  printHeader('5. Validating n8n Workflow Files');

  const workflowFiles = [
    { name: 'shopify-customer-sync.json', phase: 1 },
    { name: 'shopify-order-sync.json', phase: 1 },
    { name: 'ambassador-application-handler.json', phase: 1 },
    { name: 'unleashed-customer-sync.json', phase: 2 },
    { name: 'unleashed-order-sync.json', phase: 2 },
  ];

  for (const { name, phase } of workflowFiles) {
    const filePath = join(process.cwd(), 'infra', 'n8n-workflows', 'templates', name);

    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const workflow = JSON.parse(content);

        if (workflow.nodes && Array.isArray(workflow.nodes) && workflow.nodes.length > 0) {
          addResult('Workflow Files', name, 'pass', `✓ Valid (${workflow.nodes.length} nodes) - Phase ${phase}`);
          console.log(`${colors.green}✓${colors.reset} ${name} (${workflow.nodes.length} nodes) - Phase ${phase}`);
        } else {
          addResult('Workflow Files', name, 'fail', '✗ Invalid structure');
          console.log(`${colors.red}✗${colors.reset} ${name} ${colors.red}Invalid structure${colors.reset}`);
        }
      } catch (error) {
        addResult('Workflow Files', name, 'fail', `✗ Invalid JSON: ${(error as Error).message}`);
        console.log(`${colors.red}✗${colors.reset} ${name} ${colors.red}Invalid JSON${colors.reset}`);
      }
    } else {
      addResult('Workflow Files', name, 'fail', '✗ File not found');
      console.log(`${colors.red}✗${colors.reset} ${name} ${colors.red}NOT FOUND${colors.reset}`);
    }
  }
}

// ============================================================================
// 6. Print Summary
// ============================================================================
function printSummary() {
  printHeader('Validation Summary');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warn').length;

  console.log(`${colors.green}✓ Passed:${colors.reset}  ${passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}  ${failed}`);
  console.log(`${colors.yellow}○ Warnings:${colors.reset} ${warnings}`);
  console.log(`${colors.bold}Total:${colors.reset}    ${results.length}\n`);

  if (failed > 0) {
    console.log(`${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    results
      .filter((r) => r.status === 'fail')
      .forEach((r) => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.category} → ${r.test}`);
        console.log(`    ${r.message}`);
      });
    console.log('');
  }

  if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
    results
      .filter((r) => r.status === 'warn')
      .forEach((r) => {
        console.log(`  ${colors.yellow}○${colors.reset} ${r.category} → ${r.test}`);
        console.log(`    ${r.message}`);
      });
    console.log('');
  }

  // Deployment readiness
  const phase1Failed = results.filter(
    (r) => r.status === 'fail' && (r.message.includes('Phase 1') || !r.message.includes('Phase'))
  ).length;

  const phase2Failed = results.filter((r) => r.status === 'fail' && r.message.includes('Phase 2')).length;

  console.log(`${colors.blue}${colors.bold}Deployment Readiness:${colors.reset}`);

  if (phase1Failed === 0) {
    console.log(`${colors.green}✓${colors.reset} Phase 1 (Shopify + HubSpot) - ${colors.green}READY TO DEPLOY${colors.reset}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Phase 1 (Shopify + HubSpot) - ${colors.red}NOT READY${colors.reset} (${phase1Failed} issues)`);
  }

  if (phase2Failed === 0) {
    console.log(`${colors.green}✓${colors.reset} Phase 2 (Unleashed + HubSpot) - ${colors.green}READY TO DEPLOY${colors.reset}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Phase 2 (Unleashed + HubSpot) - ${colors.red}NOT READY${colors.reset} (${phase2Failed} issues)`);
  }

  console.log('');

  // Exit with appropriate code
  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║       HubSpot Integration - Validation & Testing Tool        ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  await validateEnvironmentVariables();
  await validateAPIConnectivity();
  await validateHubSpotProperties();
  await validateSupabaseSchema();
  validateWorkflowFiles();
  printSummary();
}

main();
