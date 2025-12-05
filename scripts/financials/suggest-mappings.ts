#!/usr/bin/env node
/**
 * Account Mapping Suggester
 *
 * Interactive CLI tool to review and approve AI-suggested account mappings
 * from Elevate Wholesale to Teelixir chart of accounts.
 *
 * Specification: docs/PHASE-4-DETAILED-SPEC.md Part 1
 *
 * Usage:
 *   npx tsx scripts/financials/suggest-mappings.ts [options]
 *
 * Options:
 *   --auto-approve-threshold <number>  Auto-approve confidence >= threshold (default: 95)
 *   --show-all                         Show all mappings including approved
 *   --export <file>                    Export mappings to JSON file
 *   --import <file>                    Import pre-approved mappings
 *   --review-only                      Show suggestions without saving
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../shared/libs/logger';

// Types
interface Account {
  id: string;
  account_id: string;
  code: string;
  name: string;
  type: string;
  class?: string;
  status: string;
  organization_id: string;
}

interface AccountMapping {
  elevate_account_id: string;
  elevate_account_code: string;
  elevate_account_name: string;
  teelixir_account_id: string;
  teelixir_account_code: string;
  teelixir_account_name: string;
  confidence_score: number;
  mapping_strategy: string;
  notes: string;
}

interface MappingSuggestion extends AccountMapping {
  approved?: boolean;
  approved_by?: string;
  approved_at?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  autoApproveThreshold: 95,
  showAll: false,
  exportFile: null as string | null,
  importFile: null as string | null,
  reviewOnly: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--auto-approve-threshold' && args[i + 1]) {
    options.autoApproveThreshold = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--show-all') {
    options.showAll = true;
  } else if (args[i] === '--export' && args[i + 1]) {
    options.exportFile = args[i + 1];
    i++;
  } else if (args[i] === '--import' && args[i + 1]) {
    options.importFile = args[i + 1];
    i++;
  } else if (args[i] === '--review-only') {
    options.reviewOnly = true;
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility: Calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Utility: Calculate string similarity (0-1)
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Main mapping suggestion algorithm
function suggestMappings(
  elevateAccounts: Account[],
  teelixirAccounts: Account[]
): AccountMapping[] {
  const mappings: AccountMapping[] = [];

  for (const elevateAcc of elevateAccounts) {
    // Skip inactive accounts
    if (elevateAcc.status !== 'ACTIVE') continue;

    // STRATEGY 1: Exact Code Match (Confidence: 98%)
    const exactCodeMatch = teelixirAccounts.find(
      t => t.code === elevateAcc.code && t.type === elevateAcc.type && t.status === 'ACTIVE'
    );

    if (exactCodeMatch) {
      mappings.push({
        elevate_account_id: elevateAcc.account_id,
        elevate_account_code: elevateAcc.code,
        elevate_account_name: elevateAcc.name,
        teelixir_account_id: exactCodeMatch.account_id,
        teelixir_account_code: exactCodeMatch.code,
        teelixir_account_name: exactCodeMatch.name,
        confidence_score: 98,
        mapping_strategy: 'exact_code_match',
        notes: `Code ${elevateAcc.code} matches exactly`
      });
      continue;
    }

    // STRATEGY 2: Exact Name Match (Confidence: 95%)
    const exactNameMatch = teelixirAccounts.find(
      t => t.name.toLowerCase() === elevateAcc.name.toLowerCase()
        && t.type === elevateAcc.type
        && t.status === 'ACTIVE'
    );

    if (exactNameMatch) {
      mappings.push({
        elevate_account_id: elevateAcc.account_id,
        elevate_account_code: elevateAcc.code,
        elevate_account_name: elevateAcc.name,
        teelixir_account_id: exactNameMatch.account_id,
        teelixir_account_code: exactNameMatch.code,
        teelixir_account_name: exactNameMatch.name,
        confidence_score: 95,
        mapping_strategy: 'exact_name_match',
        notes: `Name "${elevateAcc.name}" matches exactly`
      });
      continue;
    }

    // STRATEGY 3: Similar Name + Same Type (Confidence: 70-85%)
    const similarNames = teelixirAccounts
      .filter(t => t.type === elevateAcc.type && t.status === 'ACTIVE')
      .map(t => ({
        account: t,
        similarity: calculateStringSimilarity(elevateAcc.name, t.name)
      }))
      .filter(result => result.similarity >= 0.7)
      .sort((a, b) => b.similarity - a.similarity);

    if (similarNames.length > 0) {
      const best = similarNames[0];
      mappings.push({
        elevate_account_id: elevateAcc.account_id,
        elevate_account_code: elevateAcc.code,
        elevate_account_name: elevateAcc.name,
        teelixir_account_id: best.account.account_id,
        teelixir_account_code: best.account.code,
        teelixir_account_name: best.account.name,
        confidence_score: Math.round(best.similarity * 85),
        mapping_strategy: 'similar_name_match',
        notes: `"${elevateAcc.name}" similar to "${best.account.name}" (${Math.round(best.similarity * 100)}% match)`
      });
      continue;
    }

    // STRATEGY 4: Same Type + Class (Confidence: 50%)
    if (elevateAcc.class) {
      const sameTypeClass = teelixirAccounts.find(
        t => t.type === elevateAcc.type && t.class === elevateAcc.class && t.status === 'ACTIVE'
      );

      if (sameTypeClass) {
        mappings.push({
          elevate_account_id: elevateAcc.account_id,
          elevate_account_code: elevateAcc.code,
          elevate_account_name: elevateAcc.name,
          teelixir_account_id: sameTypeClass.account_id,
          teelixir_account_code: sameTypeClass.code,
          teelixir_account_name: sameTypeClass.name,
          confidence_score: 50,
          mapping_strategy: 'type_class_match',
          notes: `Same type (${elevateAcc.type}) and class (${elevateAcc.class})`
        });
        continue;
      }
    }

    // STRATEGY 5: No Match Found (Confidence: 0%)
    mappings.push({
      elevate_account_id: elevateAcc.account_id,
      elevate_account_code: elevateAcc.code,
      elevate_account_name: elevateAcc.name,
      teelixir_account_id: '',
      teelixir_account_code: '',
      teelixir_account_name: '',
      confidence_score: 0,
      mapping_strategy: 'no_match',
      notes: 'No automatic mapping found - requires manual review'
    });
  }

  return mappings;
}

// Display mapping suggestion
function displayMapping(mapping: AccountMapping, index: number, total: number) {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log(`│  Account Mapping Review - Elevate Wholesale → Teelixir             │`);
  console.log(`│  Progress: ${index}/${total} accounts reviewed (${Math.round((index / total) * 100)}%)                          │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘\n');

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  MAPPING SUGGESTION #${index}`.padEnd(69) + '║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                   ║');
  console.log('║  SOURCE (Elevate Wholesale):                                     ║');
  console.log(`║  Code:  ${mapping.elevate_account_code.padEnd(60)}║`);
  console.log(`║  Name:  ${mapping.elevate_account_name.substring(0, 56).padEnd(60)}║`);
  console.log('║                                                                   ║');
  console.log('║  ────────────────────────────────────────────────────────────    ║');
  console.log('║                                                                   ║');

  if (mapping.teelixir_account_id) {
    console.log('║  SUGGESTED TARGET (Teelixir):                                    ║');
    console.log(`║  Code:  ${mapping.teelixir_account_code.padEnd(60)}║`);
    console.log(`║  Name:  ${mapping.teelixir_account_name.substring(0, 56).padEnd(60)}║`);
    console.log('║                                                                   ║');
    console.log('║  ────────────────────────────────────────────────────────────    ║');
    console.log('║                                                                   ║');

    const barLength = Math.round(mapping.confidence_score / 5);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`║  CONFIDENCE: ${bar} ${mapping.confidence_score}% (${mapping.mapping_strategy})`.padEnd(68) + '║');
    console.log(`║  REASON: ${mapping.notes.substring(0, 56).padEnd(60)}║`);
  } else {
    console.log('║  NO TARGET FOUND                                                 ║');
    console.log('║  Requires manual mapping                                         ║');
  }

  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
}

// Prompt user for decision
function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Manual mapping selection
async function manualMapping(
  elevateAccount: Account,
  teelixirAccounts: Account[]
): Promise<AccountMapping | null> {
  console.log('\n\n=== MANUAL MAPPING ===\n');
  console.log(`Elevate Account: [${elevateAccount.code}] ${elevateAccount.name} (${elevateAccount.type})\n`);

  // Filter to same type
  const sameTypeAccounts = teelixirAccounts.filter(
    t => t.type === elevateAccount.type && t.status === 'ACTIVE'
  );

  console.log(`Available Teelixir accounts (Type: ${elevateAccount.type}):\n`);

  sameTypeAccounts.forEach((acc, idx) => {
    console.log(`${idx + 1}. [${acc.code}] ${acc.name}`);
  });

  console.log('\nEnter account number (or "c" to cancel):');

  const choice = await promptUser('Your choice: ');

  if (choice === 'c') {
    return null;
  }

  const choiceNum = parseInt(choice);
  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > sameTypeAccounts.length) {
    console.log('Invalid choice. Cancelling.');
    return null;
  }

  const selected = sameTypeAccounts[choiceNum - 1];

  return {
    elevate_account_id: elevateAccount.account_id,
    elevate_account_code: elevateAccount.code,
    elevate_account_name: elevateAccount.name,
    teelixir_account_id: selected.account_id,
    teelixir_account_code: selected.code,
    teelixir_account_name: selected.name,
    confidence_score: 100,
    mapping_strategy: 'manual_selection',
    notes: 'Manually selected by user'
  };
}

// Main function
async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  Account Mapping Suggester                                        ║');
    console.log('║  Teelixir + Elevate Wholesale Consolidated Financials            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    logger.info('Starting account mapping suggestion process');

    // Load account analysis data
    const analysisFile = path.join(__dirname, '../../account-analysis.json');

    if (!fs.existsSync(analysisFile)) {
      console.error('Error: account-analysis.json not found.');
      console.error('Please run analyze-chart-of-accounts.ts first.');
      process.exit(1);
    }

    const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));

    const teelixirAccounts: Account[] = analysisData.teelixir_accounts || [];
    const elevateAccounts: Account[] = analysisData.elevate_accounts || [];

    console.log(`Loaded ${teelixirAccounts.length} Teelixir accounts`);
    console.log(`Loaded ${elevateAccounts.length} Elevate accounts\n`);

    // Load existing mappings from Supabase
    const { data: existingMappings, error: mappingsError } = await supabase
      .from('account_mappings')
      .select('*')
      .eq('approval_status', 'approved');

    if (mappingsError && mappingsError.code !== 'PGRST116') {
      throw new Error(`Error loading existing mappings: ${mappingsError.message}`);
    }

    const existingMappingIds = new Set(
      (existingMappings || []).map(m => m.source_account_id)
    );

    console.log(`Found ${existingMappingIds.size} already approved mappings\n`);

    // Generate mapping suggestions
    console.log('Generating mapping suggestions...\n');
    const allMappings = suggestMappings(elevateAccounts, teelixirAccounts);

    // Filter out already approved unless --show-all
    const mappingsToReview = options.showAll
      ? allMappings
      : allMappings.filter(m => !existingMappingIds.has(m.elevate_account_id));

    console.log(`Generated ${allMappings.length} mapping suggestions`);
    console.log(`${mappingsToReview.length} mappings need review\n`);

    // Export if requested
    if (options.exportFile) {
      fs.writeFileSync(options.exportFile, JSON.stringify(allMappings, null, 2));
      console.log(`✓ Exported mappings to ${options.exportFile}\n`);

      if (options.reviewOnly) {
        rl.close();
        return;
      }
    }

    // Statistics
    const highConfidence = mappingsToReview.filter(m => m.confidence_score >= 95);
    const mediumConfidence = mappingsToReview.filter(m => m.confidence_score >= 70 && m.confidence_score < 95);
    const lowConfidence = mappingsToReview.filter(m => m.confidence_score > 0 && m.confidence_score < 70);
    const noMatch = mappingsToReview.filter(m => m.confidence_score === 0);

    console.log('Mapping Confidence Breakdown:');
    console.log(`  High (≥95%):      ${highConfidence.length} accounts`);
    console.log(`  Medium (70-94%):  ${mediumConfidence.length} accounts`);
    console.log(`  Low (1-69%):      ${lowConfidence.length} accounts`);
    console.log(`  No Match (0%):    ${noMatch.length} accounts\n`);

    // Auto-approve high confidence mappings if threshold met
    const approved: MappingSuggestion[] = [];
    const needsReview: AccountMapping[] = [];

    for (const mapping of mappingsToReview) {
      if (mapping.confidence_score >= options.autoApproveThreshold && mapping.teelixir_account_id) {
        approved.push({
          ...mapping,
          approved: true,
          approved_by: 'auto',
          approved_at: new Date().toISOString()
        });
      } else {
        needsReview.push(mapping);
      }
    }

    console.log(`Auto-approved ${approved.length} mappings (threshold: ${options.autoApproveThreshold}%)`);
    console.log(`${needsReview.length} mappings require manual review\n`);

    if (options.reviewOnly) {
      console.log('Review-only mode. Not saving to database.');
      rl.close();
      return;
    }

    // Interactive review
    if (needsReview.length > 0) {
      console.log('Starting interactive review...\n');
      console.log('Options:');
      console.log('  [A] Approve this mapping');
      console.log('  [R] Reject and skip this account');
      console.log('  [M] Manual - choose different target account');
      console.log('  [S] Skip for now (review later)');
      console.log('  [Q] Quit and save progress\n');

      for (let i = 0; i < needsReview.length; i++) {
        const mapping = needsReview[i];

        displayMapping(mapping, i + 1, needsReview.length);

        let decision = await promptUser('Your choice [A/R/M/S/Q]: ');

        if (decision === 'a' && mapping.teelixir_account_id) {
          approved.push({
            ...mapping,
            approved: true,
            approved_by: 'manual',
            approved_at: new Date().toISOString()
          });
          console.log('✓ Approved\n');

        } else if (decision === 'r') {
          console.log('✗ Rejected\n');

        } else if (decision === 'm') {
          const elevateAcc = elevateAccounts.find(a => a.account_id === mapping.elevate_account_id);
          if (elevateAcc) {
            const manualMap = await manualMapping(elevateAcc, teelixirAccounts);
            if (manualMap) {
              approved.push({
                ...manualMap,
                approved: true,
                approved_by: 'manual',
                approved_at: new Date().toISOString()
              });
              console.log('✓ Manually mapped\n');
            }
          }

        } else if (decision === 's') {
          console.log('⊘ Skipped\n');

        } else if (decision === 'q') {
          console.log('\nQuitting...\n');
          break;
        } else {
          console.log('Invalid choice. Skipping.\n');
        }
      }
    }

    // Save approved mappings to Supabase
    if (approved.length > 0) {
      console.log(`\nSaving ${approved.length} approved mappings to Supabase...`);

      for (const mapping of approved) {
        const { error } = await supabase
          .from('account_mappings')
          .upsert({
            source_org_id: 'elevate',
            target_org_id: 'teelixir',
            source_account_id: mapping.elevate_account_id,
            target_account_id: mapping.teelixir_account_id,
            mapping_strategy: mapping.mapping_strategy,
            confidence_score: mapping.confidence_score,
            approval_status: 'approved',
            approved_by: mapping.approved_by || 'system',
            approved_at: mapping.approved_at,
            notes: mapping.notes
          }, {
            onConflict: 'source_org_id,target_org_id,source_account_id'
          });

        if (error) {
          logger.error(`Error saving mapping for ${mapping.elevate_account_code}: ${error.message}`);
        }
      }

      console.log('✓ Mappings saved successfully\n');
    }

    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║  MAPPING SUMMARY                                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Elevate accounts:     ${elevateAccounts.length}`);
    console.log(`Already approved:           ${existingMappingIds.size}`);
    console.log(`Auto-approved this session: ${approved.filter(a => a.approved_by === 'auto').length}`);
    console.log(`Manually approved:          ${approved.filter(a => a.approved_by === 'manual').length}`);
    console.log(`Total approved:             ${existingMappingIds.size + approved.length}`);
    console.log(`Remaining unmapped:         ${elevateAccounts.length - existingMappingIds.size - approved.length}\n`);

    logger.info('Account mapping suggestion process completed');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in account mapping process:', error);
    console.error('Error:', errorMessage);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run main function
main();
