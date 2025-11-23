#!/usr/bin/env node
/**
 * BigCommerce Theme Deployment Tool
 *
 * Handles the complete deployment workflow:
 * 1. Pre-deployment validation
 * 2. Build & bundle theme
 * 3. Upload to BigCommerce
 * 4. Rollback capability
 *
 * Usage:
 *   node deploy.js --validate    # Run validation only
 *   node deploy.js --build       # Build theme bundle
 *   node deploy.js --preview     # Deploy to preview
 *   node deploy.js --production  # Deploy to production (with confirmation)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  themeName: 'Cornerstone-BOO-Cust',
  version: '4.9.0',
  stencilConfig: '.stencil',
  validationTests: [
    { name: 'Build Test', command: 'node node_modules/webpack/bin/webpack.js --config webpack.prod.js' },
    { name: 'JS Syntax', command: 'node --check assets/js/theme/common/utils/api.js' },
    { name: 'Important Count', command: 'grep -c "!important" assets/scss/custom.scss || true' }
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if Stencil CLI is available
function checkStencilCLI() {
  header('Checking Stencil CLI Installation');

  try {
    execSync('npx @bigcommerce/stencil-cli --version', { stdio: 'pipe' });
    success('Stencil CLI is available via npx');
    return true;
  } catch (err) {
    warning('Stencil CLI not found. Will install when needed.');
    return false;
  }
}

// Run validation tests
async function runValidation() {
  header('Running Pre-Deployment Validation');

  let allPassed = true;

  for (const test of CONFIG.validationTests) {
    try {
      info(`Running: ${test.name}`);
      const result = execSync(test.command, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      // Special check for !important count
      if (test.name === 'Important Count') {
        const count = parseInt(result.trim()) || 0;
        if (count === 0) {
          success(`${test.name}: PASSED (0 !important declarations)`);
        } else {
          error(`${test.name}: FAILED (${count} !important declarations found)`);
          allPassed = false;
        }
      } else {
        success(`${test.name}: PASSED`);
      }
    } catch (err) {
      error(`${test.name}: FAILED`);
      if (err.stdout) console.log(err.stdout.toString());
      if (err.stderr) console.log(err.stderr.toString());
      allPassed = false;
    }
  }

  if (allPassed) {
    success('\nAll validation tests passed! ✨');
  } else {
    error('\nSome validation tests failed. Fix issues before deploying.');
    process.exit(1);
  }

  return allPassed;
}

// Build theme bundle
function buildTheme() {
  header('Building Theme Bundle');

  try {
    info('Running webpack build...');
    execSync('node node_modules/webpack/bin/webpack.js --config webpack.prod.js', { stdio: 'inherit' });
    success('Theme built successfully!');
    return true;
  } catch (err) {
    error('Build failed!');
    return false;
  }
}

// Create bundle for upload
function bundleTheme() {
  header('Creating Theme Bundle');

  try {
    info('Running stencil bundle...');
    execSync('npx @bigcommerce/stencil-cli bundle', { stdio: 'inherit' });
    success('Theme bundled successfully!');

    // Check if .zip was created
    const files = fs.readdirSync('.');
    const zipFile = files.find(f => f.endsWith('.zip'));
    if (zipFile) {
      info(`Bundle created: ${zipFile}`);
      return zipFile;
    } else {
      warning('No .zip file found after bundling');
      return null;
    }
  } catch (err) {
    error('Bundling failed!');
    return null;
  }
}

// Upload to BigCommerce
function uploadTheme(environment = 'preview') {
  header(`Uploading Theme to ${environment.toUpperCase()}`);

  if (!fs.existsSync('.stencil')) {
    error('.stencil configuration file not found!');
    error('Run: npx @bigcommerce/stencil-cli init');
    return false;
  }

  try {
    info('Uploading theme...');

    const command = environment === 'production'
      ? 'npx @bigcommerce/stencil-cli push --activate'
      : 'npx @bigcommerce/stencil-cli push';

    execSync(command, { stdio: 'inherit' });
    success(`Theme uploaded to ${environment}!`);
    return true;
  } catch (err) {
    error('Upload failed!');
    return false;
  }
}

// Download current live theme as backup
function backupCurrentTheme() {
  header('Creating Backup of Current Theme');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupDir = `./backups/backup-${timestamp}`;

    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups');
    }

    info('Downloading current theme...');
    execSync(`npx @bigcommerce/stencil-cli download --dest ${backupDir}`, { stdio: 'inherit' });
    success(`Backup saved to: ${backupDir}`);
    return backupDir;
  } catch (err) {
    warning('Backup failed (continuing anyway)');
    return null;
  }
}

// Main deployment workflow
async function deploy(options = {}) {
  const {
    skipValidation = false,
    skipBuild = false,
    environment = 'preview',
    backup = true
  } = options;

  header(`🚀 BigCommerce Theme Deployment - ${CONFIG.themeName} v${CONFIG.version}`);

  // Step 1: Check Stencil CLI
  checkStencilCLI();

  // Step 2: Validation
  if (!skipValidation) {
    await runValidation();
  }

  // Step 3: Build
  if (!skipBuild) {
    if (!buildTheme()) {
      error('Build failed. Aborting deployment.');
      return false;
    }
  }

  // Step 4: Backup (for production only)
  if (environment === 'production' && backup) {
    backupCurrentTheme();
  }

  // Step 5: Bundle
  const bundleFile = bundleTheme();
  if (!bundleFile) {
    error('Bundling failed. Aborting deployment.');
    return false;
  }

  // Step 6: Upload
  if (uploadTheme(environment)) {
    success('\n✨ Deployment completed successfully! ✨');

    if (environment === 'preview') {
      info('\nNext steps:');
      info('1. Test the preview URL in your browser');
      info('2. Run visual testing checklist (VISUAL-TESTING-GUIDE.md)');
      info('3. Deploy to production: node deploy.js --production');
    }

    return true;
  } else {
    error('\n❌ Deployment failed!');
    return false;
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  validate: args.includes('--validate'),
  build: args.includes('--build'),
  preview: args.includes('--preview'),
  production: args.includes('--production'),
  skipValidation: args.includes('--skip-validation'),
  skipBuild: args.includes('--skip-build')
};

// Execute based on arguments
(async () => {
  try {
    if (options.validate) {
      await runValidation();
    } else if (options.build) {
      buildTheme();
      bundleTheme();
    } else if (options.preview) {
      await deploy({ environment: 'preview' });
    } else if (options.production) {
      // Confirmation for production
      warning('⚠️  PRODUCTION DEPLOYMENT - This will affect the live store!');
      info('Press Ctrl+C to cancel, or continue in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await deploy({ environment: 'production', backup: true });
    } else {
      // Show help
      log('\nBigCommerce Theme Deployment Tool\n', 'cyan');
      log('Usage:');
      log('  node deploy.js --validate     Run validation tests only');
      log('  node deploy.js --build        Build and bundle theme');
      log('  node deploy.js --preview      Deploy to preview/staging');
      log('  node deploy.js --production   Deploy to production (with backup)');
      log('\nOptions:');
      log('  --skip-validation            Skip validation tests');
      log('  --skip-build                 Skip build step');
      log('\nExamples:');
      log('  node deploy.js --validate');
      log('  node deploy.js --preview');
      log('  node deploy.js --production');
    }
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
})();
