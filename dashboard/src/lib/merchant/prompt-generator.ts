// GMC Fix Prompt Generator
// Generates prompts for Claude Code to fix Google Merchant Center issues

export interface GMCIssue {
  issue_code: string
  severity: string
  description: string
  resolution: string | null
  product_count: number
  total_impressions: number
  total_clicks: number
  fixability: 'auto' | 'semi-auto' | 'manual' | 'unknown'
  status: 'pending' | 'in_progress' | 'fixed' | 'verified'
}

export interface GMCProduct {
  product_id: string
  offer_id: string
  title: string
  approval_status: string
  impressions_30d: number
  clicks_30d: number
  bc_product_id?: number
}

const issueTypeLabels: Record<string, string> = {
  price_mismatch: 'Price Mismatch',
  price_updated: 'Price Auto-Updated',
  availability_mismatch: 'Availability Mismatch',
  missing_condition: 'Missing Condition',
  out_of_stock: 'Out of Stock',
  missing_gtin: 'Missing GTIN/Barcode',
  invalid_gtin: 'Invalid GTIN',
  gtin_mismatch: 'GTIN Mismatch',
  missing_description: 'Missing Description',
  description_too_short: 'Description Too Short',
  missing_brand: 'Missing Brand',
  title_too_long: 'Title Too Long',
  shipping_weight_missing: 'Missing Shipping Weight',
  image_too_small: 'Image Too Small',
  image_overlay: 'Image Has Overlay',
  image_watermark: 'Image Has Watermark',
  missing_image_link: 'Missing Image',
  image_link_broken: 'Broken Image Link',
  product_policy_violation: 'Policy Violation',
  landing_page_error: 'Landing Page Error',
  prohibited_product: 'Prohibited Product',
  counterfeit_goods: 'Counterfeit Detection',
  brand_gtin_mismatch: 'Brand/GTIN Mismatch',
}

const fixInstructions: Record<string, string> = {
  price_mismatch: `## Fix Strategy
1. Check if BigCommerce has the correct price
2. If BC price is correct, this is a feed timing issue - trigger feed refresh
3. If GMC price is correct, update the product price in BigCommerce:
   \`\`\`typescript
   await bcClient.products.update(productId, { price: correctPrice })
   \`\`\`
4. Wait for next feed sync (usually within 1-2 hours)`,

  price_updated: `## Understanding This Issue
This is an **informational notice** - GMC is automatically updating prices from your feed.
This happens when:
- Your feed price differs from what's on the landing page
- GMC detected a price change and is syncing

**Action Required:** Usually none - this resolves automatically.
If persistent, verify your feed is generating correct prices.`,

  availability_mismatch: `## Fix Strategy
1. Check product availability in BigCommerce admin
2. Update availability to match actual stock status:
   \`\`\`typescript
   await bcClient.products.update(productId, {
     availability: 'available', // or 'disabled'
     inventory_level: actualStock
   })
   \`\`\`
3. Ensure inventory tracking is properly configured`,

  missing_gtin: `## Fix Strategy
1. **Check BigCommerce:** Look for UPC/EAN in product fields
2. **Check Supplier Data:** Query supplier_products table for barcode
3. **Search Manufacturer:** Look up product on manufacturer website
4. **Update BigCommerce:**
   \`\`\`typescript
   await bcClient.products.update(productId, { gtin: 'barcode_value' })
   \`\`\`
5. If no GTIN exists (custom/handmade products), may need to exclude from Shopping`,

  missing_brand: `## Fix Strategy
1. Check if brand exists in BigCommerce product data
2. Parse brand from product title if available
3. Look up in supplier data
4. Update BigCommerce:
   \`\`\`typescript
   await bcClient.products.update(productId, { brand_id: brandId })
   \`\`\``,

  description_too_short: `## Fix Strategy
1. Read current product description
2. Enhance with:
   - Product benefits and features
   - Usage instructions
   - Key ingredients/materials
   - Size/weight specifications
3. Update BigCommerce:
   \`\`\`typescript
   await bcClient.products.update(productId, {
     description: enhancedDescription
   })
   \`\`\`
4. Ensure description is at least 100 characters`,

  title_too_long: `## Fix Strategy
1. GMC title limit is 150 characters
2. Truncate title intelligently:
   - Keep brand name
   - Keep key product identifier
   - Remove redundant descriptors
3. Update in BigCommerce or adjust feed mapping`,

  image_too_small: `## Fix Strategy
1. **Minimum Requirements:** 800x800 pixels for Shopping
2. **Source New Image:**
   - Check manufacturer website
   - Request from supplier
   - Use product photography service
3. **Upload to BigCommerce:**
   - Go to Products > Edit > Images
   - Upload high-resolution image
   - Set as primary image
4. Ensure image URL is publicly accessible`,

  landing_page_error: `## Fix Strategy
This usually means:
1. **Product Discontinued:**
   - Hide product from Shopping feed
   - Create 301 redirect to similar product
2. **URL Mismatch:**
   - Verify product URL in BigCommerce
   - Check for special characters or encoding issues
3. **404 Error:**
   - Product may have been deleted
   - URL slug may have changed

**Actions:**
- If discontinued: \`is_visible: false\` or exclude from feed
- If URL issue: Update product URL slug in BigCommerce`,

  product_policy_violation: `## Fix Strategy
1. **Review Policy:** Check which policy is violated
2. **Common Violations:**
   - Health claims: Remove medical/health claims from title/description
   - Restricted products: May need to exclude from Shopping
   - Misrepresentation: Ensure accurate product information
3. **Update Content:**
   - Remove prohibited terms
   - Ensure compliance with Google Shopping policies
4. **Request Review:** After fixing, request re-review in Merchant Center`,

  prohibited_product: `## Fix Strategy
This product may be prohibited from Google Shopping.
1. Check Google's prohibited content policies
2. Common prohibited categories:
   - Certain supplements
   - Medical devices
   - Adult content
3. **Options:**
   - Exclude from Shopping feed
   - Modify product to comply (if possible)
   - Appeal if you believe it's incorrectly flagged`,
}

function getFixInstructions(issueCode: string): string {
  return fixInstructions[issueCode] || `## Fix Strategy
1. Review the specific issue details
2. Check product data in BigCommerce
3. Apply appropriate correction
4. Wait for feed sync and GMC re-crawl
5. Verify issue is resolved in dashboard`
}

function formatProductList(products: GMCProduct[], maxProducts: number = 20): string {
  const displayed = products.slice(0, maxProducts)
  const remaining = products.length - maxProducts

  let output = displayed.map((p, i) => `
### ${i + 1}. ${p.title}
- **SKU:** \`${p.offer_id}\`
- **BC Product ID:** ${p.bc_product_id || 'Lookup required'}
- **Status:** ${p.approval_status}
- **Impact:** ${p.impressions_30d.toLocaleString()} impressions, ${p.clicks_30d.toLocaleString()} clicks
`).join('\n')

  if (remaining > 0) {
    output += `\n\n*...and ${remaining} more products with this issue*`
  }

  return output
}

export function generateSingleIssuePrompt(issue: GMCIssue, products: GMCProduct[]): string {
  const issueLabel = issueTypeLabels[issue.issue_code] || issue.issue_code

  return `## GMC Issue Fix Request

**Issue Type:** ${issueLabel}
**Issue Code:** \`${issue.issue_code}\`
**Severity:** ${issue.severity}
**Fixability:** ${issue.fixability}
**Affected Products:** ${issue.product_count}
**Business Impact:** ${issue.total_impressions.toLocaleString()} impressions, ${issue.total_clicks.toLocaleString()} clicks (30d)

### Issue Description
${issue.description}

${issue.resolution ? `### GMC Resolution Hint
${issue.resolution}` : ''}

---

${getFixInstructions(issue.issue_code)}

---

## Products to Fix
${formatProductList(products)}

---

## Verification Steps

1. Apply fixes to BigCommerce products
2. Wait 1-2 hours for GMC to re-crawl
3. Return to dashboard: https://ops.growthcohq.com/boo/merchant
4. Click "Verify Fixes" to check if issues are resolved
5. Mark as verified once confirmed

## BigCommerce API Reference

\`\`\`typescript
// Using BC client
import { createBigCommerceConnector } from '@/shared/libs/integrations/bigcommerce'

const bc = await createBigCommerceConnector('boo')

// Update single product
await bc.products.update(productId, {
  price: 19.99,
  gtin: '1234567890123',
  description: 'Enhanced description...',
  is_visible: true
})

// Get product by SKU
const products = await bc.products.list({ sku: 'product-sku' })
\`\`\`
`
}

export function generateBatchFixPrompt(
  issues: GMCIssue[],
  allProducts: Map<string, GMCProduct[]>,
  batchNumber?: number,
  totalBatches?: number
): string {
  const batchInfo = batchNumber && totalBatches
    ? `(Batch ${batchNumber} of ${totalBatches})`
    : ''

  // Group issues by fixability
  const autoFixable = issues.filter(i => i.fixability === 'auto')
  const semiAuto = issues.filter(i => i.fixability === 'semi-auto')
  const manual = issues.filter(i => i.fixability === 'manual' || i.fixability === 'unknown')

  const totalProducts = issues.reduce((sum, i) => sum + i.product_count, 0)
  const totalImpressions = issues.reduce((sum, i) => sum + i.total_impressions, 0)

  const issuesList = issues.map((issue, i) => {
    const products = allProducts.get(issue.issue_code) || []
    const issueLabel = issueTypeLabels[issue.issue_code] || issue.issue_code

    return `### Issue ${i + 1}: ${issueLabel}

**Code:** \`${issue.issue_code}\` | **Severity:** ${issue.severity} | **Products:** ${issue.product_count}

${issue.description}

**Sample Products:**
${products.slice(0, 5).map(p => `- \`${p.offer_id}\`: ${p.title}`).join('\n')}
`
  }).join('\n---\n\n')

  return `## GMC Batch Fix Request ${batchInfo}

**Total Issues:** ${issues.length}
**Total Products Affected:** ${totalProducts}
**Business Impact:** ${totalImpressions.toLocaleString()} impressions (30d)

### Issue Breakdown
- **Auto-fixable:** ${autoFixable.length} issues
- **Semi-auto:** ${semiAuto.length} issues
- **Manual:** ${manual.length} issues

---

## Issues to Fix

${issuesList}

---

## Fix Strategy

1. **Start with Auto-fixable Issues:**
${autoFixable.map(i => `   - ${i.issue_code}: ${i.product_count} products`).join('\n') || '   - None'}

2. **Then Semi-auto Issues:**
${semiAuto.map(i => `   - ${i.issue_code}: ${i.product_count} products`).join('\n') || '   - None'}

3. **Finally Manual Issues:**
${manual.map(i => `   - ${i.issue_code}: ${i.product_count} products`).join('\n') || '   - None'}

---

## After Completing This Batch

1. All fixes applied to BigCommerce
2. Wait for GMC re-crawl (1-2 hours)
3. Return to dashboard: https://ops.growthcohq.com/boo/merchant
4. Click "Verify Fixes" to confirm resolution
5. Report summary of what was fixed

**Dashboard Link:** https://ops.growthcohq.com/boo/merchant
`
}

// Export helper to copy prompt with status update
export async function copyPromptAndUpdateStatus(
  issue: GMCIssue,
  products: GMCProduct[],
  business: string = 'boo'
): Promise<{ prompt: string; copied: boolean }> {
  const prompt = generateSingleIssuePrompt(issue, products)

  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(prompt)

    // Update status to in_progress
    await fetch('/api/merchant/resolution', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business,
        issueCode: issue.issue_code,
        status: 'in_progress',
        fixType: 'claude',
        fixPrompt: prompt.substring(0, 1000) // Store first 1000 chars
      })
    })

    return { prompt, copied: true }
  } catch (error) {
    console.error('Failed to copy prompt:', error)
    return { prompt, copied: false }
  }
}
