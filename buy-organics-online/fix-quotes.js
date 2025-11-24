#!/usr/bin/env node

/**
 * FIX QUOTES IN ENVIRONMENT VARIABLE REFERENCES
 *
 * Removes quotes around process.env references to make them actual variable lookups
 * instead of string literals
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || '/c/Users/jayso/fyic-portal/src';

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix patterns like: "process.env.VARIABLE_NAME" -> process.env.VARIABLE_NAME
    const fixed = content.replace(/"(process\.env\.[A-Z_]+)"/g, '$1');

    if (fixed !== content) {
      // Create backup if not already exists
      const backupPath = `${filePath}.quotesbackup`;
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
      }

      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✓ Fixed ${path.basename(filePath)}`);
      modified = true;
    }

    return modified;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

function scanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let fixedCount = 0;

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        fixedCount += scanDirectory(fullPath);
      }
    } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.ts'))) {
      if (fixFile(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('Fixing quotes in environment variable references...\n');
const fixed = scanDirectory(targetDir);
console.log(`\n✅ Fixed ${fixed} files`);
