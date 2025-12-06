/**
 * Sync BigCommerce Categories to Supabase
 *
 * This script:
 * 1. Fetches all categories from BigCommerce API
 * 2. Builds category hierarchy and paths
 * 3. Syncs categories to Supabase bc_categories table
 * 4. Populates product_category_links from existing bc_products.categories data
 * 5. Updates product counts on categories
 *
 * Run with: npx tsx sync-categories-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const BC_STORE_HASH = 'hhhi'
const BC_ACCESS_TOKEN = 'd9y2srla3treynpbtmp4f3u1bomdna2'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// BigCommerce API client
const bcApi = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3`,
  headers: {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Types
interface BCCategory {
  id: number
  parent_id: number
  name: string
  description?: string
  views?: number
  sort_order?: number
  page_title?: string
  meta_keywords?: string[]
  meta_description?: string
  layout_file?: string
  image_url?: string
  is_visible?: boolean
  search_keywords?: string
  default_product_sort?: string
  custom_url?: {
    url: string
    is_customized: boolean
  }
}

interface BCCategoryApiResponse {
  data: BCCategory[]
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

interface CategoryWithPath extends BCCategory {
  tree_depth: number
  category_path: string
  category_path_ids: number[]
}

// Fetch all categories from BigCommerce
async function fetchAllBCCategories(): Promise<BCCategory[]> {
  console.log('Fetching BigCommerce categories...')

  let allCategories: BCCategory[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    console.log(`  -> Fetching page ${page}/${totalPages || '?'}...`)

    try {
      const response = await bcApi.get<BCCategoryApiResponse>('/catalog/categories', {
        params: {
          limit: 250,
          page: page
        }
      })

      const { data, meta } = response.data
      allCategories = allCategories.concat(data)

      totalPages = meta.pagination.total_pages
      console.log(`  Fetched ${data.length} categories (Total: ${allCategories.length}/${meta.pagination.total})`)

      page++

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error: any) {
      console.error(`  Error fetching page ${page}:`, error.message)
      if (error.response?.status === 429) {
        console.log('  Rate limited, waiting 60 seconds...')
        await new Promise(resolve => setTimeout(resolve, 60000))
        continue
      }
      throw error
    }
  }

  console.log(`Fetched ${allCategories.length} categories total\n`)
  return allCategories
}

// Build category hierarchy and paths
function buildCategoryPaths(categories: BCCategory[]): CategoryWithPath[] {
  console.log('Building category hierarchy...')

  const categoryMap = new Map<number, BCCategory>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  const categoriesWithPaths: CategoryWithPath[] = []

  for (const category of categories) {
    // Build path by traversing parents
    const pathParts: string[] = []
    const pathIds: number[] = []
    let currentId = category.id
    let depth = 0

    // Traverse up to root
    while (currentId !== 0) {
      const current = categoryMap.get(currentId)
      if (!current) break

      pathParts.unshift(current.name)
      pathIds.unshift(current.id)

      currentId = current.parent_id
      if (currentId !== 0) depth++
    }

    categoriesWithPaths.push({
      ...category,
      tree_depth: depth,
      category_path: pathParts.join(' > '),
      category_path_ids: pathIds
    })
  }

  // Sort by depth then name for consistent ordering
  categoriesWithPaths.sort((a, b) => {
    if (a.tree_depth !== b.tree_depth) return a.tree_depth - b.tree_depth
    return a.name.localeCompare(b.name)
  })

  console.log(`Built paths for ${categoriesWithPaths.length} categories`)
  console.log(`  Root categories: ${categoriesWithPaths.filter(c => c.tree_depth === 0).length}`)
  console.log(`  Max depth: ${Math.max(...categoriesWithPaths.map(c => c.tree_depth))}\n`)

  return categoriesWithPaths
}

// Transform BC category for Supabase
function transformCategory(category: CategoryWithPath) {
  return {
    bc_category_id: category.id,
    name: category.name,
    description: category.description || null,
    parent_id: category.parent_id,
    tree_depth: category.tree_depth,
    sort_order: category.sort_order || 0,
    custom_url: category.custom_url || null,
    page_title: category.page_title || null,
    meta_keywords: category.meta_keywords || null,
    meta_description: category.meta_description || null,
    search_keywords: category.search_keywords || null,
    image_url: category.image_url || null,
    is_visible: category.is_visible ?? true,
    default_product_sort: category.default_product_sort || null,
    layout_file: category.layout_file || null,
    views: category.views || 0,
    category_path: category.category_path,
    category_path_ids: category.category_path_ids,
    raw_data: category,
    is_active: true,
    synced_at: new Date().toISOString()
  }
}

// Sync categories to Supabase
async function syncCategoriesToSupabase(categories: CategoryWithPath[]) {
  console.log(`Syncing ${categories.length} categories to Supabase...`)

  const transformedCategories = categories.map(transformCategory)

  // Upsert in batches
  const BATCH_SIZE = 100
  let synced = 0
  let errors = 0

  for (let i = 0; i < transformedCategories.length; i += BATCH_SIZE) {
    const batch = transformedCategories.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(transformedCategories.length / BATCH_SIZE)

    console.log(`  -> Batch ${batchNum}/${totalBatches} (${batch.length} categories)...`)

    try {
      const { error } = await supabase
        .from('bc_categories')
        .upsert(batch, {
          onConflict: 'bc_category_id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`  Batch ${batchNum} error:`, error.message)
        errors += batch.length
      } else {
        synced += batch.length
        console.log(`  Batch ${batchNum} synced (${synced}/${transformedCategories.length})`)
      }

      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`  Batch ${batchNum} exception:`, error.message)
      errors += batch.length
    }
  }

  console.log(`\nCategories sync complete!`)
  console.log(`  Synced: ${synced}`)
  console.log(`  Errors: ${errors}\n`)

  return synced
}

// Populate product_category_links from bc_products.categories
async function populateProductCategoryLinks() {
  console.log('Populating product-category links...')

  // Fetch all products with their categories
  let page = 0
  const PAGE_SIZE = 1000
  let totalProducts = 0
  let totalLinks = 0

  while (true) {
    const { data: products, error } = await supabase
      .from('bc_products')
      .select('bc_product_id, categories')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('bc_product_id')

    if (error) {
      console.error('Error fetching products:', error.message)
      break
    }

    if (!products || products.length === 0) break

    console.log(`  Processing products ${page * PAGE_SIZE + 1}-${page * PAGE_SIZE + products.length}...`)

    // Build links for this batch
    const links: { bc_product_id: number; bc_category_id: number; is_primary_category: boolean }[] = []

    for (const product of products) {
      if (product.categories && Array.isArray(product.categories)) {
        product.categories.forEach((categoryId: number, index: number) => {
          links.push({
            bc_product_id: product.bc_product_id,
            bc_category_id: categoryId,
            is_primary_category: index === 0 // First category is primary
          })
        })
      }
    }

    if (links.length > 0) {
      // Upsert links
      const { error: linkError } = await supabase
        .from('product_category_links')
        .upsert(links, {
          onConflict: 'bc_product_id,bc_category_id',
          ignoreDuplicates: false
        })

      if (linkError) {
        console.error('  Error inserting links:', linkError.message)
      } else {
        totalLinks += links.length
      }
    }

    totalProducts += products.length

    if (products.length < PAGE_SIZE) break
    page++

    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log(`\nProduct-category links complete!`)
  console.log(`  Products processed: ${totalProducts}`)
  console.log(`  Links created: ${totalLinks}\n`)

  return totalLinks
}

// Update product counts on categories
async function updateCategoryProductCounts() {
  console.log('Updating category product counts...')

  // Use a raw query to update counts efficiently
  const { data, error } = await supabase.rpc('update_category_product_counts')

  if (error) {
    // If the function doesn't exist, do it manually
    console.log('  RPC not available, updating manually...')

    // Get counts per category
    const { data: counts, error: countError } = await supabase
      .from('product_category_links')
      .select('bc_category_id')

    if (countError) {
      console.error('Error getting counts:', countError.message)
      return
    }

    // Count products per category
    const countMap = new Map<number, number>()
    counts?.forEach(link => {
      const count = countMap.get(link.bc_category_id) || 0
      countMap.set(link.bc_category_id, count + 1)
    })

    // Update each category
    let updated = 0
    for (const [categoryId, count] of countMap) {
      const { error: updateError } = await supabase
        .from('bc_categories')
        .update({ product_count: count })
        .eq('bc_category_id', categoryId)

      if (!updateError) updated++
    }

    console.log(`  Updated ${updated} category counts\n`)
    return
  }

  console.log('  Product counts updated via RPC\n')
}

// Generate category analysis report
async function generateAnalysisReport() {
  console.log('Generating category analysis report...\n')

  // Stats overview
  const { data: stats } = await supabase
    .from('v_category_stats')
    .select('*')

  console.log('=== CATEGORY STATISTICS ===')
  stats?.forEach(stat => {
    console.log(`  ${stat.metric}: ${stat.value}`)
  })

  // Empty categories
  const { data: empty, count: emptyCount } = await supabase
    .from('bc_categories')
    .select('name, category_path', { count: 'exact' })
    .eq('product_count', 0)
    .eq('is_active', true)
    .limit(10)

  console.log(`\n=== EMPTY CATEGORIES (${emptyCount} total) ===`)
  empty?.slice(0, 10).forEach(cat => {
    console.log(`  - ${cat.category_path || cat.name}`)
  })
  if (emptyCount && emptyCount > 10) console.log(`  ... and ${emptyCount - 10} more`)

  // Categories with low products
  const { data: lowProduct, count: lowCount } = await supabase
    .from('bc_categories')
    .select('name, category_path, product_count', { count: 'exact' })
    .gt('product_count', 0)
    .lt('product_count', 5)
    .eq('is_active', true)
    .order('product_count')
    .limit(10)

  console.log(`\n=== LOW PRODUCT CATEGORIES (<5 products, ${lowCount} total) ===`)
  lowProduct?.forEach(cat => {
    console.log(`  - ${cat.category_path || cat.name} (${cat.product_count} products)`)
  })
  if (lowCount && lowCount > 10) console.log(`  ... and ${lowCount - 10} more`)

  // Categories missing descriptions
  const { count: noDescCount } = await supabase
    .from('bc_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('description.is.null,description.eq.')

  console.log(`\n=== CONTENT GAPS ===`)
  console.log(`  Categories without description: ${noDescCount}`)

  // Missing meta descriptions
  const { count: noMetaCount } = await supabase
    .from('bc_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('meta_description.is.null,meta_description.eq.')

  console.log(`  Categories without meta description: ${noMetaCount}`)

  // Missing images
  const { count: noImageCount } = await supabase
    .from('bc_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('image_url', null)

  console.log(`  Categories without image: ${noImageCount}`)

  // Top categories by product count
  const { data: topCategories } = await supabase
    .from('bc_categories')
    .select('name, category_path, product_count')
    .eq('is_active', true)
    .order('product_count', { ascending: false })
    .limit(10)

  console.log(`\n=== TOP 10 CATEGORIES BY PRODUCT COUNT ===`)
  topCategories?.forEach((cat, i) => {
    console.log(`  ${i + 1}. ${cat.category_path || cat.name} (${cat.product_count} products)`)
  })

  // Category depth distribution
  const { data: depthData } = await supabase
    .from('bc_categories')
    .select('tree_depth')
    .eq('is_active', true)

  const depthCounts = new Map<number, number>()
  depthData?.forEach(cat => {
    const count = depthCounts.get(cat.tree_depth) || 0
    depthCounts.set(cat.tree_depth, count + 1)
  })

  console.log(`\n=== CATEGORY DEPTH DISTRIBUTION ===`)
  Array.from(depthCounts.entries()).sort((a, b) => a[0] - b[0]).forEach(([depth, count]) => {
    console.log(`  Level ${depth}: ${count} categories`)
  })

  console.log('\n')
}

// Main execution
async function main() {
  const startTime = Date.now()

  console.log('=========================================')
  console.log('BigCommerce -> Supabase Category Sync')
  console.log('=========================================\n')

  try {
    // Step 1: Fetch categories from BigCommerce
    const categories = await fetchAllBCCategories()

    if (categories.length === 0) {
      console.log('No categories found in BigCommerce')
      return
    }

    // Step 2: Build hierarchy and paths
    const categoriesWithPaths = buildCategoryPaths(categories)

    // Step 3: Sync to Supabase
    await syncCategoriesToSupabase(categoriesWithPaths)

    // Step 4: Populate product-category links
    await populateProductCategoryLinks()

    // Step 5: Update product counts
    await updateCategoryProductCounts()

    // Step 6: Generate analysis report
    await generateAnalysisReport()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`=========================================`)
    console.log(`Sync complete in ${duration}s`)
    console.log(`=========================================`)

    // Verify
    const { count: catCount } = await supabase
      .from('bc_categories')
      .select('*', { count: 'exact', head: true })

    const { count: linkCount } = await supabase
      .from('product_category_links')
      .select('*', { count: 'exact', head: true })

    console.log(`\nFinal counts:`)
    console.log(`  Categories: ${catCount}`)
    console.log(`  Product-Category Links: ${linkCount}`)

  } catch (error: any) {
    console.error('\nSync failed:', error.message)
    process.exit(1)
  }
}

// Run
main()
