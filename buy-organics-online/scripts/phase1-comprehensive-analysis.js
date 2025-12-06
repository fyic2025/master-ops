const fs = require('fs');

console.log('\n' + '='.repeat(80));
console.log('📊 PHASE 1: COMPREHENSIVE REDIRECT ANALYSIS');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// Load current redirects
const exportData = JSON.parse(fs.readFileSync('all-bc-redirects-export.json', 'utf8'));
const redirects = exportData.redirects;

console.log(`Total redirects: ${redirects.length}`);
console.log(`Target: 10,000-12,000 redirects`);
console.log(`To remove: ${redirects.length - 12000} - ${redirects.length - 10000}\n`);

// Tiered categorization
const tiers = {
  tier1_zero_risk: [],      // Immediate removal, zero risk
  tier2_ancient: [],         // 3+ years old, very low risk
  tier3_old: [],             // 2-3 years old, low risk
  tier4_keep: []             // Recent or should keep
};

const currentDate = new Date('2025-11-25');

// Analyze each redirect
redirects.forEach(r => {
  const path = r.from_path.toLowerCase();

  // TIER 1: ZERO RISK - Immediate Removal
  // 1. Exact duplicates (same from_path, different ID)
  // 2. Query parameters (should be auto-handled)
  // 3. Broken redirects (if we could detect)

  if (path.includes('?') && (path.includes('ctk=') || path.includes('ref=') || path.includes('fullsite='))) {
    tiers.tier1_zero_risk.push({
      ...r,
      tier: 1,
      reason: 'Query parameter redirect (auto-handled)',
      confidence: 100,
      risk: 'zero'
    });
  }
  // Copy/test pages
  else if (path.includes('copy-of-') || path.includes('-copy-') || path.includes('test-')) {
    tiers.tier1_zero_risk.push({
      ...r,
      tier: 1,
      reason: 'Test/copy page that should not exist',
      confidence: 95,
      risk: 'zero'
    });
  }
  // TIER 2: ANCIENT URLs - Very Low Risk
  // Sale URLs with dates 3+ years old
  else if (path.includes('on-sale') || path.includes('best-before') || path.includes('bb-') || path.includes('expir')) {
    // Try to extract date
    let ageYears = null;

    // Pattern: bb-DD-MM-YYYY
    const bbMatch = path.match(/bb-(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (bbMatch) {
      const day = parseInt(bbMatch[1]);
      const month = parseInt(bbMatch[2]);
      const year = parseInt(bbMatch[3]);
      const expiryDate = new Date(year, month - 1, day);
      ageYears = (currentDate - expiryDate) / (1000 * 60 * 60 * 24 * 365);
    }

    // Pattern: any 4-digit year
    if (!ageYears) {
      const yearMatch = path.match(/20(\d{2})/);
      if (yearMatch) {
        const year = parseInt(`20${yearMatch[1]}`);
        const estimatedDate = new Date(year, 0, 1);
        ageYears = (currentDate - estimatedDate) / (1000 * 60 * 60 * 24 * 365);
      }
    }

    if (ageYears && ageYears >= 3) {
      // Ancient sale URL (3+ years)
      tiers.tier2_ancient.push({
        ...r,
        tier: 2,
        reason: `Sale URL ${ageYears.toFixed(1)} years old`,
        confidence: 90,
        risk: 'very-low',
        age_years: ageYears
      });
    } else if (ageYears && ageYears >= 2) {
      // Old sale URL (2-3 years)
      tiers.tier3_old.push({
        ...r,
        tier: 3,
        reason: `Sale URL ${ageYears.toFixed(1)} years old`,
        confidence: 75,
        risk: 'low',
        age_years: ageYears
      });
    } else {
      // No date found or recent - keep for now
      tiers.tier4_keep.push({
        ...r,
        tier: 4,
        reason: ageYears ? `Recent sale URL (${ageYears.toFixed(1)} years)` : 'Sale URL - no date found, needs review',
        age_years: ageYears
      });
    }
  }
  // Brand duplicates would be detected separately
  // Standard products - keep unless very old
  else {
    tiers.tier4_keep.push({
      ...r,
      tier: 4,
      reason: 'Standard product redirect'
    });
  }
});

// Add brand duplicate analysis
console.log('\n🔍 Analyzing brand duplicates...');
const brandGroups = {};
redirects.filter(r => r.from_path.toLowerCase().includes('/brands/')).forEach(r => {
  const cleanPath = r.from_path.toLowerCase().replace(/\.html$/, '');
  if (!brandGroups[cleanPath]) {
    brandGroups[cleanPath] = [];
  }
  brandGroups[cleanPath].push(r);
});

const brandDuplicates = Object.entries(brandGroups).filter(([path, items]) => items.length > 1);
brandDuplicates.forEach(([path, items]) => {
  // Keep first, mark rest for removal
  items.slice(1).forEach(r => {
    tiers.tier1_zero_risk.push({
      ...r,
      tier: 1,
      reason: `Brand duplicate (${items.length} total)`,
      confidence: 95,
      risk: 'zero'
    });
  });
});

// Results summary
console.log('\n' + '='.repeat(80));
console.log('📊 TIERED CATEGORIZATION RESULTS');
console.log('='.repeat(80));

console.log(`\n🎯 TIER 1: Zero Risk (Immediate Removal)`);
console.log(`   Count: ${tiers.tier1_zero_risk.length}`);
console.log(`   Confidence: 95-100%`);
console.log(`   Risk: Zero`);
console.log(`   Action: Remove immediately`);

console.log(`\n⚡ TIER 2: Ancient URLs (Very Low Risk)`);
console.log(`   Count: ${tiers.tier2_ancient.length}`);
console.log(`   Confidence: 90%`);
console.log(`   Risk: Very Low (3+ years old)`);
console.log(`   Action: Remove week 3, return 410 Gone`);

console.log(`\n📦 TIER 3: Old URLs (Low Risk)`);
console.log(`   Count: ${tiers.tier3_old.length}`);
console.log(`   Confidence: 75%`);
console.log(`   Risk: Low (2-3 years old)`);
console.log(`   Action: Remove week 5 after traffic check`);

console.log(`\n✅ TIER 4: Keep (Active or Recent)`);
console.log(`   Count: ${tiers.tier4_keep.length}`);
console.log(`   Action: Keep these redirects`);

// Calculate impact
const totalRemovable = tiers.tier1_zero_risk.length + tiers.tier2_ancient.length + tiers.tier3_old.length;
const finalCount = redirects.length - totalRemovable;
const finalPercent = (finalCount / 25000 * 100).toFixed(2);

console.log(`\n📈 PROJECTED IMPACT`);
console.log(`   Current:      21,687 redirects (86.75%)`);
console.log(`   Removable:    ${totalRemovable} redirects`);
console.log(`   Final count:  ${finalCount} redirects (${finalPercent}%)`);
console.log(`   Target range: 10,000-12,000 (40-48%)`);

if (finalCount > 12000) {
  console.log(`\n⚠️  Still ${finalCount - 12000} above target`);
  console.log(`   Additional review needed for Tier 4 (traffic analysis)`);
} else if (finalCount < 10000) {
  console.log(`\n⚠️  Below target by ${10000 - finalCount}`);
  console.log(`   Can keep more Tier 3 redirects`);
} else {
  console.log(`\n✅ Within target range!`);
}

// Save tier files
console.log('\n' + '='.repeat(80));
console.log('💾 GENERATING TIER FILES');
console.log('='.repeat(80));

// Tier 1: Zero Risk Removal
fs.writeFileSync('tier1-zero-risk-removal.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  tier: 1,
  description: 'Zero risk - immediate removal',
  confidence: '95-100%',
  total: tiers.tier1_zero_risk.length,
  ids: tiers.tier1_zero_risk.map(r => r.id),
  details: tiers.tier1_zero_risk
}, null, 2));
console.log(`\n✅ tier1-zero-risk-removal.json (${tiers.tier1_zero_risk.length} redirects)`);

// Tier 2: Ancient URLs
fs.writeFileSync('tier2-ancient-urls-removal.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  tier: 2,
  description: 'Ancient URLs (3+ years) - very low risk',
  confidence: '90%',
  total: tiers.tier2_ancient.length,
  ids: tiers.tier2_ancient.map(r => r.id),
  details: tiers.tier2_ancient
}, null, 2));
console.log(`✅ tier2-ancient-urls-removal.json (${tiers.tier2_ancient.length} redirects)`);

// Tier 3: Old URLs
fs.writeFileSync('tier3-old-urls-removal.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  tier: 3,
  description: 'Old URLs (2-3 years) - low risk',
  confidence: '75%',
  total: tiers.tier3_old.length,
  ids: tiers.tier3_old.map(r => r.id),
  details: tiers.tier3_old
}, null, 2));
console.log(`✅ tier3-old-urls-removal.json (${tiers.tier3_old.length} redirects)`);

// Tier 4: Keep
fs.writeFileSync('tier4-keep-active.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  tier: 4,
  description: 'Keep - active or recent',
  total: tiers.tier4_keep.length,
  sample: tiers.tier4_keep.slice(0, 100)
}, null, 2));
console.log(`✅ tier4-keep-active.json (${tiers.tier4_keep.length} redirects - sample only)`);

// Master analysis report
const report = {
  timestamp: new Date().toISOString(),
  phase: 'Phase 1 - Data Collection & Analysis',
  current_state: {
    total_redirects: redirects.length,
    capacity_used: '86.75%',
    available_slots: 3313
  },
  target_state: {
    target_redirects: '10,000-12,000',
    target_capacity: '40-48%',
    to_remove: `${redirects.length - 12000} - ${redirects.length - 10000}`
  },
  tiers: {
    tier1_zero_risk: {
      count: tiers.tier1_zero_risk.length,
      confidence: '95-100%',
      risk: 'zero',
      action: 'Remove immediately (Week 2)'
    },
    tier2_ancient: {
      count: tiers.tier2_ancient.length,
      confidence: '90%',
      risk: 'very-low',
      action: 'Remove Week 3 (return 410 Gone)'
    },
    tier3_old: {
      count: tiers.tier3_old.length,
      confidence: '75%',
      risk: 'low',
      action: 'Remove Week 5 (after traffic check)'
    },
    tier4_keep: {
      count: tiers.tier4_keep.length,
      action: 'Keep (active or recent)'
    }
  },
  projected_impact: {
    current: redirects.length,
    removable: totalRemovable,
    final: finalCount,
    final_percent: finalPercent + '%',
    meets_target: finalCount >= 10000 && finalCount <= 12000
  },
  next_steps: [
    'Review tier files',
    'Begin Week 2: Execute Tier 1 removal',
    'Monitor for 48 hours',
    'Proceed to Tier 2 (Week 3)'
  ]
};

fs.writeFileSync('phase1-analysis-report.json', JSON.stringify(report, null, 2));
console.log(`✅ phase1-analysis-report.json (Master report)`);

console.log('\n' + '='.repeat(80));
console.log('✅ PHASE 1 ANALYSIS COMPLETE');
console.log('='.repeat(80));
console.log('\n📋 Files created:');
console.log('   - tier1-zero-risk-removal.json');
console.log('   - tier2-ancient-urls-removal.json');
console.log('   - tier3-old-urls-removal.json');
console.log('   - tier4-keep-active.json');
console.log('   - phase1-analysis-report.json');

console.log('\n🚀 READY FOR PHASE 2');
console.log('   Next: Review tier files and execute Tier 1 removal\n');
