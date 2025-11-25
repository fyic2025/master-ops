#!/usr/bin/env node

const fs = require('fs');

// Load the JSON report
const report = JSON.parse(fs.readFileSync('reports/uhp-advanced-matches.json', 'utf8'));

// Create CSV
const csvRows = [
  ['Confidence', 'Score', 'BC SKU', 'BC Name', 'UHP SKU', 'UHP Name', 'UHP Brand', 'Match Details']
];

// Add medium confidence matches
report.medium_confidence_matches.forEach(m => {
  csvRows.push([
    'MEDIUM',
    m.score || '',
    m.bc_sku || '',
    m.bc_name || '',
    m.uhp_sku || 'N/A',
    m.uhp_name || '',
    m.uhp_brand || '',
    m.details || ''
  ]);
});

// Add low confidence matches
report.low_confidence_matches.forEach(m => {
  csvRows.push([
    'LOW',
    m.score || '',
    m.bc_sku || '',
    m.bc_name || '',
    m.uhp_sku || 'N/A',
    m.uhp_name || '',
    m.uhp_brand || '',
    m.details || ''
  ]);
});

const csvContent = csvRows.map(row =>
  row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
).join('\n');

fs.writeFileSync('reports/uhp-advanced-matches.csv', csvContent);

console.log(`✅ CSV created: reports/uhp-advanced-matches.csv`);
console.log(`   Total matches: ${report.summary.total_matches}`);
console.log(`   - Medium confidence: ${report.summary.medium_confidence}`);
console.log(`   - Low confidence: ${report.summary.low_confidence}`);
