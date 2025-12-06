#!/usr/bin/env node
/**
 * Intercompany Transaction Detector
 *
 * Identifies transactions between Teelixir and Elevate Wholesale that require
 * elimination in consolidated financial statements.
 *
 * Specification: docs/PHASE-4-DETAILED-SPEC.md Part 2
 *
 * Usage:
 *   npx tsx scripts/financials/detect-intercompany.ts [options]
 *
 * Options:
 *   --period <YYYY-MM>       Analyze specific month (default: last month)
 *   --from <YYYY-MM-DD>      Start date
 *   --to <YYYY-MM-DD>        End date
 *   --threshold <number>     Match confidence threshold (default: 80)
 *   --export <file>          Export detections to JSON
 *   --dry-run                Show detections without saving
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { logger } from '../../shared/libs/logger';

// Types
interface JournalLine {
  id: string;
  organization_id: string;
  journal_id: string;
  date: Date;
  description?: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  contact_name?: string;
  net_amount: number;
  gross_amount: number;
  tax_amount?: number;
}

interface IntercompanyMatch {
  teelixir_transaction_id: string;
  elevate_transaction_id: string;
  match_type: 'revenue_cogs' | 'payable_receivable' | 'expense_allocation';
  confidence_score: number;
  amount_teelixir: number;
  amount_elevate: number;
  date_teelixir: Date;
  date_elevate: Date;
  elimination_amount: number;
  notes: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  period: null as string | null,
  from: null as string | null,
  to: null as string | null,
  threshold: 80,
  exportFile: null as string | null,
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
  } else if (args[i] === '--threshold' && args[i + 1]) {
    options.threshold = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--export' && args[i + 1]) {
    options.exportFile = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Calculate date range
if (options.period && !options.from && !options.to) {
  const [year, month] = options.period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  options.from = startDate.toISOString().split('T')[0];
  options.to = endDate.toISOString().split('T')[0];
} else if (!options.from || !options.to) {
  // Default to last month
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
  options.from = startDate.toISOString().split('T')[0];
  options.to = endDate.toISOString().split('T')[0];
  options.period = lastMonth.toISOString().slice(0, 7);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility: Calculate string similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').toLowerCase();
  const s2 = (str2 || '').toLowerCase();

  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter.charAt(i))) {
      matches++;
    }
  }

  return matches / longer.length;
}

// Calculate match confidence score (0-100)
function calculateMatchConfidence(txn1: JournalLine, txn2: JournalLine): number {
  let score = 0;

  // Amount matching (40 points)
  const amount1 = Math.abs(txn1.net_amount);
  const amount2 = Math.abs(txn2.net_amount);
  const amountDiff = Math.abs(amount1 - amount2);
  const amountTolerance = amount1 * 0.02; // 2% tolerance

  if (amountDiff === 0) {
    score += 40;
  } else if (amountDiff <= amountTolerance) {
    score += 30;
  } else if (amountDiff <= amountTolerance * 2) {
    score += 20;
  }

  // Date proximity (30 points)
  const date1 = new Date(txn1.date);
  const date2 = new Date(txn2.date);
  const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    score += 30;
  } else if (daysDiff <= 3) {
    score += 25;
  } else if (daysDiff <= 7) {
    score += 20;
  } else if (daysDiff <= 14) {
    score += 10;
  }

  // Description similarity (20 points)
  const desc1 = txn1.description || '';
  const desc2 = txn2.description || '';

  // Check for entity names in descriptions
  const desc1Lower = desc1.toLowerCase();
  const desc2Lower = desc2.toLowerCase();

  if (desc1Lower.includes('elevate') || desc1Lower.includes('wholesale')) {
    score += 10;
  }
  if (desc2Lower.includes('teelixir')) {
    score += 10;
  }

  // Check contact names
  const contact1 = (txn1.contact_name || '').toLowerCase();
  const contact2 = (txn2.contact_name || '').toLowerCase();

  if (contact1.includes('elevate') || contact1.includes('wholesale')) {
    score += 5;
  }
  if (contact2.includes('teelixir')) {
    score += 5;
  }

  // Expected account types (10 points)
  const validPairs = [
    ['REVENUE', 'DIRECTCOSTS'],
    ['CURRENT_ASSET', 'CURRENT_LIABILITY'],
    ['EXPENSE', 'EXPENSE']
  ];

  const isValidPair = validPairs.some(([type1, type2]) =>
    (txn1.account_type === type1 && txn2.account_type === type2) ||
    (txn1.account_type === type2 && txn2.account_type === type1)
  );

  if (isValidPair) {
    score += 10;
  }

  return Math.min(score, 100);
}

// Detect revenue/COGS pairs
async function detectRevenueCogsPairs(
  teelixirTxns: JournalLine[],
  elevateTxns: JournalLine[],
  threshold: number
): Promise<IntercompanyMatch[]> {
  const matches: IntercompanyMatch[] = [];

  // Filter for Teelixir sales to Elevate
  const teelixirSales = teelixirTxns.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    const contact = (txn.contact_name || '').toLowerCase();
    return txn.account_type === 'REVENUE' &&
      (desc.includes('elevate') || desc.includes('wholesale') ||
       contact.includes('elevate') || contact.includes('wholesale'));
  });

  // Filter for Elevate COGS from Teelixir
  const elevateCOGS = elevateTxns.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    const contact = (txn.contact_name || '').toLowerCase();
    return txn.account_type === 'DIRECTCOSTS' &&
      (desc.includes('teelixir') || contact.includes('teelixir'));
  });

  logger.info(`Found ${teelixirSales.length} potential Teelixir sales to Elevate`);
  logger.info(`Found ${elevateCOGS.length} potential Elevate COGS from Teelixir`);

  // Match transactions
  for (const sale of teelixirSales) {
    for (const cogs of elevateCOGS) {
      const confidence = calculateMatchConfidence(sale, cogs);

      if (confidence >= threshold) {
        matches.push({
          teelixir_transaction_id: sale.id,
          elevate_transaction_id: cogs.id,
          match_type: 'revenue_cogs',
          confidence_score: confidence,
          amount_teelixir: Math.abs(sale.net_amount),
          amount_elevate: Math.abs(cogs.net_amount),
          date_teelixir: sale.date,
          date_elevate: cogs.date,
          elimination_amount: Math.min(
            Math.abs(sale.net_amount),
            Math.abs(cogs.net_amount)
          ),
          notes: `Revenue/COGS elimination: ${sale.description || 'N/A'}`
        });
      }
    }
  }

  return matches;
}

// Detect payable/receivable pairs
async function detectPayableReceivablePairs(
  teelixirTxns: JournalLine[],
  elevateTxns: JournalLine[],
  threshold: number
): Promise<IntercompanyMatch[]> {
  const matches: IntercompanyMatch[] = [];

  // Filter for Teelixir receivables from Elevate
  const teelixirReceivables = teelixirTxns.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    const contact = (txn.contact_name || '').toLowerCase();
    return txn.account_type === 'CURRENT_ASSET' &&
      (txn.account_name.toLowerCase().includes('receivable') ||
       txn.account_code.includes('1200')) &&
      (desc.includes('elevate') || contact.includes('elevate'));
  });

  // Filter for Elevate payables to Teelixir
  const elevatePayables = elevateTxns.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    const contact = (txn.contact_name || '').toLowerCase();
    return txn.account_type === 'CURRENT_LIABILITY' &&
      (txn.account_name.toLowerCase().includes('payable') ||
       txn.account_code.includes('2000')) &&
      (desc.includes('teelixir') || contact.includes('teelixir'));
  });

  logger.info(`Found ${teelixirReceivables.length} potential Teelixir receivables from Elevate`);
  logger.info(`Found ${elevatePayables.length} potential Elevate payables to Teelixir`);

  // Match transactions
  for (const receivable of teelixirReceivables) {
    for (const payable of elevatePayables) {
      const confidence = calculateMatchConfidence(receivable, payable);

      if (confidence >= threshold) {
        matches.push({
          teelixir_transaction_id: receivable.id,
          elevate_transaction_id: payable.id,
          match_type: 'payable_receivable',
          confidence_score: confidence,
          amount_teelixir: Math.abs(receivable.net_amount),
          amount_elevate: Math.abs(payable.net_amount),
          date_teelixir: receivable.date,
          date_elevate: payable.date,
          elimination_amount: Math.min(
            Math.abs(receivable.net_amount),
            Math.abs(payable.net_amount)
          ),
          notes: `Payable/Receivable elimination: ${receivable.description || 'N/A'}`
        });
      }
    }
  }

  return matches;
}

// Display match for review
function displayMatch(match: IntercompanyMatch, index: number, total: number) {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  MATCH #${index} - ${match.match_type.toUpperCase().replace('_', '/')} ELIMINATION`.padEnd(68) + '║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                   ║');
  console.log('║  TEELIXIR:                                                        ║');
  console.log(`║  Date:    ${new Date(match.date_teelixir).toISOString().split('T')[0].padEnd(58)}║`);
  console.log(`║  Amount:  $${match.amount_teelixir.toFixed(2).padEnd(56)}║`);
  console.log('║                                                                   ║');
  console.log('║  ────────────────────────────────────────────────────────────    ║');
  console.log('║                                                                   ║');
  console.log('║  ELEVATE:                                                         ║');
  console.log(`║  Date:    ${new Date(match.date_elevate).toISOString().split('T')[0].padEnd(58)}║`);
  console.log(`║  Amount:  $${match.amount_elevate.toFixed(2).padEnd(56)}║`);
  console.log('║                                                                   ║');
  console.log('║  ────────────────────────────────────────────────────────────    ║');
  console.log('║                                                                   ║');

  // Confidence breakdown
  const barLength = Math.round(match.confidence_score / 5);
  const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
  console.log(`║  CONFIDENCE: ${bar} ${match.confidence_score}%`.padEnd(68) + '║');
  console.log(`║  ELIMINATION: $${match.elimination_amount.toFixed(2).padEnd(53)}║`);
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
}

// Main function
async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  Intercompany Transaction Detector                                ║');
    console.log('║  Teelixir + Elevate Wholesale Consolidated Financials            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    logger.info('Starting intercompany detection process');
    logger.info(`Period: ${options.from} to ${options.to}`);
    logger.info(`Confidence threshold: ${options.threshold}%`);

    // Load journal lines from Supabase
    console.log('Loading journal lines from Supabase...\n');

    const { data: teelixirLines, error: teelixirError } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('organization_id', 'teelixir')
      .gte('date', options.from)
      .lte('date', options.to);

    if (teelixirError) {
      throw new Error(`Error loading Teelixir data: ${teelixirError.message}`);
    }

    const { data: elevateLines, error: elevateError } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('organization_id', 'elevate')
      .gte('date', options.from)
      .lte('date', options.to);

    if (elevateError) {
      throw new Error(`Error loading Elevate data: ${elevateError.message}`);
    }

    console.log(`Loaded ${teelixirLines?.length || 0} Teelixir journal lines`);
    console.log(`Loaded ${elevateLines?.length || 0} Elevate journal lines\n`);

    if (!teelixirLines?.length || !elevateLines?.length) {
      console.log('No data found for the specified period.');
      console.log('Please run sync-xero-to-supabase.ts first.');
      return;
    }

    // Detect intercompany transactions
    console.log('Detecting intercompany transactions...\n');

    const revenueCogsPairs = await detectRevenueCogsPairs(
      teelixirLines,
      elevateLines,
      options.threshold
    );

    const payableReceivablePairs = await detectPayableReceivablePairs(
      teelixirLines,
      elevateLines,
      options.threshold
    );

    const allMatches = [...revenueCogsPairs, ...payableReceivablePairs];

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log(`│  Intercompany Detection Results - ${options.period || `${options.from} to ${options.to}`}`.padEnd(70) + '│');
    console.log(`│  Found: ${allMatches.length} matches (threshold: ${options.threshold}%)`.padEnd(70) + '│');
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    // Statistics
    const avgConfidence = allMatches.length > 0
      ? allMatches.reduce((sum, m) => sum + m.confidence_score, 0) / allMatches.length
      : 0;

    const totalElimination = allMatches.reduce((sum, m) => sum + m.elimination_amount, 0);

    console.log('Match Statistics:');
    console.log(`  Revenue/COGS pairs:       ${revenueCogsPairs.length}`);
    console.log(`  Payable/Receivable pairs: ${payableReceivablePairs.length}`);
    console.log(`  Average confidence:       ${avgConfidence.toFixed(1)}%`);
    console.log(`  Total elimination amount: $${totalElimination.toFixed(2)}\n`);

    // Display matches
    if (allMatches.length > 0) {
      console.log('Detected Matches:\n');

      for (let i = 0; i < allMatches.length; i++) {
        displayMatch(allMatches[i], i + 1, allMatches.length);
      }
    }

    // Export if requested
    if (options.exportFile) {
      fs.writeFileSync(options.exportFile, JSON.stringify(allMatches, null, 2));
      console.log(`\n✓ Exported ${allMatches.length} detections to ${options.exportFile}\n`);
    }

    // Save to Supabase if not dry-run
    if (!options.dryRun && allMatches.length > 0) {
      console.log('Saving detections to Supabase...\n');

      for (const match of allMatches) {
        const { error } = await supabase
          .from('intercompany_eliminations')
          .upsert({
            period: options.period,
            teelixir_line_id: match.teelixir_transaction_id,
            elevate_line_id: match.elevate_transaction_id,
            match_type: match.match_type,
            confidence_score: match.confidence_score,
            elimination_amount: match.elimination_amount,
            approval_status: 'pending',
            notes: match.notes
          }, {
            onConflict: 'teelixir_line_id,elevate_line_id'
          });

        if (error) {
          logger.error(`Error saving detection: ${error.message}`);
        }
      }

      console.log('✓ Detections saved successfully\n');
    } else if (options.dryRun) {
      console.log('Dry-run mode: Not saving to database\n');
    }

    logger.info('Intercompany detection process completed');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in intercompany detection:', error);
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

// Run main function
main();
