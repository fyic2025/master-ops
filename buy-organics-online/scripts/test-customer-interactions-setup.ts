#!/usr/bin/env npx tsx
/**
 * Test Customer Interactions Setup
 *
 * Validates all credentials and connections for the customer interactions system:
 * - Supabase database connection
 * - Schema tables exist
 * - LiveChat API connection
 * - Email IMAP connection
 *
 * Usage:
 *   npx tsx test-customer-interactions-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Imap from 'imap';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: 'buy-organics-online/BOO-CREDENTIALS.env' });
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  livechat: {
    accountId: process.env.BOO_LIVECHAT_ACCOUNT_ID || '',
    patBase64: process.env.BOO_LIVECHAT_PAT_BASE64 || '',
    pat: process.env.BOO_LIVECHAT_PAT || '',
    apiUrl: 'https://api.livechatinc.com/v3.5',
  },
  email: {
    type: process.env.BOO_SALES_EMAIL_TYPE || 'imap',
    imap: {
      host: process.env.BOO_SALES_IMAP_HOST || '',
      port: parseInt(process.env.BOO_SALES_IMAP_PORT || '993'),
      user: process.env.BOO_SALES_IMAP_USER || '',
      password: process.env.BOO_SALES_IMAP_PASS || '',
      tls: process.env.BOO_SALES_IMAP_TLS !== 'false',
    },
  },
  supabase: {
    url: process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
};

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testSupabaseConnection(): Promise<void> {
  console.log('\n📦 Testing Supabase Connection...');

  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    results.push({
      name: 'Supabase Connection',
      status: 'fail',
      message: 'Missing credentials (BOO_SUPABASE_URL or BOO_SUPABASE_SERVICE_ROLE_KEY)',
    });
    return;
  }

  try {
    const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceKey);

    // Test connection by fetching schema info
    const { data, error } = await supabase
      .from('customer_interactions')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist
      results.push({
        name: 'Supabase Connection',
        status: 'pass',
        message: 'Connected, but schema not applied yet',
        details: 'Run: customer-interactions-schema.sql in Supabase SQL Editor',
      });
    } else if (error) {
      results.push({
        name: 'Supabase Connection',
        status: 'fail',
        message: `Connection error: ${error.message}`,
      });
    } else {
      // Check row count
      const { count } = await supabase
        .from('customer_interactions')
        .select('*', { count: 'exact', head: true });

      results.push({
        name: 'Supabase Connection',
        status: 'pass',
        message: `Connected! ${count || 0} interactions in database`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Supabase Connection',
      status: 'fail',
      message: err.message,
    });
  }
}

async function testSupabaseSchema(): Promise<void> {
  console.log('\n📋 Testing Supabase Schema...');

  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    results.push({
      name: 'Supabase Schema',
      status: 'skip',
      message: 'Skipped - no credentials',
    });
    return;
  }

  const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceKey);

  const requiredTables = [
    'customer_interactions',
    'interaction_messages',
    'interaction_categories',
    'livechat_sync_state',
    'email_sync_state',
  ];

  const missingTables: string[] = [];

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      missingTables.push(table);
    }
  }

  if (missingTables.length === 0) {
    results.push({
      name: 'Supabase Schema',
      status: 'pass',
      message: 'All required tables exist',
    });
  } else if (missingTables.length === requiredTables.length) {
    results.push({
      name: 'Supabase Schema',
      status: 'fail',
      message: 'Schema not applied',
      details: 'Run customer-interactions-schema.sql in Supabase SQL Editor',
    });
  } else {
    results.push({
      name: 'Supabase Schema',
      status: 'fail',
      message: `Missing tables: ${missingTables.join(', ')}`,
    });
  }
}

async function testLiveChatConnection(): Promise<void> {
  console.log('\n💬 Testing LiveChat Connection...');

  let authHeader: string;

  if (CONFIG.livechat.patBase64) {
    authHeader = `Basic ${CONFIG.livechat.patBase64}`;
  } else if (CONFIG.livechat.pat && CONFIG.livechat.accountId) {
    const credentials = `${CONFIG.livechat.accountId}:${CONFIG.livechat.pat}`;
    authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  } else {
    results.push({
      name: 'LiveChat Connection',
      status: 'fail',
      message: 'Missing credentials (BOO_LIVECHAT_PAT_BASE64 or BOO_LIVECHAT_ACCOUNT_ID + BOO_LIVECHAT_PAT)',
    });
    return;
  }

  try {
    // Test by fetching agent info
    const response = await fetch(`${CONFIG.livechat.apiUrl}/configuration/action/list_agents`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json() as any;
      const agentCount = data.length || 0;
      results.push({
        name: 'LiveChat Connection',
        status: 'pass',
        message: `Connected! Found ${agentCount} agent(s)`,
        details: data.map((a: any) => a.name).join(', '),
      });
    } else {
      const error = await response.text();
      results.push({
        name: 'LiveChat Connection',
        status: 'fail',
        message: `API error: ${response.status} - ${error}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'LiveChat Connection',
      status: 'fail',
      message: err.message,
    });
  }
}

async function testEmailConnection(): Promise<void> {
  console.log('\n📧 Testing Email IMAP Connection...');

  if (!CONFIG.email.imap.host || !CONFIG.email.imap.user || !CONFIG.email.imap.password) {
    results.push({
      name: 'Email IMAP Connection',
      status: 'fail',
      message: 'Missing credentials (BOO_SALES_IMAP_HOST, USER, or PASS)',
      details: 'For G Suite: Get app password from myaccount.google.com/apppasswords',
    });
    return;
  }

  return new Promise((resolve) => {
    const imap = new Imap({
      user: CONFIG.email.imap.user,
      password: CONFIG.email.imap.password,
      host: CONFIG.email.imap.host,
      port: CONFIG.email.imap.port,
      tls: CONFIG.email.imap.tls,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });

    imap.once('ready', () => {
      imap.getBoxes((err, boxes) => {
        if (err) {
          results.push({
            name: 'Email IMAP Connection',
            status: 'fail',
            message: `Connected but can't list folders: ${err.message}`,
          });
        } else {
          const folderNames = Object.keys(boxes);
          results.push({
            name: 'Email IMAP Connection',
            status: 'pass',
            message: `Connected! Found ${folderNames.length} folder(s)`,
            details: folderNames.slice(0, 5).join(', '),
          });
        }
        imap.end();
        resolve();
      });
    });

    imap.once('error', (err: Error) => {
      results.push({
        name: 'Email IMAP Connection',
        status: 'fail',
        message: err.message,
        details: 'Check credentials and ensure IMAP is enabled in G Suite',
      });
      resolve();
    });

    imap.connect();
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('Customer Interactions Setup Test');
  console.log('═'.repeat(60));

  // Run all tests
  await testSupabaseConnection();
  await testSupabaseSchema();
  await testLiveChatConnection();
  await testEmailConnection();

  // Display results
  console.log('\n' + '═'.repeat(60));
  console.log('RESULTS');
  console.log('═'.repeat(60));

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  results.forEach(r => {
    const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
    console.log(`\n${icon} ${r.name}: ${r.message}`);
    if (r.details) {
      console.log(`   └─ ${r.details}`);
    }

    if (r.status === 'pass') passCount++;
    else if (r.status === 'fail') failCount++;
    else skipCount++;
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);

  // Recommendations
  if (failCount > 0) {
    console.log('\n📋 NEXT STEPS:');
    console.log('─'.repeat(40));

    results.filter(r => r.status === 'fail').forEach(r => {
      if (r.name.includes('Schema')) {
        console.log('\n1. Apply Supabase Schema:');
        console.log('   - Open Supabase Dashboard → SQL Editor');
        console.log('   - Run: buy-organics-online/supabase/customer-interactions-schema.sql');
      }
      if (r.name.includes('LiveChat')) {
        console.log('\n2. Set LiveChat Credentials:');
        console.log('   - Get PAT from: developers.livechat.com/console/tools/personal-access-tokens');
        console.log('   - Set BOO_LIVECHAT_PAT_BASE64 (base64 of accountId:token)');
      }
      if (r.name.includes('Email')) {
        console.log('\n3. Set Email Credentials:');
        console.log('   - Enable IMAP in G Suite Admin');
        console.log('   - Get app password from myaccount.google.com/apppasswords');
        console.log('   - Set BOO_SALES_IMAP_PASS');
      }
    });
  } else if (passCount === results.length) {
    console.log('\n🎉 All systems ready! You can now run:');
    console.log('   npx tsx sync-livechat-to-supabase.ts --full');
    console.log('   npx tsx sync-email-to-supabase.ts --full');
    console.log('   npx tsx analyze-customer-interactions.ts');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);
