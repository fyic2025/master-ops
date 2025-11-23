#!/usr/bin/env tsx
import * as fs from 'fs';

console.log('\n📦 Combining CSV Files into One Master File...\n');

const files = [
  'massage_spa_leads.csv',
  'hair_beauty_leads.csv',
  'cosmetic_leads.csv'
];

// Read all files
let allLines: string[] = [];
let header = '';

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (i === 0) {
    // First file - keep header
    header = lines[0];
    allLines.push(...lines);
    console.log(`✅ ${file}: ${lines.length - 1} leads (with header)`);
  } else {
    // Other files - skip header, just add data
    allLines.push(...lines.slice(1));
    console.log(`✅ ${file}: ${lines.length - 1} leads`);
  }
}

// Write combined file
const outputFile = 'beauty_blast_2025_ALL_LEADS.csv';
fs.writeFileSync(outputFile, allLines.join('\n'));

console.log(`\n✅ COMBINED FILE CREATED: ${outputFile}`);
console.log(`   Total leads: ${allLines.length - 1} (excluding header)`);
console.log(`   File size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB\n`);

// Show sample
const sample = allLines.slice(0, 4);
console.log('📋 Sample (first 3 leads):');
console.log(sample.join('\n'));
console.log('\n' + '='.repeat(70) + '\n');
console.log('🎯 READY TO UPLOAD TO SMARTLEAD!');
console.log(`   File: ${outputFile}`);
console.log('   Upload this ONE file instead of 3 separate files');
console.log('\n' + '='.repeat(70) + '\n');
