#!/usr/bin/env npx tsx

/**
 * Email Validator Script
 *
 * Validates email addresses before campaign import:
 * - Syntax validation (RFC 5322)
 * - MX record verification
 * - Disposable email detection
 * - Suppression list check
 *
 * Usage: npx tsx scripts/email-validator.ts <csv-file>
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.BOO_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getairmail.com', 'getnada.com', 'mohmal.com'
]);

// Role-based emails to skip
const ROLE_PREFIXES = ['info', 'admin', 'support', 'sales', 'contact', 'hello',
  'noreply', 'no-reply', 'team', 'help', 'billing', 'accounts'];

interface ValidationResult {
  email: string;
  valid: boolean;
  reason?: string;
  details?: Record<string, any>;
}

interface ValidationReport {
  timestamp: string;
  inputFile: string;
  totalRecords: number;
  validEmails: number;
  invalidEmails: ValidationResult[];
  duplicates: string[];
  suppressed: ValidationResult[];
  roleEmails: ValidationResult[];
  disposableEmails: ValidationResult[];
  mxFailures: ValidationResult[];
  summary: {
    validRate: number;
    bounceRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

/**
 * Validate email syntax (RFC 5322 simplified)
 */
function isValidEmailSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Check if email domain has valid MX records
 */
async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if email is a role-based address
 */
function isRoleEmail(email: string): boolean {
  const localPart = email.split('@')[0].toLowerCase();
  return ROLE_PREFIXES.some(prefix => localPart === prefix || localPart.startsWith(`${prefix}.`));
}

/**
 * Check if domain is disposable
 */
function isDisposableDomain(email: string): boolean {
  const domain = email.split('@')[1].toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Check suppression list in Supabase
 */
async function checkSuppressionList(emails: string[]): Promise<Map<string, string>> {
  const suppressed = new Map<string, string>();

  // Check bounced emails from Smartlead
  const { data: bounced } = await supabase
    .from('smartlead_leads')
    .select('email')
    .in('email', emails)
    .eq('status', 'bounced');

  bounced?.forEach(b => suppressed.set(b.email.toLowerCase(), 'previous_bounce'));

  // Check unsubscribed
  const { data: unsubbed } = await supabase
    .from('smartlead_engagement')
    .select('lead_id')
    .in('event_type', ['LEAD_UNSUBSCRIBED'])
    .in('lead_id', emails);

  unsubbed?.forEach(u => suppressed.set(u.lead_id.toLowerCase(), 'unsubscribed'));

  // Check failed anniversary emails
  const { data: failed } = await supabase
    .from('tlx_anniversary_discounts')
    .select('email')
    .in('email', emails)
    .eq('status', 'failed');

  failed?.forEach(f => suppressed.set(f.email.toLowerCase(), 'previous_failure'));

  return suppressed;
}

/**
 * Find duplicates in list
 */
function findDuplicates(emails: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const email of emails) {
    const lower = email.toLowerCase();
    if (seen.has(lower)) {
      duplicates.push(email);
    } else {
      seen.add(lower);
    }
  }

  return duplicates;
}

/**
 * Main validation function
 */
async function validateEmailList(csvPath: string): Promise<ValidationReport> {
  console.log(`\nValidating email list: ${csvPath}\n`);
  console.log('='.repeat(60));

  // Read and parse CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  // Find email column
  const emailColumn = Object.keys(records[0]).find(k =>
    k.toLowerCase().includes('email')
  );

  if (!emailColumn) {
    throw new Error('No email column found in CSV');
  }

  const emails = records.map((r: any) => r[emailColumn]?.trim()).filter(Boolean);
  console.log(`Found ${emails.length} email addresses\n`);

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    inputFile: path.basename(csvPath),
    totalRecords: emails.length,
    validEmails: 0,
    invalidEmails: [],
    duplicates: [],
    suppressed: [],
    roleEmails: [],
    disposableEmails: [],
    mxFailures: [],
    summary: {
      validRate: 0,
      bounceRisk: 'low',
      recommendations: []
    }
  };

  // Step 1: Find duplicates
  console.log('1. Checking for duplicates...');
  report.duplicates = findDuplicates(emails);
  console.log(`   Found ${report.duplicates.length} duplicates\n`);

  // Step 2: Syntax validation
  console.log('2. Validating email syntax...');
  const syntaxValid: string[] = [];
  for (const email of [...new Set(emails)]) {
    if (!isValidEmailSyntax(email)) {
      report.invalidEmails.push({
        email,
        valid: false,
        reason: 'invalid_syntax'
      });
    } else {
      syntaxValid.push(email);
    }
  }
  console.log(`   ${report.invalidEmails.length} invalid syntax\n`);

  // Step 3: Check disposable domains
  console.log('3. Checking for disposable domains...');
  const notDisposable: string[] = [];
  for (const email of syntaxValid) {
    if (isDisposableDomain(email)) {
      report.disposableEmails.push({
        email,
        valid: false,
        reason: 'disposable_domain'
      });
    } else {
      notDisposable.push(email);
    }
  }
  console.log(`   ${report.disposableEmails.length} disposable emails\n`);

  // Step 4: Check role-based emails
  console.log('4. Checking for role-based emails...');
  const notRole: string[] = [];
  for (const email of notDisposable) {
    if (isRoleEmail(email)) {
      report.roleEmails.push({
        email,
        valid: false,
        reason: 'role_email'
      });
    } else {
      notRole.push(email);
    }
  }
  console.log(`   ${report.roleEmails.length} role-based emails\n`);

  // Step 5: MX record verification (batch by domain)
  console.log('5. Verifying MX records...');
  const domains = [...new Set(notRole.map(e => e.split('@')[1].toLowerCase()))];
  const validDomains = new Set<string>();

  for (const domain of domains) {
    const hasMx = await hasMxRecords(domain);
    if (hasMx) {
      validDomains.add(domain);
    }
  }

  const mxValid: string[] = [];
  for (const email of notRole) {
    const domain = email.split('@')[1].toLowerCase();
    if (!validDomains.has(domain)) {
      report.mxFailures.push({
        email,
        valid: false,
        reason: 'no_mx_records',
        details: { domain }
      });
    } else {
      mxValid.push(email);
    }
  }
  console.log(`   ${report.mxFailures.length} MX verification failures\n`);

  // Step 6: Check suppression list
  console.log('6. Checking suppression list...');
  const suppressionMap = await checkSuppressionList(mxValid);
  const finalValid: string[] = [];

  for (const email of mxValid) {
    const suppressReason = suppressionMap.get(email.toLowerCase());
    if (suppressReason) {
      report.suppressed.push({
        email,
        valid: false,
        reason: suppressReason
      });
    } else {
      finalValid.push(email);
    }
  }
  console.log(`   ${report.suppressed.length} suppressed emails\n`);

  // Calculate final results
  report.validEmails = finalValid.length;
  report.summary.validRate = Math.round((finalValid.length / emails.length) * 100);

  // Determine bounce risk
  const invalidRate = 100 - report.summary.validRate;
  if (invalidRate > 20) {
    report.summary.bounceRisk = 'high';
  } else if (invalidRate > 10) {
    report.summary.bounceRisk = 'medium';
  }

  // Generate recommendations
  if (report.duplicates.length > 0) {
    report.summary.recommendations.push(`Remove ${report.duplicates.length} duplicate emails`);
  }
  if (report.disposableEmails.length > 10) {
    report.summary.recommendations.push('Consider reviewing lead source - many disposable emails detected');
  }
  if (report.roleEmails.length > emails.length * 0.1) {
    report.summary.recommendations.push('High percentage of role emails - deliverability may be affected');
  }
  if (report.mxFailures.length > 0) {
    report.summary.recommendations.push(`${report.mxFailures.length} emails have invalid domains - remove before sending`);
  }
  if (report.summary.bounceRisk === 'high') {
    report.summary.recommendations.push('HIGH BOUNCE RISK - Clean list thoroughly before sending');
  }

  return report;
}

/**
 * Print report to console
 */
function printReport(report: ValidationReport) {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(60));

  console.log(`\nFile: ${report.inputFile}`);
  console.log(`Timestamp: ${report.timestamp}`);

  console.log('\n--- SUMMARY ---');
  console.log(`Total Records: ${report.totalRecords}`);
  console.log(`Valid Emails: ${report.validEmails} (${report.summary.validRate}%)`);
  console.log(`Bounce Risk: ${report.summary.bounceRisk.toUpperCase()}`);

  console.log('\n--- BREAKDOWN ---');
  console.log(`Duplicates: ${report.duplicates.length}`);
  console.log(`Invalid Syntax: ${report.invalidEmails.length}`);
  console.log(`Disposable Domains: ${report.disposableEmails.length}`);
  console.log(`Role Emails: ${report.roleEmails.length}`);
  console.log(`MX Failures: ${report.mxFailures.length}`);
  console.log(`Suppressed: ${report.suppressed.length}`);

  if (report.summary.recommendations.length > 0) {
    console.log('\n--- RECOMMENDATIONS ---');
    report.summary.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main entry point
 */
async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: npx tsx email-validator.ts <csv-file>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    const report = await validateEmailList(csvPath);
    printReport(report);

    // Save report to JSON
    const reportPath = csvPath.replace('.csv', '-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);

    // Exit with error if high bounce risk
    if (report.summary.bounceRisk === 'high') {
      console.log('\nExiting with error due to high bounce risk');
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

main();
