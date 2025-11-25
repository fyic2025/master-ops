#!/usr/bin/env tsx

/**
 * Update BigCommerce Checkout Language Settings
 *
 * Changes "City" to "Suburb" for Australian localization
 *
 * Note: This requires BigCommerce Management API access
 */

import 'dotenv/config'

console.log('\n🔧 BigCommerce Checkout Language Updater\n');
console.log('Task: Change "City" → "Suburb"\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('⚠️  Important: BigCommerce Checkout Customization\n');

console.log('Unfortunately, checkout field labels cannot be changed via the');
console.log('standard V2/V3 REST API. They must be changed through:\n');

console.log('1. BigCommerce Control Panel (Recommended)');
console.log('2. Theme Language Files');
console.log('3. JavaScript/CSS customization\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('📋 SOLUTION: Use BigCommerce Control Panel\n');

console.log('Since you cannot access checkout without a cart, use this method:\n');

console.log('**Step 1: Access Store Settings**');
console.log('   → https://store-hhhi.mybigcommerce.com/manage/');
console.log('   → Storefront → Themes\n');

console.log('**Step 2: Edit Theme Language**');
console.log('   → Find your active theme');
console.log('   → Click "Advanced" → "Edit Theme Files"');
console.log('   → Navigate to: lang/en.json\n');

console.log('**Step 3: Update Language File**');
console.log('   Find this section:');
console.log('   ```json');
console.log('   {');
console.log('     "address": {');
console.log('       "city": "City",');
console.log('       "city_label": "City"');
console.log('     }');
console.log('   }');
console.log('   ```\n');

console.log('   Change to:');
console.log('   ```json');
console.log('   {');
console.log('     "address": {');
console.log('       "city": "Suburb",');
console.log('       "city_label": "Suburb"');
console.log('     }');
console.log('   }');
console.log('   ```\n');

console.log('**Step 4: Save and Apply**');
console.log('   → Click "Save"');
console.log('   → Theme will auto-update\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('🎨 ALTERNATIVE: CSS-Only Solution (Quick Fix)\n');

console.log('If you cannot access theme files, use CSS to hide and replace:\n');

console.log('**Add to Settings → Advanced → Script Manager:**\n');

const cssScript = `
<style>
/* Hide original "City" label */
label[for*="city"]:not([for*="citySelect"]) {
    font-size: 0 !important;
}

/* Add "Suburb" text */
label[for*="city"]:not([for*="citySelect"])::after {
    content: "Suburb";
    font-size: 14px;
    font-weight: normal;
}

/* Also update any City text in checkout */
.optimizedCheckout-form-label:has(+ input[name*="city"])::after {
    content: "Suburb" !important;
}
</style>
`;

console.log(cssScript);

console.log('\n**When to inject:** Checkout page');
console.log('**Placement:** Header or Footer\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('🚀 RECOMMENDED PATH:\n');

console.log('1. Login to BigCommerce Admin');
console.log('2. Go to: Storefront → Themes → [Your Theme] → Advanced');
console.log('3. Click: "Edit Theme Files"');
console.log('4. Find: lang/en.json');
console.log('5. Search for: "city"');
console.log('6. Change ALL instances to: "suburb"');
console.log('7. Save file\n');

console.log('This is the cleanest, most permanent solution.\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('📞 Need Help?\n');

console.log('If you get stuck:');
console.log('1. Take a screenshot of where you are in BigCommerce admin');
console.log('2. Share it and I can guide you to the exact location');
console.log('3. Or I can provide JavaScript that works without theme access\n');

console.log('═══════════════════════════════════════════════════\n');

console.log('✅ What you are looking for:\n');
console.log('   Storefront → My Themes → [Active Theme]');
console.log('   └─ "Advanced" dropdown → "Edit Theme Files"');
console.log('      └─ lang folder → en.json file\n');

console.log('═══════════════════════════════════════════════════\n');
