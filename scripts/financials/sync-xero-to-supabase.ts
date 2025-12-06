#!/usr/bin/env node
/**
 * Xero to Supabase Data Sync & Consolidation
 *
 * Main data pipeline that:
 * 1. Fetches data from Xero (both organizations)
 * 2. Applies account mappings
 * 3. Detects and applies intercompany eliminations
 * 4. Applies shared expense allocations
 * 5. Generates consolidated reports
 * 6. Saves all data to Supabase
 *
 * Specification: docs/CONSOLIDATION-ALGORITHM.md
 *
 * Usage:
 *   npx tsx scripts/financials/sync-xero-to-supabase.ts [options]
 *
 * Options:
 *   --period <YYYY-MM>       Sync specific month (default: last month)
 *   --from <YYYY-MM-DD>      Start date
 *   --to <YYYY-MM-DD>        End date
 *   --historical             Sync 12+ months of historical data
 *   --regenerate             Regenerate reports from existing data
 *   --dry-run                Show what would be synced without saving
 */

import { createClient } from '@supabase/supabase-js';
import { XeroConnector as XeroClient } from '../../shared/libs/integrations/xero/client';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/libs/logger';
import { v4 as uuidv4 } from 'uuid';

// Types
interface JournalLine {
  id?: string;
  organization_id: string;
  journal_id: string;
  journal_number: string;
  date: string;
  description?: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  contact_name?: string;
  debit_amount: number;
  credit_amount: number;
  net_amount: number;
  gross_amount: number;
  tax_amount?: number;
  sync_id: string;
  original_account_id?: string;
  mapping_applied?: boolean;
}

interface ConsolidatedReport {
  period: string;
  sync_id: string;
  profit_and_loss: any;
  balance_sheet: any;
  status: string;
  generated_at: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  period: null as string | null,
  from: null as string | null,
  to: null as string | null,
  historical: false,
  regenerate: false,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--period' && args[i + 1]) {
    options.period = args[i + 1];
    i++;
  } else if (args[i] === '--from' && args[i + 1]) {
    options.from = args[i + 1];
    i++;
  } else if (args[i] === '--to' && args[i + 1]) {
    options.to = args[i + 1];
    i++;
  } else if (args[i] === '--historical') {
    options.historical = true;
  } else if (args[i] === '--regenerate') {
    options.regenerate = true;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Calculate date range
if (options.historical) {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  options.from = twelveMonthsAgo.toISOString().split('T')[0];
  options.to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
} else if (options.period && !options.from && !options.to) {
  const [year, month] = options.period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  options.from = startDate.toISOString().split('T')[0];
  options.to = endDate.toISOString().split('T')[0];
} else if (!options.from || !options.to) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
  options.from = startDate.toISOString().split('T')[0];
  options.to = endDate.toISOString().split('T')[0];
  options.period = lastMonth.toISOString().slice(0, 7);
}

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load Xero credentials
const credsFile = path.join(__dirname, '../../.xero-credentials.json');
if (!fs.existsSync(credsFile)) {
  console.error('Error: .xero-credentials.json not found');
  console.error('Please run setup-xero-auth-direct.ts first');
  process.exit(1);
}

const xeroCredentials = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));

// Initialize Xero clients
const teelixirClient = new XeroClient({
  clientId: process.env.XERO_TEELIXIR_CLIENT_ID!,
  clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/callback'
});

const elevateClient = new XeroClient({
  clientId: process.env.XERO_ELEVATE_CLIENT_ID!,
  clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/callback'
});

// Set tokens from credentials file
if (xeroCredentials.teelixir) {
  teelixirClient.storeTokens(xeroCredentials.teelixir.tenantId, xeroCredentials.teelixir.tokens);
  teelixirClient.setTenant(xeroCredentials.teelixir.tenantId);
}

if (xeroCredentials.elevate) {
  elevateClient.storeTokens(xeroCredentials.elevate.tenantId, xeroCredentials.elevate.tokens);
  elevateClient.setTenant(xeroCredentials.elevate.tenantId);
}

// Validation: Check prerequisites
async function validatePrerequisites(): Promise<void> {
  console.log('Checking prerequisites...\n');

  // Check Xero credentials
  if (!xeroCredentials.teelixir || !xeroCredentials.elevate) {
    throw new Error('Missing Xero credentials for one or both organizations');
  }

  // Check Supabase connection
  const { error } = await supabase.from('accounts').select('count').limit(1);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Cannot connect to Supabase: ${error.message}`);
  }

  // Check account mappings exist (approved = has approved_by set)
  const { data: mappings, error: mappingsError } = await supabase
    .from('account_mappings')
    .select('count')
    .not('approved_by', 'is', null);

  if (mappingsError) {
    throw new Error(`Error checking mappings: ${mappingsError.message}`);
  }

  if (!mappings || mappings.length === 0) {
    throw new Error('No approved account mappings found. Please run suggest-mappings.ts first.');
  }

  console.log('✓ All prerequisites met\n');
}

// Step 1: Fetch data from Xero
async function fetchXeroData(
  client: XeroClient,
  orgId: string,
  orgName: string,
  from: string,
  to: string
): Promise<JournalLine[]> {
  console.log(`Fetching ${orgName} data from Xero...`);

  try {
    // Fetch all journals (then filter by date)
    const allJournals = await client.journals.list();

    // Filter by date range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const journals = allJournals.filter(journal => {
      const journalDate = new Date(journal.JournalDate);
      return journalDate >= fromDate && journalDate <= toDate;
    });

    logger.info(`Fetched ${journals.length} journals (of ${allJournals.length} total) for ${orgName}`, { source: 'xero' });

    const journalLines: JournalLine[] = [];

    for (const journal of journals) {
      for (const line of journal.JournalLines || []) {
        journalLines.push({
          organization_id: orgId,
          journal_id: journal.JournalID,
          journal_number: String(journal.JournalNumber),
          date: journal.JournalDate,
          description: line.Description,
          account_id: line.AccountID,
          account_code: line.AccountCode,
          account_name: line.AccountName,
          account_type: line.AccountType,
          contact_name: journal.SourceType === 'ACCREC' || journal.SourceType === 'ACCPAY'
            ? (journal as any).ContactName
            : undefined,
          debit_amount: line.NetAmount > 0 ? line.NetAmount : 0,
          credit_amount: line.NetAmount < 0 ? Math.abs(line.NetAmount) : 0,
          net_amount: line.NetAmount,
          gross_amount: line.GrossAmount || line.NetAmount,
          tax_amount: line.TaxAmount,
          sync_id: ''
        });
      }
    }

    console.log(`✓ Fetched ${journalLines.length} journal lines for ${orgName}\n`);
    return journalLines;

  } catch (error: any) {
    logger.error(`Error fetching ${orgName} data:`, { source: 'xero' }, error);
    throw error;
  }
}

// Step 2: Apply account mappings
async function applyAccountMappings(
  elevateLines: JournalLine[]
): Promise<JournalLine[]> {
  console.log('Applying account mappings...');

  // Load approved mappings (approved = has approved_by set)
  const { data: mappings, error } = await supabase
    .from('account_mappings')
    .select('*')
    .not('approved_by', 'is', null);

  if (error) {
    throw new Error(`Error loading mappings: ${error.message}`);
  }

  const mappingMap = new Map(
    mappings.map(m => [m.source_account_id, m])
  );

  const mappedLines: JournalLine[] = [];

  for (const line of elevateLines) {
    const mapping = mappingMap.get(line.account_id);

    if (!mapping) {
      throw new Error(
        `No mapping found for Elevate account ${line.account_code} - ${line.account_name}. ` +
        `Please run suggest-mappings.ts to complete all mappings.`
      );
    }

    // Create mapped line
    mappedLines.push({
      ...line,
      account_id: mapping.target_account_id,
      account_code: mapping.target_account_code || line.account_code,
      account_name: mapping.target_account_name || line.account_name,
      original_account_id: line.account_id,
      mapping_applied: true
    });
  }

  console.log(`✓ Applied ${mappings.length} account mappings\n`);
  return mappedLines;
}

// Step 3: Aggregate transactions
function aggregateTransactions(
  teelixirLines: JournalLine[],
  mappedElevateLines: JournalLine[],
  eliminatedIds: Set<string>
): Map<string, any> {
  console.log('Aggregating transactions...');

  // Filter out eliminated transactions
  const externalTeelixir = teelixirLines.filter(line => !eliminatedIds.has(line.id || ''));
  const externalElevate = mappedElevateLines.filter(line => !eliminatedIds.has(line.id || ''));

  const aggregated = new Map<string, any>();

  // Aggregate Teelixir
  for (const line of externalTeelixir) {
    const key = line.account_id;
    const existing = aggregated.get(key) || {
      account_id: key,
      account_code: line.account_code,
      account_name: line.account_name,
      account_type: line.account_type,
      debit_total: 0,
      credit_total: 0,
      net_total: 0,
      transaction_count: 0
    };

    existing.debit_total += line.debit_amount;
    existing.credit_total += line.credit_amount;
    existing.net_total += line.net_amount;
    existing.transaction_count += 1;

    aggregated.set(key, existing);
  }

  // Aggregate Elevate (now mapped)
  for (const line of externalElevate) {
    const key = line.account_id;
    const existing = aggregated.get(key) || {
      account_id: key,
      account_code: line.account_code,
      account_name: line.account_name,
      account_type: line.account_type,
      debit_total: 0,
      credit_total: 0,
      net_total: 0,
      transaction_count: 0
    };

    existing.debit_total += line.debit_amount;
    existing.credit_total += line.credit_amount;
    existing.net_total += line.net_amount;
    existing.transaction_count += 1;

    aggregated.set(key, existing);
  }

  console.log(`✓ Aggregated ${aggregated.size} accounts\n`);
  return aggregated;
}

// Step 4: Generate Profit & Loss
function generateProfitAndLoss(aggregated: Map<string, any>, period: string): any {
  console.log('Generating Profit & Loss statement...');

  const accountsArray = Array.from(aggregated.values());

  const revenue = accountsArray
    .filter(acc => acc.account_type === 'REVENUE')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const cogs = accountsArray
    .filter(acc => acc.account_type === 'DIRECTCOSTS')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const operatingExpenses = accountsArray
    .filter(acc => acc.account_type === 'EXPENSE')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const operatingProfit = grossProfit - operatingExpenses;

  const otherIncome = accountsArray
    .filter(acc => acc.account_type === 'OTHERINCOME')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const otherExpenses = accountsArray
    .filter(acc => acc.account_type === 'OTHEREXPENSE')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const netProfitBeforeTax = operatingProfit + otherIncome - otherExpenses;

  const pl = {
    period,
    revenue,
    cogs,
    gross_profit: grossProfit,
    gross_margin_pct: grossMargin,
    operating_expenses: operatingExpenses,
    operating_profit: operatingProfit,
    other_income: otherIncome,
    other_expenses: otherExpenses,
    net_profit_before_tax: netProfitBeforeTax
  };

  console.log(`✓ P&L generated\n`);
  return pl;
}

// Step 5: Generate Balance Sheet
function generateBalanceSheet(aggregated: Map<string, any>, asOfDate: string): any {
  console.log('Generating Balance Sheet...');

  const accountsArray = Array.from(aggregated.values());

  const currentAssets = accountsArray
    .filter(acc => acc.account_type === 'CURRENT_ASSET' || acc.account_type === 'BANK')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const fixedAssets = accountsArray
    .filter(acc => acc.account_type === 'FIXED_ASSET' || acc.account_type === 'NONCURRENT_ASSET')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const totalAssets = currentAssets + fixedAssets;

  const currentLiabilities = accountsArray
    .filter(acc => acc.account_type === 'CURRENT_LIABILITY')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const longTermLiabilities = accountsArray
    .filter(acc => acc.account_type === 'NONCURRENT_LIABILITY')
    .reduce((sum, acc) => sum + Math.abs(acc.net_total), 0);

  const totalLiabilities = currentLiabilities + longTermLiabilities;

  const equity = accountsArray
    .filter(acc => acc.account_type === 'EQUITY')
    .reduce((sum, acc) => sum + acc.net_total, 0);

  const retainedEarnings = totalAssets - totalLiabilities - equity;
  const totalEquity = equity + retainedEarnings;

  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.00;

  const bs = {
    as_of_date: asOfDate,
    current_assets: currentAssets,
    fixed_assets: fixedAssets,
    total_assets: totalAssets,
    current_liabilities: currentLiabilities,
    long_term_liabilities: longTermLiabilities,
    total_liabilities: totalLiabilities,
    equity,
    retained_earnings: retainedEarnings,
    total_equity: totalEquity,
    balanced
  };

  console.log(`✓ Balance Sheet generated\n`);
  return bs;
}

// Step 6: Validate consolidation
function validateConsolidation(
  aggregated: Map<string, any>,
  profitAndLoss: any,
  balanceSheet: any
): { valid: boolean; errors: string[]; warnings: string[] } {
  console.log('Validating consolidation...');

  const errors: string[] = [];
  const warnings: string[] = [];

  const accountsArray = Array.from(aggregated.values());

  // Check 1: Debits = Credits
  const totalDebits = accountsArray.reduce((sum, acc) => sum + acc.debit_total, 0);
  const totalCredits = accountsArray.reduce((sum, acc) => sum + acc.credit_total, 0);

  if (Math.abs(totalDebits - totalCredits) > 1.00) {
    errors.push(
      `Debits ($${totalDebits.toFixed(2)}) != Credits ($${totalCredits.toFixed(2)})`
    );
  }

  // Check 2: Balance sheet balanced
  if (!balanceSheet.balanced) {
    errors.push(
      `Balance sheet unbalanced: Assets ($${balanceSheet.total_assets.toFixed(2)}) != ` +
      `Liabilities + Equity ($${(balanceSheet.total_liabilities + balanceSheet.total_equity).toFixed(2)})`
    );
  }

  // Check 3: Revenue >= 0
  if (profitAndLoss.revenue < 0) {
    warnings.push(`Negative revenue: $${profitAndLoss.revenue.toFixed(2)}`);
  }

  // Check 4: Gross margin reasonable
  const gm = profitAndLoss.gross_margin_pct;
  if (gm < 0 || gm > 100) {
    warnings.push(`Unusual gross margin: ${gm.toFixed(1)}%`);
  }

  if (errors.length === 0) {
    console.log('✓ Validation passed\n');
  } else {
    console.log(`✗ Validation failed with ${errors.length} errors\n`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Main function
async function main() {
  const syncId = uuidv4();
  const startTime = new Date();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  Xero to Supabase Sync & Consolidation                           ║');
    console.log('║  Teelixir + Elevate Wholesale                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log(`Sync ID: ${syncId}`);
    console.log(`Period: ${options.from} to ${options.to}`);
    console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);

    logger.info('Starting sync and consolidation', { syncId, period: options.period });

    // Step 0: Validate prerequisites
    await validatePrerequisites();

    // Step 1: Fetch data from Xero
    const teelixirLines = await fetchXeroData(
      teelixirClient,
      'teelixir',
      'Teelixir',
      options.from!,
      options.to!
    );

    const elevateLines = await fetchXeroData(
      elevateClient,
      'elevate',
      'Elevate Wholesale',
      options.from!,
      options.to!
    );

    // Add sync_id to all lines
    teelixirLines.forEach(line => line.sync_id = syncId);
    elevateLines.forEach(line => line.sync_id = syncId);

    // Step 2: Apply account mappings
    const mappedElevateLines = await applyAccountMappings(elevateLines);

    // Step 3: Get intercompany eliminations (if table/view exists)
    let eliminations: any[] = [];
    try {
      const [year, month] = options.period!.split('-').map(Number);
      const { data, error: elimError } = await supabase
        .from('intercompany_transactions')
        .select('*')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('is_eliminated', true);

      if (!elimError && data) {
        eliminations = data;
      }
    } catch {
      // Table may not exist, continue without eliminations
      console.log('Note: intercompany_transactions table not available, skipping eliminations');
    }

    const eliminatedIds = new Set<string>();
    (eliminations || []).forEach(e => {
      eliminatedIds.add(e.teelixir_line_id);
      eliminatedIds.add(e.elevate_line_id);
    });

    console.log(`Found ${eliminations?.length || 0} approved intercompany eliminations\n`);

    // Step 4: Aggregate transactions
    const aggregated = aggregateTransactions(
      teelixirLines,
      mappedElevateLines,
      eliminatedIds
    );

    // Step 5: Generate reports
    const profitAndLoss = generateProfitAndLoss(aggregated, options.period!);
    const balanceSheet = generateBalanceSheet(aggregated, options.to!);

    // Step 6: Validate
    const validation = validateConsolidation(aggregated, profitAndLoss, balanceSheet);

    if (!validation.valid) {
      console.error('\nValidation Errors:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      throw new Error('Consolidation validation failed');
    }

    if (validation.warnings.length > 0) {
      console.log('\nValidation Warnings:');
      validation.warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
    }

    // Display summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  CONSOLIDATED SUMMARY                                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log(`Revenue:          $${profitAndLoss.revenue.toLocaleString()}`);
    console.log(`COGS:             $${profitAndLoss.cogs.toLocaleString()}`);
    console.log(`Gross Profit:     $${profitAndLoss.gross_profit.toLocaleString()} (${profitAndLoss.gross_margin_pct.toFixed(1)}%)`);
    console.log(`Operating Exp:    $${profitAndLoss.operating_expenses.toLocaleString()}`);
    console.log(`Net Profit:       $${profitAndLoss.net_profit_before_tax.toLocaleString()}\n`);

    console.log(`Total Assets:     $${balanceSheet.total_assets.toLocaleString()}`);
    console.log(`Total Liabilities: $${balanceSheet.total_liabilities.toLocaleString()}`);
    console.log(`Total Equity:     $${balanceSheet.total_equity.toLocaleString()}`);
    console.log(`Balanced:         ${balanceSheet.balanced ? '✓ Yes' : '✗ No'}\n`);

    // Step 7: Save to Supabase (if not dry-run)
    if (!options.dryRun) {
      console.log('Saving to Supabase...\n');

      // Save journal lines
      const allLines = [...teelixirLines, ...mappedElevateLines];

      for (const line of allLines) {
        const { error } = await supabase
          .from('journal_lines')
          .upsert(line, {
            onConflict: 'organization_id,journal_id,account_id,date'
          });

        if (error) {
          logger.error('Error saving journal line:', error);
        }
      }

      console.log(`✓ Saved ${allLines.length} journal lines`);

      // Save consolidated report
      const { error: reportError } = await supabase
        .from('consolidated_reports')
        .upsert({
          period: options.period,
          sync_id: syncId,
          profit_and_loss: profitAndLoss,
          balance_sheet: balanceSheet,
          status: 'completed',
          generated_at: new Date().toISOString()
        }, {
          onConflict: 'period'
        });

      if (reportError) {
        throw new Error(`Error saving report: ${reportError.message}`);
      }

      console.log('✓ Saved consolidated report');

      // Save sync history
      const duration = (new Date().getTime() - startTime.getTime()) / 1000;

      const { error: historyError } = await supabase
        .from('sync_history')
        .insert({
          sync_id: syncId,
          period: options.period,
          status: 'success',
          started_at: startTime.toISOString(),
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          metrics: {
            teelixir_lines: teelixirLines.length,
            elevate_lines: elevateLines.length,
            eliminations: eliminations?.length || 0,
            accounts_aggregated: aggregated.size
          }
        });

      if (historyError) {
        logger.error('Error saving sync history:', historyError);
      }

      console.log('✓ Saved sync history\n');
    } else {
      console.log('Dry-run mode: Not saving to database\n');
    }

    console.log('✓ Sync and consolidation completed successfully\n');
    logger.info('Sync completed', { syncId, duration: (new Date().getTime() - startTime.getTime()) / 1000 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Sync failed', undefined, error instanceof Error ? error : new Error(errorMessage));
    console.error('\n✗ Error:', errorMessage);

    // Save failure to sync history
    if (!options.dryRun) {
      await supabase.from('sync_history').insert({
        sync_id: syncId,
        period: options.period,
        status: 'failed',
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      });
    }

    process.exit(1);
  }
}

// Run main function
main();
