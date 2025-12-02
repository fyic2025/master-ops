#!/usr/bin/env node
const fs = require('fs');

let totals = {
  working: [],
  fixed: [],
  needsUIFix: [],
  inactive: []
};

for (let i = 1; i <= 19; i++) {
  const file = `/tmp/n8n-audit-batch-${i}.json`;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.working) totals.working.push(...data.working);
    if (data.fixed) totals.fixed.push(...data.fixed);
    if (data.needsUIFix) totals.needsUIFix.push(...data.needsUIFix);
    if (data.inactive) totals.inactive.push(...data.inactive);
    console.log(`Batch ${i}: ${data.working?.length || 0} working, ${data.needsUIFix?.length || 0} needs fix, ${data.inactive?.length || 0} inactive`);
  } catch (e) {
    console.log(`Batch ${i}: No data`);
  }
}

console.log('\n=== TOTALS ===');
console.log(`Working: ${totals.working.length}`);
console.log(`Fixed: ${totals.fixed.length}`);
console.log(`Needs UI Fix: ${totals.needsUIFix.length}`);
console.log(`Inactive: ${totals.inactive.length}`);
console.log(`TOTAL: ${totals.working.length + totals.fixed.length + totals.needsUIFix.length + totals.inactive.length}`);

if (totals.needsUIFix.length > 0) {
  console.log('\n=== NEEDS UI FIX ===');
  totals.needsUIFix.forEach(w => {
    console.log(`- ${w.name} (${w.credentials?.join(', ') || 'no creds'})`);
  });
}

if (totals.working.length > 0) {
  console.log('\n=== WORKING ===');
  totals.working.forEach(w => {
    console.log(`- ${w.name} (last: ${w.lastRun || 'never'})`);
  });
}
