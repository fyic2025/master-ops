/**
 * Import Teelixir Products to Supabase
 * Handles the product data you showed me
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Product {
  id: number
  bc_sku: string
  sku: string
  name: string
  old_availability: string
  availability: string
  status: string
  old_inventory_level: number
  inventory_level: number
  keyword: string
  AvailableQty: string | number
  ignore: string
}

async function createProductsTable() {
  console.log('📦 Creating products table...\n')

  // Note: This SQL needs to be run in Supabase dashboard
  const createTableSQL = `
-- Create products table with multi-business support
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business business_type NOT NULL,

  -- Product identifiers
  external_id INT,
  bc_sku TEXT,
  sku TEXT NOT NULL,

  -- Product details
  name TEXT NOT NULL,
  description TEXT,

  -- Availability
  availability TEXT,
  status TEXT,

  -- Inventory
  inventory_level INT DEFAULT 0,
  available_qty INT DEFAULT 0,

  -- Metadata
  keyword TEXT,
  ignore_product BOOLEAN DEFAULT false,

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  UNIQUE(business, sku)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_bc_sku ON products(bc_sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`

  console.log('SQL to create products table:')
  console.log('=' .repeat(60))
  console.log(createTableSQL)
  console.log('=' .repeat(60))
  console.log('\n⚠️  Copy the SQL above and run it in Supabase Dashboard first!\n')
}

async function importProducts(jsonFilePath: string) {
  console.log('📥 Importing Teelixir products from JSON...\n')

  try {
    // Read JSON file
    const jsonData = readFileSync(jsonFilePath, 'utf-8')
    const products: Product[] = JSON.parse(jsonData)

    console.log(`Found ${products.length} products to import\n`)

    // Determine business based on keyword
    const getBusinessFromKeyword = (keyword: string): string => {
      if (keyword.includes('Teelixir')) return 'teelixir'
      if (keyword.startsWith('OB')) return 'buy_organics'
      if (keyword.startsWith('KAD')) return 'elevate_wholesale'
      if (keyword.startsWith('KIK')) return 'elevate_wholesale'
      return 'master_ops'
    }

    // Group by business
    const byBusiness: Record<string, Product[]> = {}
    products.forEach(p => {
      const business = getBusinessFromKeyword(p.keyword)
      if (!byBusiness[business]) byBusiness[business] = []
      byBusiness[business].push(p)
    })

    console.log('Products by business:')
    Object.entries(byBusiness).forEach(([biz, prods]) => {
      console.log(`  - ${biz}: ${prods.length} products`)
    })
    console.log()

    // Import each business
    let imported = 0
    let errors = 0

    for (const [business, businessProducts] of Object.entries(byBusiness)) {
      console.log(`\n📦 Importing ${businessProducts.length} ${business} products...`)

      // Transform to database format
      const dbProducts = businessProducts.map(p => ({
        business,
        external_id: p.id,
        bc_sku: p.bc_sku,
        sku: p.sku,
        name: p.name,
        availability: p.availability,
        status: p.status,
        inventory_level: p.inventory_level || 0,
        available_qty: typeof p.AvailableQty === 'number' ? p.AvailableQty : 0,
        keyword: p.keyword,
        ignore_product: p.ignore === 'YES',
        metadata: {
          old_availability: p.old_availability,
          old_inventory_level: p.old_inventory_level
        }
      }))

      // Batch insert (Supabase limit is 1000 per request)
      const batchSize = 100
      for (let i = 0; i < dbProducts.length; i += batchSize) {
        const batch = dbProducts.slice(i, i + batchSize)

        const { data, error } = await supabase
          .from('products')
          .upsert(batch, {
            onConflict: 'business,sku'
          })

        if (error) {
          console.error(`   ❌ Error importing batch ${i / batchSize + 1}:`, error.message)
          errors += batch.length
        } else {
          imported += batch.length
          console.log(`   ✅ Imported batch ${i / batchSize + 1} (${batch.length} products)`)
        }
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log(`✅ Import complete!`)
    console.log(`   Imported: ${imported}`)
    console.log(`   Errors: ${errors}`)
    console.log('=' .repeat(60))

    // Show summary
    const { data: summary } = await supabase
      .from('products')
      .select('business, count(*)')
      .group('business')

    console.log('\n📊 Product Summary by Business:')
    console.table(summary)

  } catch (error) {
    console.error('❌ Import error:', error)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage:')
    console.log('  1. Create table: npx tsx import-teelixir-products.ts --create-table')
    console.log('  2. Import data:  npx tsx import-teelixir-products.ts <path-to-json>')
    console.log('\nExample:')
    console.log('  npx tsx import-teelixir-products.ts "C:/Users/jayso/OneDrive/Pictures/Screenshots/1763780560826.json"')
    process.exit(0)
  }

  if (args[0] === '--create-table') {
    await createProductsTable()
  } else {
    await importProducts(args[0])
  }
}

main()
