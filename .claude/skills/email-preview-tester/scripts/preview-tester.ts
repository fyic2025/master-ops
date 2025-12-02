/**
 * Email Preview Tester Script
 *
 * CLI tool for testing emails across clients and checking spam scores.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLitmusClient } from '../../../../shared/libs/integrations/litmus/client';

const client = getLitmusClient();

async function testEmail(htmlPath: string) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const fileName = path.basename(htmlPath, '.html');

  console.log(`\n📧 Testing email: ${fileName}\n`);

  // Validate HTML
  console.log('🔍 Validating HTML...');
  const validation = client.validateHTML(html);

  console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);

  if (validation.errors.length > 0) {
    console.log('   Errors:');
    validation.errors.forEach(e => console.log(`     ❌ ${e}`));
  }

  if (validation.warnings.length > 0) {
    console.log('   Warnings:');
    validation.warnings.forEach(w => console.log(`     ⚠️ ${w}`));
  }

  console.log(`   Accessibility Score: ${validation.accessibility.score}/100`);
  if (validation.accessibility.issues.length > 0) {
    validation.accessibility.issues.forEach(i => console.log(`     ⚠️ ${i}`));
  }

  // Check spam score
  console.log('\n📊 Checking spam score...');
  const spam = client.analyzeSpamScore({
    subject: 'Test Subject Line',
    html
  });

  console.log(`   Score: ${spam.score}/${spam.maxScore} ${spam.isSpammy ? '❌ SPAMMY' : '✅ OK'}`);

  if (spam.tests.length > 0) {
    console.log('   Issues found:');
    spam.tests.forEach(t => console.log(`     - ${t.name}: +${t.score} points`));
  }

  // Show priority clients
  console.log('\n📱 Priority email clients for testing:');
  const clients = client.getPriorityClients();
  const grouped = {
    desktop: clients.filter(c => c.platform === 'desktop'),
    webmail: clients.filter(c => c.platform === 'webmail'),
    mobile: clients.filter(c => c.platform === 'mobile')
  };

  console.log('   Desktop:');
  grouped.desktop.forEach(c => console.log(`     - ${c.name}`));
  console.log('   Webmail:');
  grouped.webmail.forEach(c => console.log(`     - ${c.name}`));
  console.log('   Mobile:');
  grouped.mobile.forEach(c => console.log(`     - ${c.name}`));

  // Check if Litmus is configured
  if (client.isConfigured()) {
    console.log('\n🔗 Litmus API configured - can generate live previews');
  } else {
    console.log('\n⚠️ Litmus API not configured - set LITMUS_API_KEY and LITMUS_API_SECRET for live previews');
  }

  return {
    validation,
    spam,
    clients
  };
}

async function checkSpam(htmlPath: string, subject?: string) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  console.log('\n📊 Spam Analysis\n');

  const result = client.analyzeSpamScore({
    subject: subject || 'Test Subject',
    html
  });

  console.log(`Score: ${result.score}/${result.maxScore}`);
  console.log(`Status: ${result.isSpammy ? '❌ HIGH SPAM RISK' : '✅ LOW SPAM RISK'}\n`);

  if (result.tests.length > 0) {
    console.log('Detected issues:');
    result.tests.forEach(t => {
      console.log(`  [+${t.score}] ${t.name}`);
      console.log(`         ${t.description}`);
    });
  } else {
    console.log('No spam triggers detected!');
  }

  return result;
}

async function validate(htmlPath: string) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  console.log('\n🔍 HTML Validation\n');

  const result = client.validateHTML(html);

  console.log(`Valid: ${result.valid ? '✅ YES' : '❌ NO'}\n`);

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(e => console.log(`  ❌ ${e}`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
    console.log();
  }

  console.log(`Accessibility: ${result.accessibility.score}/100`);
  if (result.accessibility.issues.length > 0) {
    console.log('Accessibility issues:');
    result.accessibility.issues.forEach(i => console.log(`  ⚠️ ${i}`));
  }

  return result;
}

async function generateDarkMode(params: {
  bgDark: string;
  textDark: string;
  primaryDark?: string;
}) {
  const css = client.generateDarkModeCSS(params);
  console.log(css);
  return css;
}

// CLI
async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'test':
      if (!args[0]) {
        console.error('Usage: preview-tester.ts test <html_file>');
        process.exit(1);
      }
      await testEmail(args[0]);
      break;

    case 'spam':
      if (!args[0]) {
        console.error('Usage: preview-tester.ts spam <html_file> [subject]');
        process.exit(1);
      }
      await checkSpam(args[0], args[1]);
      break;

    case 'validate':
      if (!args[0]) {
        console.error('Usage: preview-tester.ts validate <html_file>');
        process.exit(1);
      }
      await validate(args[0]);
      break;

    case 'dark-mode':
      await generateDarkMode({
        bgDark: args[0] || '#1a1a1a',
        textDark: args[1] || '#ffffff',
        primaryDark: args[2]
      });
      break;

    case 'clients':
      console.log('\nPriority Email Clients:\n');
      console.table(client.getPriorityClients());
      break;

    default:
      console.log(`
Email Preview Tester

Usage:
  npx tsx preview-tester.ts <command> [args...]

Commands:
  test <html_file>              Full test: validate + spam + client list
  spam <html_file> [subject]    Check spam score
  validate <html_file>          Validate HTML and accessibility
  dark-mode [bgDark] [textDark] [primaryDark]  Generate dark mode CSS
  clients                       List priority email clients

Examples:
  npx tsx preview-tester.ts test templates/promotional.html
  npx tsx preview-tester.ts spam templates/promotional.html "50% Off Sale!"
  npx tsx preview-tester.ts validate templates/promotional.html
      `);
  }
}

main().catch(console.error);
