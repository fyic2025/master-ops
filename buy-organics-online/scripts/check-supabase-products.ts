import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // Get total count
  const { count } = await supabase
    .from('ecommerce_products')
    .select('*', { count: 'exact', head: true })

  console.log('Total products in ecommerce_products:', count)

  // Get sample product with all fields
  const { data: sample, error } = await supabase
    .from('ecommerce_products')
    .select('*')
    .limit(3)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('\n=== Sample Products ===')
  if (sample) {
    for (let i = 0; i < sample.length; i++) {
      const p = sample[i]
      console.log('\nProduct ' + (i + 1) + ':')
      console.log('  SKU:', p.sku)
      console.log('  Name:', p.name)
      console.log('  Price:', p.price)
      console.log('  Cost:', p.cost_price)
      console.log('  Brand:', p.brand)
      console.log('  Inventory:', p.inventory_level)
      console.log('  Visible:', p.is_visible)
      console.log('  UPC:', p.upc)
      console.log('  GTIN:', p.gtin)
      console.log('  Categories:', JSON.stringify(p.categories))
      console.log('  Custom Fields:', JSON.stringify(p.custom_fields)?.slice(0, 300))
      console.log('  Metadata:', JSON.stringify(p.metadata))
      console.log('  Images:', p.images?.length || 0, 'images')
    }
  }

  // Get column info
  console.log('\n=== Current Table Columns ===')
  if (sample && sample[0]) {
    console.log('Columns:', Object.keys(sample[0]).join(', '))
  }
}

main()
