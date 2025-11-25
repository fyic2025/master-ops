const fs = require('fs');

const data = JSON.parse(fs.readFileSync('tier2-ancient-urls-removal.json', 'utf8'));

console.log('⚡ TIER 2 ANCIENT URLs ANALYSIS (All redirects)\n');
console.log('='.repeat(80));

data.details.forEach((r, i) => {
  console.log(`\n${i + 1}. ID: ${r.id}`);
  console.log(`   From: ${r.from_path}`);
  console.log(`   Age: ${r.age_years?.toFixed(1)} years`);
  console.log(`   Reason: ${r.reason}`);
  console.log(`   Confidence: ${r.confidence}%`);
  console.log(`   Risk: ${r.risk}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\nTotal Tier 2: ${data.total} redirects`);
console.log(`Confidence: ${data.confidence}`);
console.log(`Action: ${data.description}`);
