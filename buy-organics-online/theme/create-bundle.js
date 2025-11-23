#!/usr/bin/env node
/**
 * Manual Theme Bundle Creator
 * Creates a BigCommerce-compatible theme bundle without requiring Stencil CLI
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n📦 Creating BigCommerce Theme Bundle...\n');

// Files and directories to exclude from bundle
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.gitignore',
  '.stencil',
  'secrets.stencil.json',
  '*.zip',
  'backups',
  'deploy.js',
  'create-bundle.js',
  'setup-stencil.bat',
  'DEPLOYMENT-README.md',
  'STAGE-2-*.md',
  'VALIDATION-REPORT.md',
  'VISUAL-TESTING-GUIDE.md',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  'npm-debug.log',
  'yarn-error.log'
];

// Create timestamp for bundle name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const bundleName = `Cornerstone-BOO-Cust-${timestamp}.zip`;

try {
  // Check if 7zip or tar is available
  let zipCommand;

  try {
    // Check for PowerShell (always available on Windows)
    console.log('✓ Using PowerShell Compress-Archive\n');

    // Required theme files for BigCommerce
    const requiredFiles = [
      'config.json',
      'schema.json',
      'schemaTranslations.json',
      'meta',
      'templates',
      'assets',
      'lang',
      'Gruntfile.js',
      'package.json',
      'stencil.conf.js',
      'webpack.*.js'
    ];

    // Create a temporary directory for clean bundle
    const tempDir = 'temp_bundle';
    if (fs.existsSync(tempDir)) {
      execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'pipe' });
    }
    fs.mkdirSync(tempDir);

    // Copy only required files
    console.log('Copying theme files...');
    for (const pattern of requiredFiles) {
      try {
        if (pattern.includes('*')) {
          execSync(`xcopy /Y /Q "${pattern}" "${tempDir}\\" 2>nul`, { stdio: 'pipe' });
        } else if (fs.existsSync(pattern)) {
          const stat = fs.statSync(pattern);
          if (stat.isDirectory()) {
            execSync(`xcopy /E /I /Y /Q "${pattern}" "${tempDir}\\${pattern}" 2>nul`, { stdio: 'pipe' });
          } else {
            execSync(`copy /Y "${pattern}" "${tempDir}\\" >nul 2>nul`, { stdio: 'pipe' });
          }
        }
      } catch (err) {
        // Ignore errors for optional files
      }
    }

    // Create zip from temp directory using PowerShell
    const psCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${bundleName}" -Force`;
    zipCommand = `powershell -Command "${psCommand}"`;

  } catch {
    try {
      execSync('where 7z', { stdio: 'pipe' });
      console.log('✓ Using 7-Zip\n');

      // Build exclude list for 7zip
      const excludes = EXCLUDE_PATTERNS.map(p => `-xr!${p}`).join(' ');
      zipCommand = `7z a -tzip "${bundleName}" * ${excludes}`;
    } catch {
      console.error('❌ Error: Neither 7-Zip nor tar found.');
      console.error('Please install 7-Zip or use manual bundling.\n');
      console.error('Manual steps:');
      console.error('1. Select all theme files EXCEPT:');
      console.error('   - node_modules/');
      console.error('   - .git/');
      console.error('   - *.zip files');
      console.error('   - deployment scripts');
      console.error('2. Right-click > Send to > Compressed (zipped) folder');
      console.error(`3. Name it: ${bundleName}`);
      process.exit(1);
    }
  }

  console.log('Creating bundle...');
  execSync(zipCommand, { stdio: 'inherit' });

  console.log('\n✅ Bundle created successfully!\n');
  console.log(`📦 File: ${bundleName}`);

  // Get file size
  const stats = fs.statSync(bundleName);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Size: ${fileSizeMB} MB\n`);

  console.log('🚀 Next Steps:');
  console.log('1. Login to BigCommerce admin panel');
  console.log('2. Go to: Storefront > My Themes');
  console.log('3. Click "Upload Theme"');
  console.log(`4. Select: ${bundleName}`);
  console.log('5. Click "Save" to upload to your theme library');
  console.log('6. Apply to preview or activate on live store\n');

} catch (err) {
  console.error('❌ Bundle creation failed:', err.message);
  process.exit(1);
}
