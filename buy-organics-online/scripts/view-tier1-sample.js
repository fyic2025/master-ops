const fs = require('fs');

const data = JSON.parse(fs.readFileSync('tier1-zero-risk-removal.json', 'utf8'));

console.log('🔍 TIER 1 SAMPLE ANALYSIS (First 15 redirects)\n');
console.log('='.repeat(80));

data.details.slice(0, 15).forEach((r, i) => {
  console.log(`\n${i + 1}. ID: ${r.id}`);
  console.log(`   From: ${r.from_path}`);
  console.log(`   To: ${r.to_url || r.to?.url || 'N/A'}`);
  console.log(`   Reason: ${r.reason}`);
  console.log(`   Confidence: ${r.confidence}%`);
  console.log(`   Risk: ${r.risk}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\nTotal Tier 1: ${data.total} redirects`);
console.log(`Confidence: ${data.confidence}`);
console.log(`Action: ${data.description}`);
