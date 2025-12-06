#!/usr/bin/env npx tsx
/**
 * Unleashed Field Analyzer
 *
 * Walks through raw discovery JSONB data and catalogs:
 * - Every field path found (e.g., 'Customer.Email', 'SalesOrderLines[].Product.Barcode')
 * - Data types for each field
 * - Sample values (up to 5 examples)
 * - Population rates (% of records with data)
 *
 * Usage:
 *   npx tsx teelixir/scripts/analyze-unleashed-fields.ts --store=teelixir
 *   npx tsx teelixir/scripts/analyze-unleashed-fields.ts --store=teelixir --endpoint=Products
 *   npx tsx teelixir/scripts/analyze-unleashed-fields.ts --store=teelixir --report
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: 'c:/Users/jayso/master-ops/.env' })

// =============================================================================
// Types
// =============================================================================

interface FieldStats {
  fieldPath: string
  fieldType: string
  nullCount: number
  populatedCount: number
  emptyStringCount: number
  totalRecords: number
  populationRate: number
  sampleValues: any[]
  minValue?: number
  maxValue?: number
  avgValue?: number
  minLength?: number
  maxLength?: number
  distinctValues: number
}

interface AnalysisOptions {
  store: string
  endpoint?: string
  report?: boolean
  maxSamples?: number
}

// =============================================================================
// Field Path Walker
// =============================================================================

/**
 * Recursively walk through an object and collect all field paths with their values
 */
function walkObject(
  obj: any,
  currentPath: string = '',
  results: Map<string, any[]>
): void {
  if (obj === null || obj === undefined) {
    if (currentPath) {
      const values = results.get(currentPath) || []
      values.push(null)
      results.set(currentPath, values)
    }
    return
  }

  if (Array.isArray(obj)) {
    // For arrays, mark the path with [] and recurse into each element
    const arrayPath = currentPath ? `${currentPath}[]` : '[]'

    if (obj.length === 0) {
      const values = results.get(arrayPath) || []
      values.push([])
      results.set(arrayPath, values)
    } else {
      for (const item of obj) {
        walkObject(item, arrayPath, results)
      }
    }
    return
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key

      if (value === null || value === undefined) {
        const values = results.get(newPath) || []
        values.push(null)
        results.set(newPath, values)
      } else if (Array.isArray(value)) {
        walkObject(value, newPath, results)
      } else if (typeof value === 'object') {
        walkObject(value, newPath, results)
      } else {
        // Primitive value
        const values = results.get(newPath) || []
        values.push(value)
        results.set(newPath, values)
      }
    }
    return
  }

  // Primitive at root level (shouldn't happen, but handle it)
  if (currentPath) {
    const values = results.get(currentPath) || []
    values.push(obj)
    results.set(currentPath, values)
  }
}

/**
 * Determine the type of a value
 */
function getValueType(value: any): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') {
    // Check for date patterns
    if (/^\/Date\(\d+\)\/$/.test(value)) return 'date'
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    return 'string'
  }
  return typeof value
}

/**
 * Analyze collected values for a field path
 */
function analyzeFieldValues(fieldPath: string, values: any[], maxSamples: number = 5): FieldStats {
  const totalRecords = values.length
  let nullCount = 0
  let emptyStringCount = 0
  let populatedCount = 0
  const uniqueValues = new Set<string>()
  const numericValues: number[] = []
  const stringLengths: number[] = []
  const sampleValues: any[] = []
  const types = new Set<string>()

  for (const value of values) {
    const type = getValueType(value)
    types.add(type)

    if (value === null || value === undefined) {
      nullCount++
    } else if (value === '') {
      emptyStringCount++
      nullCount++ // Count empty strings as effectively null
    } else {
      populatedCount++

      // Collect samples (up to maxSamples unique values)
      const valueStr = JSON.stringify(value)
      if (!uniqueValues.has(valueStr) && sampleValues.length < maxSamples) {
        sampleValues.push(value)
      }
      uniqueValues.add(valueStr)

      // Numeric statistics
      if (typeof value === 'number') {
        numericValues.push(value)
      }

      // String length statistics
      if (typeof value === 'string') {
        stringLengths.push(value.length)
      }
    }
  }

  // Determine the dominant type (excluding null)
  types.delete('null')
  let fieldType = types.size === 0 ? 'null' : types.size === 1 ? Array.from(types)[0] : 'mixed'

  const stats: FieldStats = {
    fieldPath,
    fieldType,
    nullCount,
    populatedCount,
    emptyStringCount,
    totalRecords,
    populationRate: totalRecords > 0 ? Math.round((populatedCount / totalRecords) * 10000) / 100 : 0,
    sampleValues,
    distinctValues: uniqueValues.size,
  }

  // Add numeric stats if applicable
  if (numericValues.length > 0) {
    stats.minValue = Math.min(...numericValues)
    stats.maxValue = Math.max(...numericValues)
    stats.avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
  }

  // Add string stats if applicable
  if (stringLengths.length > 0) {
    stats.minLength = Math.min(...stringLengths)
    stats.maxLength = Math.max(...stringLengths)
  }

  return stats
}

// =============================================================================
// Main Analyzer
// =============================================================================

async function analyzeEndpoint(
  supabase: SupabaseClient,
  store: string,
  endpoint: string,
  maxSamples: number = 5
): Promise<FieldStats[]> {
  console.log(`\nAnalyzing ${endpoint}...`)

  // Fetch all discovery data for this endpoint
  const { data: discoveries, error } = await supabase
    .from('ul_raw_discovery')
    .select('raw_response, record_count')
    .eq('store', store)
    .eq('endpoint', endpoint)
    .order('page_number')

  if (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    return []
  }

  if (!discoveries || discoveries.length === 0) {
    console.log(`  No data found for ${endpoint}`)
    return []
  }

  // Collect all field paths and values
  const fieldValues = new Map<string, any[]>()
  let totalItems = 0

  for (const discovery of discoveries) {
    const items = discovery.raw_response?.Items || []
    totalItems += items.length

    for (const item of items) {
      walkObject(item, '', fieldValues)
    }
  }

  console.log(`  Found ${totalItems} records with ${fieldValues.size} unique field paths`)

  // Analyze each field
  const stats: FieldStats[] = []
  for (const [path, values] of fieldValues) {
    stats.push(analyzeFieldValues(path, values, maxSamples))
  }

  // Sort by path for consistent ordering
  stats.sort((a, b) => a.fieldPath.localeCompare(b.fieldPath))

  return stats
}

async function saveAnalysis(
  supabase: SupabaseClient,
  store: string,
  endpoint: string,
  stats: FieldStats[]
): Promise<void> {
  console.log(`  Saving ${stats.length} field analyses to database...`)

  // Upsert field analysis records
  for (const stat of stats) {
    const { error } = await supabase
      .from('ul_field_analysis')
      .upsert(
        {
          store,
          endpoint,
          field_path: stat.fieldPath,
          field_type: stat.fieldType,
          null_count: stat.nullCount,
          populated_count: stat.populatedCount,
          empty_string_count: stat.emptyStringCount,
          total_records: stat.totalRecords,
          population_rate: stat.populationRate,
          sample_values: stat.sampleValues,
          min_value: stat.minValue,
          max_value: stat.maxValue,
          avg_value: stat.avgValue,
          min_length: stat.minLength,
          max_length: stat.maxLength,
          distinct_values: stat.distinctValues,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'store,endpoint,field_path',
        }
      )

    if (error) {
      console.error(`  Error saving ${stat.fieldPath}:`, error.message)
    }
  }
}

async function generateReport(supabase: SupabaseClient, store: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`FIELD ANALYSIS REPORT - ${store.toUpperCase()}`)
  console.log(`${'='.repeat(80)}`)

  // Get summary by endpoint
  const { data: summary } = await supabase
    .from('v_ul_field_summary')
    .select('*')
    .eq('store', store)
    .order('endpoint')

  if (summary) {
    console.log(`\n## Summary by Endpoint\n`)
    console.log(`| Endpoint | Total Fields | >90% Pop | 50-90% | <50% | Never Pop | Avg Rate |`)
    console.log(`|----------|--------------|----------|--------|------|-----------|----------|`)
    for (const row of summary) {
      console.log(
        `| ${row.endpoint.padEnd(18)} | ${String(row.total_fields).padStart(12)} | ${String(row.highly_populated).padStart(8)} | ${String(row.moderately_populated).padStart(6)} | ${String(row.sparsely_populated).padStart(4)} | ${String(row.never_populated).padStart(9)} | ${String(row.avg_population_rate + '%').padStart(8)} |`
      )
    }
  }

  // Get field details ordered by population rate
  const { data: fields } = await supabase
    .from('ul_field_analysis')
    .select('*')
    .eq('store', store)
    .order('endpoint')
    .order('population_rate', { ascending: false })

  if (fields) {
    // Group by endpoint
    const byEndpoint = new Map<string, typeof fields>()
    for (const field of fields) {
      const endpointFields = byEndpoint.get(field.endpoint) || []
      endpointFields.push(field)
      byEndpoint.set(field.endpoint, endpointFields)
    }

    for (const [endpoint, endpointFields] of byEndpoint) {
      console.log(`\n\n## ${endpoint}`)
      console.log(`${'─'.repeat(60)}`)

      // High population fields (>= 90%)
      const highPop = endpointFields.filter((f) => f.population_rate >= 90)
      if (highPop.length > 0) {
        console.log(`\n### Highly Populated (≥90%)\n`)
        for (const f of highPop) {
          const samples = f.sample_values?.slice(0, 2).map((v: any) => JSON.stringify(v).slice(0, 50)).join(', ') || ''
          console.log(`  ${f.field_path}`)
          console.log(`    Type: ${f.field_type} | Pop: ${f.population_rate}% | Distinct: ${f.distinct_values}`)
          if (samples) console.log(`    Samples: ${samples}`)
        }
      }

      // Medium population fields (50-90%)
      const medPop = endpointFields.filter((f) => f.population_rate >= 50 && f.population_rate < 90)
      if (medPop.length > 0) {
        console.log(`\n### Moderately Populated (50-89%)\n`)
        for (const f of medPop) {
          console.log(`  ${f.field_path} - ${f.field_type} (${f.population_rate}%)`)
        }
      }

      // Low population fields (<50% but >0)
      const lowPop = endpointFields.filter((f) => f.population_rate > 0 && f.population_rate < 50)
      if (lowPop.length > 0) {
        console.log(`\n### Sparsely Populated (<50%)\n`)
        for (const f of lowPop) {
          console.log(`  ${f.field_path} - ${f.field_type} (${f.population_rate}%)`)
        }
      }

      // Never populated fields
      const neverPop = endpointFields.filter((f) => f.population_rate === 0 || f.population_rate === null)
      if (neverPop.length > 0) {
        console.log(`\n### Never Populated (0%)\n`)
        for (const f of neverPop) {
          console.log(`  ${f.field_path} - ${f.field_type}`)
        }
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`END OF REPORT`)
  console.log(`${'='.repeat(80)}\n`)
}

async function runAnalysis(options: AnalysisOptions): Promise<void> {
  const { store, endpoint, report = false, maxSamples = 5 } = options

  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // If report mode, just generate report
  if (report) {
    await generateReport(supabase, store)
    return
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Unleashed Field Analyzer - ${store}`)
  console.log(`${'='.repeat(60)}`)

  // Get list of endpoints to analyze
  let endpoints: string[] = []

  if (endpoint) {
    endpoints = [endpoint]
  } else {
    // Get all endpoints with discovery data
    const { data: discovered } = await supabase
      .from('ul_raw_discovery')
      .select('endpoint')
      .eq('store', store)

    if (discovered) {
      endpoints = [...new Set(discovered.map((d) => d.endpoint))]
    }
  }

  if (endpoints.length === 0) {
    console.log('No discovery data found. Run unleashed-discovery.ts first.')
    process.exit(1)
  }

  console.log(`Analyzing ${endpoints.length} endpoints: ${endpoints.join(', ')}`)

  // Analyze each endpoint
  for (const ep of endpoints) {
    const stats = await analyzeEndpoint(supabase, store, ep, maxSamples)
    if (stats.length > 0) {
      await saveAnalysis(supabase, store, ep, stats)
    }
  }

  // Generate summary report
  await generateReport(supabase, store)
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): AnalysisOptions {
  const args = process.argv.slice(2)
  const options: AnalysisOptions = {
    store: 'teelixir',
  }

  for (const arg of args) {
    if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1]
    } else if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.split('=')[1]
    } else if (arg === '--report') {
      options.report = true
    } else if (arg.startsWith('--max-samples=')) {
      options.maxSamples = parseInt(arg.split('=')[1])
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Unleashed Field Analyzer

Analyzes raw discovery data and catalogs all field paths with statistics.

Usage:
  npx tsx analyze-unleashed-fields.ts [options]

Options:
  --store=NAME       Store to analyze (teelixir, elevate) [default: teelixir]
  --endpoint=NAME    Specific endpoint to analyze [default: all]
  --report           Generate report only (no analysis)
  --max-samples=N    Max sample values to collect [default: 5]

Prerequisites:
  Run unleashed-discovery.ts first to populate ul_raw_discovery table.

Examples:
  npx tsx analyze-unleashed-fields.ts --store=teelixir
  npx tsx analyze-unleashed-fields.ts --store=teelixir --endpoint=Products
  npx tsx analyze-unleashed-fields.ts --store=teelixir --report
`)
      process.exit(0)
    }
  }

  return options
}

// Run
const options = parseArgs()
runAnalysis(options).catch((error) => {
  console.error('Analysis failed:', error)
  process.exit(1)
})
