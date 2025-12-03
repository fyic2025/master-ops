#!/usr/bin/env npx tsx
/**
 * Deploy BigCommerce Product Sync Workflow to n8n
 *
 * This creates and deploys a workflow that syncs BOO BigCommerce products daily at 3 AM AEST
 */

import 'dotenv/config'

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJmYmQ0ZS1lYmUxLTQzMzMtYjNkMi01ZWFkYThiNzI2NDQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzODUyMDAxfQ.sncjYpQTtaeK9t1cssVSv0GrMdm4kJ8ei4hYS9y4dq8'
const N8N_URL = 'https://automation.growthcohq.com'

// Credentials
const BC_STORE_HASH = 'hhhi'
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn'
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const workflow = {
  name: "BOO - BigCommerce Product Sync (Daily 3AM)",
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 17 * * *"  // 17:00 UTC = 3:00 AM AEST (UTC+10)
            }
          ]
        }
      },
      id: "schedule-trigger",
      name: "Daily 3AM AEST",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300]
    },
    {
      parameters: {},
      id: "manual-trigger",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 480]
    },
    {
      parameters: {
        jsCode: `// Initialize pagination
return [{
  json: {
    page: 1,
    allProducts: [],
    startTime: new Date().toISOString()
  }
}];`
      },
      id: "init",
      name: "Initialize",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [480, 380]
    },
    {
      parameters: {
        method: "GET",
        url: `=https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3/catalog/products?include=variants,images&limit=250&page={{ $json.page }}`,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "X-Auth-Token", value: BC_ACCESS_TOKEN },
            { name: "Content-Type", value: "application/json" },
            { name: "Accept", value: "application/json" }
          ]
        },
        options: {
          timeout: 60000
        }
      },
      id: "fetch-products",
      name: "Fetch BC Products",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [720, 380]
    },
    {
      parameters: {
        jsCode: `// Transform products for Supabase
const response = $input.first().json;
const products = response.data || [];
const pagination = response.meta?.pagination || {};
const previousData = $('Initialize').first().json;

console.log(\`Page \${pagination.current_page}/\${pagination.total_pages}: \${products.length} products\`);

// Transform products
const transformed = products.map(p => ({
  sku: p.sku || \`BC-\${p.id}\`,
  product_id: p.id,
  name: p.name,
  price: parseFloat(p.price) || 0,
  sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
  cost_price: p.cost_price ? parseFloat(p.cost_price) : null,
  inventory_level: parseInt(p.inventory_level) || 0,
  is_visible: p.is_visible !== false,
  availability: p.availability || 'available',
  barcode: p.upc || p.gtin || p.ean || null,
  brand: p.brand_name || null,
  weight: p.weight ? parseFloat(p.weight) : null,
  categories: p.categories || [],
  images: (p.images || []).map(img => img.url_standard || img.url_thumbnail),
  last_synced_at: new Date().toISOString()
}));

// Collect all products
const allProducts = [...(previousData.allProducts || []), ...transformed];

return [{
  json: {
    products: transformed,
    allProducts: allProducts,
    currentPage: pagination.current_page || 1,
    totalPages: pagination.total_pages || 1,
    hasMore: pagination.current_page < pagination.total_pages,
    page: (pagination.current_page || 1) + 1,
    startTime: previousData.startTime,
    totalProducts: pagination.total || allProducts.length
  }
}];`
      },
      id: "transform",
      name: "Transform Products",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [960, 380]
    },
    {
      parameters: {
        method: "POST",
        url: `${SUPABASE_URL}/rest/v1/ecommerce_products`,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: SUPABASE_SERVICE_KEY },
            { name: "Authorization", value: `Bearer ${SUPABASE_SERVICE_KEY}` },
            { name: "Content-Type", value: "application/json" },
            { name: "Prefer", value: "resolution=merge-duplicates" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.products) }}",
        options: {
          timeout: 30000
        }
      },
      id: "upsert-supabase",
      name: "Upsert to Supabase",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1200, 380]
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict"
          },
          conditions: [
            {
              id: "has-more",
              leftValue: "={{ $json.hasMore }}",
              rightValue: true,
              operator: {
                type: "boolean",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      id: "check-more",
      name: "More Pages?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [1440, 380]
    },
    {
      parameters: {
        jsCode: `// Prepare for next page fetch
const data = $input.first().json;
return [{
  json: {
    page: data.page,
    allProducts: data.allProducts,
    startTime: data.startTime
  }
}];`
      },
      id: "next-page",
      name: "Next Page",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1680, 280]
    },
    {
      parameters: {
        jsCode: `// Final summary
const data = $input.first().json;
const endTime = new Date().toISOString();
const startTime = data.startTime;
const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

console.log(\`\\n=== BOO BigCommerce Product Sync Complete ===\`);
console.log(\`Total products synced: \${data.totalProducts || data.allProducts?.length || 0}\`);
console.log(\`Pages processed: \${data.currentPage || 1}\`);
console.log(\`Duration: \${duration.toFixed(1)}s\`);
console.log(\`Completed: \${endTime}\`);

return [{
  json: {
    status: 'success',
    totalProducts: data.totalProducts || data.allProducts?.length || 0,
    pagesProcessed: data.currentPage || 1,
    duration: \`\${duration.toFixed(1)}s\`,
    completedAt: endTime
  }
}];`
      },
      id: "summary",
      name: "Complete",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1680, 480]
    }
  ],
  connections: {
    "Daily 3AM AEST": {
      main: [[{ node: "Initialize", type: "main", index: 0 }]]
    },
    "Manual Trigger": {
      main: [[{ node: "Initialize", type: "main", index: 0 }]]
    },
    "Initialize": {
      main: [[{ node: "Fetch BC Products", type: "main", index: 0 }]]
    },
    "Fetch BC Products": {
      main: [[{ node: "Transform Products", type: "main", index: 0 }]]
    },
    "Transform Products": {
      main: [[{ node: "Upsert to Supabase", type: "main", index: 0 }]]
    },
    "Upsert to Supabase": {
      main: [[{ node: "More Pages?", type: "main", index: 0 }]]
    },
    "More Pages?": {
      main: [
        [{ node: "Next Page", type: "main", index: 0 }],
        [{ node: "Complete", type: "main", index: 0 }]
      ]
    },
    "Next Page": {
      main: [[{ node: "Fetch BC Products", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all"
  }
}

async function deploy() {
  console.log('Deploying BOO BigCommerce Product Sync workflow to n8n...\n')

  try {
    // Create the workflow
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create workflow: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log(`Workflow created successfully!`)
    console.log(`ID: ${result.id}`)
    console.log(`URL: ${N8N_URL}/workflow/${result.id}`)

    // Activate the workflow
    console.log('\nActivating workflow...')
    const activateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    })

    if (activateResponse.ok) {
      console.log('Workflow activated!')
    } else {
      console.log('Warning: Could not activate workflow. Activate manually in n8n.')
    }

    // Execute the workflow once to test
    console.log('\nTriggering test execution...')
    const execResponse = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (execResponse.ok) {
      const execResult = await execResponse.json()
      console.log(`Execution started! ID: ${execResult.data?.executionId || 'N/A'}`)
      console.log(`\nMonitor progress at: ${N8N_URL}/execution/${execResult.data?.executionId || ''}`)
    } else {
      console.log('Could not trigger execution via API. Run manually in n8n.')
    }

    console.log('\n=== Deployment Complete ===')
    console.log(`Workflow URL: ${N8N_URL}/workflow/${result.id}`)
    console.log('Schedule: Daily at 3:00 AM AEST (17:00 UTC)')

    return result.id

  } catch (error) {
    console.error('Deployment failed:', error)
    process.exit(1)
  }
}

deploy()
