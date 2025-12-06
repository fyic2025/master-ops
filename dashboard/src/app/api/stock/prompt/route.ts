import { NextRequest, NextResponse } from 'next/server'

interface DispatchProduct {
  id: number
  product_id: number
  product_name: string
  sku: string
  supplier_name: string
  orders_per_week: number
  recommended_stock: number
  validity_issue: string | null
  product_inventory: number | null
  product_visible: boolean | null
  avg_dispatch_days: number
}

interface PromptRequest {
  products: DispatchProduct[]
  action?: 'fix_all' | 'investigate' | 'supplier_report'
}

// POST: Generate Claude Code prompt from selected products
export async function POST(request: NextRequest) {
  try {
    const body: PromptRequest = await request.json()
    const { products, action = 'fix_all' } = body

    if (!products?.length) {
      return NextResponse.json(
        { error: 'products array is required' },
        { status: 400 }
      )
    }

    let prompt: string
    let estimatedActions: string[] = []

    switch (action) {
      case 'fix_all':
        prompt = generateFixAllPrompt(products)
        estimatedActions = getFixActions(products)
        break
      case 'investigate':
        prompt = generateInvestigatePrompt(products)
        estimatedActions = ['Investigate dispatch issues', 'Identify root causes', 'Recommend solutions']
        break
      case 'supplier_report':
        prompt = generateSupplierReportPrompt(products)
        estimatedActions = ['Generate supplier performance report', 'Calculate dispatch metrics']
        break
      default:
        prompt = generateFixAllPrompt(products)
        estimatedActions = getFixActions(products)
    }

    return NextResponse.json({
      prompt,
      productCount: products.length,
      estimatedActions,
    })
  } catch (err: any) {
    console.error('Stock prompt API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function generateFixAllPrompt(products: DispatchProduct[]): string {
  const suppliers = [...new Set(products.map(p => p.supplier_name))].filter(Boolean)

  // Group products by action needed
  const toDisable = products.filter(p => p.validity_issue === 'out_of_stock' && p.product_visible)
  const toHide = products.filter(p => ['not_found', 'discontinued'].includes(p.validity_issue || ''))
  const toUpdateStock = products.filter(p =>
    !p.validity_issue && p.product_inventory !== null && p.product_inventory < p.recommended_stock
  )

  let productTable = '| SKU | Product | Issue | Recommended Action |\n|-----|---------|-------|-------------------|\n'

  products.forEach(p => {
    const issue = getIssueDescription(p)
    const action = getRecommendedAction(p)
    const name = p.product_name.length > 40 ? p.product_name.substring(0, 40) + '...' : p.product_name
    productTable += `| ${p.sku} | ${name} | ${issue} | ${action} |\n`
  })

  return `## BOO Stock Fix Request

**Products**: ${products.length} | **Suppliers**: ${suppliers.join(', ')}

### Summary

- **Disable (zero stock visible)**: ${toDisable.length} products
- **Hide (deleted/discontinued)**: ${toHide.length} products
- **Update inventory**: ${toUpdateStock.length} products

### Products to Fix

${productTable}

### Instructions

1. Activate the \`bigcommerce-expert\` skill
2. For each product above, execute the recommended action via BigCommerce API
3. Use rate limiting (250ms between API calls)
4. After completing fixes, update the dashboard at ops.growthcohq.com/boo/stock

### BigCommerce API Reference

\`\`\`typescript
// Disable product (set visibility false)
PUT /catalog/products/{product_id}
{ "is_visible": false }

// Set availability to disabled
PUT /catalog/products/{product_id}
{ "availability": "disabled" }

// Update inventory level
PUT /catalog/products/{product_id}
{ "inventory_level": <recommended_stock> }
\`\`\`

### Verification

After fixing:
1. Check product visibility in storefront
2. Verify inventory levels in BigCommerce admin
3. Mark products as "resolved" in dashboard
`
}

function generateInvestigatePrompt(products: DispatchProduct[]): string {
  const suppliers = [...new Set(products.map(p => p.supplier_name))].filter(Boolean)

  let productList = products.map(p =>
    `- **${p.sku}** (${p.product_name}): ${p.orders_per_week} orders/week, ${p.avg_dispatch_days} day avg dispatch`
  ).join('\n')

  return `## BOO Dispatch Issue Investigation

**Products**: ${products.length} | **Suppliers**: ${suppliers.join(', ')}

### Products with Slow Dispatch

${productList}

### Investigation Tasks

1. Check supplier lead times for each product
2. Review order history for patterns (e.g., specific days, bulk orders)
3. Identify if issue is supplier-side or inventory-side
4. Check if products are frequently ordered together (bundle opportunity)
5. Evaluate if recommended stock levels are appropriate

### Questions to Answer

- Are these products consistently slow, or only sometimes?
- Is the supplier the bottleneck, or is it internal processing?
- Would increasing stock levels fix the issue, or is it a fulfillment problem?
- Are there alternative suppliers for these products?

### Output

Provide a report with:
1. Root cause for each product
2. Recommended actions (stock adjustment, supplier change, process improvement)
3. Priority order for fixes
`
}

function generateSupplierReportPrompt(products: DispatchProduct[]): string {
  const supplierGroups = products.reduce((acc, p) => {
    const supplier = p.supplier_name || 'Unknown'
    if (!acc[supplier]) {
      acc[supplier] = []
    }
    acc[supplier].push(p)
    return acc
  }, {} as Record<string, DispatchProduct[]>)

  let supplierSummary = Object.entries(supplierGroups).map(([supplier, prods]) => {
    const avgDispatch = prods.reduce((sum, p) => sum + p.avg_dispatch_days, 0) / prods.length
    const totalOrders = prods.reduce((sum, p) => sum + p.orders_per_week, 0)
    const invalidCount = prods.filter(p => p.validity_issue).length

    return `### ${supplier}
- Products with issues: ${prods.length}
- Total orders/week: ${totalOrders.toFixed(1)}
- Avg dispatch days: ${avgDispatch.toFixed(1)}
- Invalid products: ${invalidCount}
`
  }).join('\n')

  return `## BOO Supplier Performance Report

**Report Date**: ${new Date().toISOString().split('T')[0]}
**Products Analyzed**: ${products.length}

${supplierSummary}

### Recommendations

Based on the data above, evaluate:
1. Which suppliers have the worst dispatch performance?
2. Are there products that should be switched to a different supplier?
3. Which supplier relationships need review?

### Action Items

Generate a list of specific actions to improve supplier performance.
`
}

function getIssueDescription(product: DispatchProduct): string {
  if (product.validity_issue === 'out_of_stock') {
    return `Zero stock${product.product_visible ? ', visible' : ''}`
  }
  if (product.validity_issue === 'not_found') {
    return 'Product not in catalog'
  }
  if (product.validity_issue === 'discontinued') {
    return 'Discontinued'
  }
  if (product.validity_issue === 'hidden') {
    return 'Already hidden'
  }
  if (product.product_inventory !== null && product.product_inventory < product.recommended_stock) {
    return `Low stock (${product.product_inventory} < ${product.recommended_stock})`
  }
  return `${product.avg_dispatch_days}d avg dispatch`
}

function getRecommendedAction(product: DispatchProduct): string {
  if (product.validity_issue === 'out_of_stock' && product.product_visible) {
    return 'Disable visibility'
  }
  if (['not_found', 'discontinued'].includes(product.validity_issue || '')) {
    return 'Hide product'
  }
  if (product.product_inventory !== null && product.product_inventory < product.recommended_stock) {
    return `Set stock to ${product.recommended_stock}`
  }
  return 'Review dispatch process'
}

function getFixActions(products: DispatchProduct[]): string[] {
  const actions: string[] = []

  const toDisable = products.filter(p => p.validity_issue === 'out_of_stock' && p.product_visible).length
  const toHide = products.filter(p => ['not_found', 'discontinued'].includes(p.validity_issue || '')).length
  const toUpdate = products.filter(p =>
    !p.validity_issue && p.product_inventory !== null && p.product_inventory < p.recommended_stock
  ).length

  if (toDisable > 0) actions.push(`Disable ${toDisable} zero-stock products`)
  if (toHide > 0) actions.push(`Hide ${toHide} deleted/discontinued products`)
  if (toUpdate > 0) actions.push(`Update inventory for ${toUpdate} products`)

  return actions.length ? actions : ['Review products for manual action']
}
