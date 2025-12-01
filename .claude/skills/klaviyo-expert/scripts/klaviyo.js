#!/usr/bin/env node

/**
 * Klaviyo Multi-Account Wrapper Script
 *
 * Automatically loads credentials from vault and executes klaviyo-client.ts
 *
 * Usage:
 *   node klaviyo.js boo profiles --recent
 *   node klaviyo.js teelixir campaigns --list
 *   node klaviyo.js elevate flows --list
 *
 *   # Or use ACCOUNT env var
 *   ACCOUNT=boo node klaviyo.js profiles --recent
 */

const { spawn } = require('child_process');
const path = require('path');

// Load credentials module
const creds = require('../../../../creds');

const VALID_ACCOUNTS = ['boo', 'teelixir', 'elevate'];

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  Klaviyo Multi-Account Wrapper                                        ║
╚════════════════════════════════════════════════════════════════════════╝

Usage:
  node klaviyo.js <account> <command> [options]
  ACCOUNT=<account> node klaviyo.js <command> [options]

Accounts:
  boo      Buy Organics Online (40K+ subscribers)
  teelixir Teelixir (15K+ subscribers)
  elevate  Elevate Wholesale (3K+ subscribers, B2B)

Examples:
  node klaviyo.js boo profiles --recent
  node klaviyo.js teelixir campaigns --list
  node klaviyo.js elevate flows --list

  ACCOUNT=boo node klaviyo.js profiles --search test@example.com
  ACCOUNT=teelixir node klaviyo.js lists --list

This wrapper automatically loads credentials from the vault before executing.
`);
    process.exit(0);
  }

  // Determine account and command args
  let account = process.env.ACCOUNT;
  let commandArgs = args;

  // Check if first arg is an account name
  if (VALID_ACCOUNTS.includes(args[0])) {
    account = args[0];
    commandArgs = args.slice(1);
  }

  // Default to BOO if no account specified
  if (!account) {
    account = 'boo';
  }

  account = account.toLowerCase();

  if (!VALID_ACCOUNTS.includes(account)) {
    console.error(`\nError: Invalid account '${account}'`);
    console.error('Valid accounts: boo, teelixir, elevate\n');
    process.exit(1);
  }

  if (commandArgs.length === 0) {
    console.error('\nError: No command specified\n');
    console.error('Usage: node klaviyo.js <account> <command> [options]');
    console.error('Run with --help for more information\n');
    process.exit(1);
  }

  try {
    // Load credentials from vault
    console.log(`Loading credentials for ${account}...`);
    await creds.load(account);
    console.log(`✓ Credentials loaded\n`);

    // Execute klaviyo-client.ts with npx tsx
    const clientPath = path.join(__dirname, 'klaviyo-client.ts');

    const child = spawn('npx', ['tsx', clientPath, ...commandArgs], {
      env: { ...process.env, ACCOUNT: account },
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error(`\nError executing command: ${error.message}`);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();
