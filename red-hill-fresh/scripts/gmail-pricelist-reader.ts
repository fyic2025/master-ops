#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - Gmail Pricelist Reader
 *
 * Reads supplier pricelists from eatfresh@redhillfresh.com.au Gmail inbox,
 * downloads Excel attachments, parses them, and stores in Supabase.
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/gmail-pricelist-reader.ts [options]
 *
 * Options:
 *   --days N        Look back N days (default: 7)
 *   --supplier X    Only process specific supplier (poh, melba, ogg, bdm)
 *   --dry-run       Preview without writing to database
 *   --verbose       Show detailed output
 *
 * Environment Variables Required:
 *   Use `node creds.js export global redhillfresh` to set:
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 *   - REDHILLFRESH_GMAIL_REFRESH_TOKEN
 *   - REDHILLFRESH_GMAIL_EMAIL
 *   - MASTER_SUPABASE_URL
 *   - MASTER_SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load from .env.test if it exists (for testing with exported creds), otherwise .env
const envTestPath = path.join(__dirname, '..', '..', '.env.test')
const envPath = path.join(__dirname, '..', '..', '.env')
const fs = require('fs')
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath })
} else {
  dotenv.config({ path: envPath })
}

// ============================================================================
// TYPES
// ============================================================================

interface SupplierConfig {
  code: string
  name: string
  emailPattern: string
}

interface PricelistItem {
  name: string
  unit?: string
  unit_size?: string
  cost_price: number
  rrp?: number
  is_available: boolean
  quality_days?: number
  category?: string
  supplier_code?: string
  is_organic?: boolean
}

interface ParsedPricelist {
  supplier_code: string
  valid_from: string
  items: PricelistItem[]
  raw_data: any
  parse_errors: string[]
}

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
    parts?: GmailPart[]
    body?: { attachmentId?: string; data?: string }
    mimeType: string
  }
  internalDate: string
}

interface GmailPart {
  partId: string
  mimeType: string
  filename: string
  body: { attachmentId?: string; data?: string; size: number }
  parts?: GmailPart[]
}

interface SyncConfig {
  dryRun: boolean
  verbose: boolean
  daysBack: number
  supplierFilter?: string
}

// ============================================================================
// SUPPLIER CONFIGURATIONS
// ============================================================================

const SUPPLIERS: SupplierConfig[] = [
  { code: 'poh', name: 'Pure Organic Harvest', emailPattern: 'pureorganicharvest.com.au' },
  { code: 'melba', name: 'Melba Fresh Organics', emailPattern: 'mforganics.com.au' },
  { code: 'ogg', name: 'Organic Growers Group', emailPattern: 'organicgrowersgroup.com.au' },
  { code: 'bdm', name: 'Market BioDynamic', emailPattern: 'biodynamic.com.au' },
]

// ============================================================================
// GMAIL API CLIENT
// ============================================================================

class RHFGmailClient {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private userEmail: string
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || ''
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    this.refreshToken = process.env.REDHILLFRESH_GMAIL_REFRESH_TOKEN || process.env.RHF_GMAIL_REFRESH_TOKEN || ''
    this.userEmail = process.env.REDHILLFRESH_GMAIL_EMAIL || process.env.RHF_GMAIL_EMAIL || ''

    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.userEmail) {
      console.error('Missing Gmail credentials. Run:')
      console.error('  node creds.js export global redhillfresh')
      console.error('')
      console.error('Required env vars:')
      console.error('  GOOGLE_CLIENT_ID')
      console.error('  GOOGLE_CLIENT_SECRET')
      console.error('  REDHILLFRESH_GMAIL_REFRESH_TOKEN')
      console.error('  REDHILLFRESH_GMAIL_EMAIL')
      process.exit(1)
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh Gmail access token: ${error}`)
    }

    const data = await response.json() as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  async searchMessages(query: string, maxResults: number = 50): Promise<{ messages: { id: string }[] }> {
    const token = await this.getAccessToken()
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw new Error(`Gmail search failed: ${response.status} ${await response.text()}`)
    }

    return response.json()
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const token = await this.getAccessToken()
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw new Error(`Failed to get message: ${response.status}`)
    }

    return response.json()
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<string> {
    const token = await this.getAccessToken()
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw new Error(`Failed to get attachment: ${response.status}`)
    }

    const data = await response.json() as { data: string }
    return data.data
  }
}

// ============================================================================
// EXCEL PARSER
// ============================================================================

function parseExcelPricelist(buffer: Buffer, supplierCode: string): ParsedPricelist {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const items: PricelistItem[] = []
  const parseErrors: string[] = []
  const rawData: any = {}

  // Get the first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  rawData.sheetName = sheetName

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
  rawData.rowCount = jsonData.length

  if (jsonData.length < 2) {
    parseErrors.push('Sheet has fewer than 2 rows')
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  // Try to find header row (look for common column names)
  // Extended patterns to catch various supplier formats (OGG, BDM, Melba, POH)
  const headerPatterns = [
    'product', 'item', 'name', 'description', 'produce',
    'price', 'cost', '$', 'rrp',
    'unit', 'qty', 'available', 'quantity', 'order',
    'code', 'grower', 'origin', 'kg', 'box', 'comments', 'status'
  ]
  let headerRowIndex = -1
  let bestMatchCount = 0

  // Scan up to 30 rows for headers (OGG/BDM have headers around row 13-14)
  rawData.firstRows = []
  for (let i = 0; i < Math.min(30, jsonData.length); i++) {
    const row = jsonData[i]
    if (!row) continue

    // Store first 10 rows for debugging
    if (i < 10) {
      rawData.firstRows.push(row.slice(0, 8).map(c => String(c || '').substring(0, 30)))
    }

    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
    const matchCount = headerPatterns.filter(p => rowStr.includes(p)).length

    // Need at least 2 matches, but prefer rows with more matches
    if (matchCount >= 2 && matchCount > bestMatchCount) {
      headerRowIndex = i
      bestMatchCount = matchCount
    }
  }

  // If no header found, try to detect numeric data rows and assume row before is header
  if (headerRowIndex === -1) {
    for (let i = 1; i < Math.min(25, jsonData.length); i++) {
      const row = jsonData[i]
      if (!row || row.length < 2) continue

      // Look for rows where most cells are numbers (likely data rows)
      const numericCount = row.filter(c => typeof c === 'number' || /^\$?\d+\.?\d*$/.test(String(c || ''))).length
      if (numericCount >= 2 && row.length >= 3) {
        // The row before this numeric row might be headers
        const prevRow = jsonData[i - 1]
        if (prevRow && prevRow.filter(c => c && String(c).length > 0).length >= 2) {
          headerRowIndex = i - 1
          rawData.detectionMethod = 'numeric_data_detection'
          break
        }
      }
    }
  }

  // Still no header? Default to first non-empty row with multiple cells
  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i]
      if (row && row.filter(c => c && String(c).length > 0).length >= 3) {
        headerRowIndex = i
        rawData.detectionMethod = 'first_multi_cell_row'
        break
      }
    }
  }

  if (headerRowIndex === -1) headerRowIndex = 0

  const headerRow = jsonData[headerRowIndex]
  if (!headerRow) {
    parseErrors.push('Could not find header row')
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  rawData.headerRowIndex = headerRowIndex

  // Map header columns - use Array.from to handle sparse arrays from XLSX
  const headers = Array.from({ length: headerRow.length }, (_, i) =>
    String(headerRow[i] ?? '').toLowerCase().trim()
  )
  rawData.headers = headers

  // Find column indices with expanded patterns - add safety check for undefined
  const safeIncludes = (str: string | undefined, pattern: string) =>
    str !== undefined && str.includes(pattern)

  let nameCol = headers.findIndex(h =>
    safeIncludes(h, 'product') || safeIncludes(h, 'item') || safeIncludes(h, 'name') ||
    safeIncludes(h, 'description') || safeIncludes(h, 'produce') || h === 'desc'
  )
  let priceCol = headers.findIndex(h =>
    safeIncludes(h, 'price') || safeIncludes(h, 'cost') || safeIncludes(h, '$') ||
    safeIncludes(h, 'rrp') || h === 'each' || h === 'total'
  )
  let unitCol = headers.findIndex(h =>
    safeIncludes(h, 'unit') || safeIncludes(h, 'pack') || safeIncludes(h, 'size') ||
    safeIncludes(h, 'per') || safeIncludes(h, 'kg/')
  )
  const qualityCol = headers.findIndex(h => safeIncludes(h, 'quality') || safeIncludes(h, 'days') || safeIncludes(h, 'life') || safeIncludes(h, 'shelf'))
  const availCol = headers.findIndex(h => safeIncludes(h, 'avail') || safeIncludes(h, 'stock') || safeIncludes(h, 'qty') || safeIncludes(h, 'quantity'))
  const categoryCol = headers.findIndex(h => safeIncludes(h, 'category') || safeIncludes(h, 'type') || safeIncludes(h, 'group') || safeIncludes(h, 'class'))
  const codeCol = headers.findIndex(h => h === 'code' || safeIncludes(h, 'sku') || safeIncludes(h, 'product code'))
  const originCol = headers.findIndex(h => safeIncludes(h, 'origin') || safeIncludes(h, 'can go'))
  const growerCol = headers.findIndex(h => safeIncludes(h, 'grower') || safeIncludes(h, 'supplier'))

  // Supplier-specific column mapping overrides
  // BDM format: CODE | CAN GO | [unnamed product] | PRICE | QTY | COMMENTS
  // The product column is unnamed but is always column 2 when CODE is column 0
  if (supplierCode === 'bdm' && codeCol === 0 && nameCol === -1) {
    nameCol = 2  // Product description is in column 2 (unnamed)
    rawData.detectionMethod = 'bdm_fixed_layout'
  }

  // OGG format: [note] | Product | [blank] | KG/Unit | Grower & Status | [blank] | Origin | Price
  // Product is column 1, Price is column 7
  if (supplierCode === 'ogg' && nameCol === 1 && priceCol === -1) {
    priceCol = 7  // Price is in the last column
    unitCol = 3   // KG/Unit column
    rawData.detectionMethod = 'ogg_fixed_layout'
  }

  rawData.columnMapping = { nameCol, priceCol, unitCol, qualityCol, availCol, categoryCol, codeCol, originCol, growerCol }

  if (nameCol === -1 || priceCol === -1) {
    parseErrors.push(`Could not find name (${nameCol}) or price (${priceCol}) columns. Headers: ${headers.join(', ')}`)
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  // Parse data rows
  // Track current category for OGG/BDM formats where category is a header row
  let currentCategory = ''

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row) continue

    // Check if this is a category header row (OGG/BDM style)
    // These have text in column 0 or 1 but no price
    const firstCellText = String(row[0] || row[1] || '').trim().toUpperCase()
    const hasPriceValue = row[priceCol] !== undefined && row[priceCol] !== null && row[priceCol] !== ''
    const isCategoryRow = firstCellText.length > 0 && firstCellText.length < 30 &&
      !hasPriceValue && /^[A-Z\s&]+$/.test(firstCellText)

    if (isCategoryRow) {
      // This is a category header like "EGGS", "FRUIT", "DRIED FRUIT"
      currentCategory = firstCellText.toLowerCase()
      continue
    }

    if (!row[nameCol]) continue

    const name = String(row[nameCol] || '').trim()
    if (!name || name.length < 2) continue

    const priceValue = row[priceCol]
    const price = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue || '0').replace(/[^0-9.]/g, ''))

    // Skip rows without valid prices (but allow 0 for unavailable items)
    if (isNaN(price)) {
      continue  // Silently skip - likely a note row
    }

    const item: PricelistItem = {
      name,
      cost_price: price,
      is_available: price > 0,
      is_organic: /organic|org\b/i.test(name),
    }

    // Store product code if available
    if (codeCol !== -1 && row[codeCol]) {
      item.supplier_code = String(row[codeCol]).trim()
    }

    if (unitCol !== -1 && row[unitCol]) {
      item.unit = String(row[unitCol]).trim()
    }

    if (qualityCol !== -1 && row[qualityCol]) {
      const qd = parseInt(String(row[qualityCol]))
      if (!isNaN(qd)) item.quality_days = qd
    }

    if (categoryCol !== -1 && row[categoryCol]) {
      item.category = String(row[categoryCol]).trim()
    }

    // Use tracked category from header row if no explicit category
    if (!item.category && currentCategory) {
      item.category = currentCategory
    }

    // Infer category from name as last resort
    if (!item.category) {
      item.category = inferCategory(name)
    }

    items.push(item)
  }

  rawData.parsedCount = items.length

  return {
    supplier_code: supplierCode,
    valid_from: new Date().toISOString().split('T')[0],
    items,
    raw_data: rawData,
    parse_errors: parseErrors,
  }
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase()

  // Fruits
  if (/apple|pear|banana|orange|mandarin|lemon|lime|grape|berry|strawberry|blueberry|raspberry|mango|peach|nectarine|plum|apricot|cherry|kiwi|melon|watermelon|pineapple|avocado|passionfruit|fig|pomegranate/.test(lower)) {
    return 'fruit'
  }

  // Vegetables
  if (/carrot|potato|onion|garlic|tomato|cucumber|capsicum|pepper|zucchini|eggplant|broccoli|cauliflower|cabbage|lettuce|spinach|kale|chard|celery|leek|pumpkin|squash|corn|pea|bean|asparagus|mushroom|beetroot|parsnip|radish|turnip|fennel/.test(lower)) {
    return 'vegetable'
  }

  // Leafy greens
  if (/lettuce|spinach|kale|chard|rocket|arugula|watercress|endive|radicchio|mesclun|mixed\s*leaf|baby\s*leaf|salad/.test(lower)) {
    return 'leafy_green'
  }

  // Herbs
  if (/basil|parsley|coriander|cilantro|mint|rosemary|thyme|oregano|sage|dill|chive|tarragon|bay\s*leaf/.test(lower)) {
    return 'herb'
  }

  // Dairy
  if (/milk|cream|cheese|yogurt|yoghurt|butter|sour\s*cream/.test(lower)) {
    return 'dairy'
  }

  // Eggs
  if (/egg/.test(lower)) {
    return 'eggs'
  }

  // Default
  return 'other'
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getSupplierIdByCode(supabase: SupabaseClient, code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('rhf_suppliers')
    .select('id')
    .eq('code', code)
    .single()

  if (error || !data) return null
  return data.id
}

async function savePricelist(supabase: SupabaseClient, parsed: ParsedPricelist, emailId: string, emailDate: Date, filename: string): Promise<string | null> {
  const supplierId = await getSupplierIdByCode(supabase, parsed.supplier_code)
  if (!supplierId) {
    console.error(`Supplier not found: ${parsed.supplier_code}`)
    return null
  }

  // Create pricelist record
  const { data: pricelist, error: plError } = await supabase
    .from('rhf_pricelists')
    .insert({
      supplier_id: supplierId,
      source_email_id: emailId,
      source_email_date: emailDate.toISOString(),
      source_filename: filename,
      valid_from: parsed.valid_from,
      status: 'parsed',
      parsed_at: new Date().toISOString(),
      item_count: parsed.items.length,
      parse_errors: parsed.parse_errors,
      raw_data: parsed.raw_data,
    })
    .select('id')
    .single()

  if (plError) {
    console.error(`Failed to save pricelist: ${plError.message}`)
    return null
  }

  // Upsert supplier products
  for (const item of parsed.items) {
    const { error: spError } = await supabase
      .from('rhf_supplier_products')
      .upsert({
        supplier_id: supplierId,
        pricelist_id: pricelist.id,
        name: item.name,
        unit: item.unit || 'each',
        unit_size: item.unit_size,
        cost_price: item.cost_price,
        rrp: item.rrp,
        is_available: item.is_available,
        quality_days: item.quality_days,
        category: item.category,
        supplier_code: item.supplier_code,
        is_organic: item.is_organic,
        last_seen_at: new Date().toISOString(),
        times_seen: 1,
      }, {
        onConflict: 'supplier_id,name,unit',
        ignoreDuplicates: false,
      })

    if (spError) {
      console.error(`Failed to upsert product "${item.name}": ${spError.message}`)
    }
  }

  return pricelist.id
}

async function logGmailSync(supabase: SupabaseClient, messageId: string, threadId: string, fromEmail: string, fromName: string, subject: string, receivedAt: Date, status: string, supplierId: string | null, attachments: any[], error?: string): Promise<void> {
  await supabase.from('rhf_gmail_sync_log').upsert({
    message_id: messageId,
    thread_id: threadId,
    from_email: fromEmail,
    from_name: fromName,
    subject: subject,
    received_at: receivedAt.toISOString(),
    status,
    supplier_id: supplierId,
    attachment_count: attachments.length,
    attachments_processed: attachments,
    error_message: error,
  }, {
    onConflict: 'message_id',
    ignoreDuplicates: false,
  })
}

async function isMessageProcessed(supabase: SupabaseClient, messageId: string): Promise<boolean> {
  const { data } = await supabase
    .from('rhf_gmail_sync_log')
    .select('status')
    .eq('message_id', messageId)
    .single()

  return data?.status === 'processed'
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncPricelists(config: SyncConfig): Promise<void> {
  console.log('='.repeat(60))
  console.log('RHF Gmail Pricelist Reader')
  console.log('='.repeat(60))
  console.log(`Days back: ${config.daysBack}`)
  console.log(`Supplier filter: ${config.supplierFilter || 'all'}`)
  console.log(`Dry run: ${config.dryRun}`)
  console.log('='.repeat(60))

  // Initialize clients
  const gmail = new RHFGmailClient()

  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.BOO_SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Expected:')
    console.error('  MASTER_SUPABASE_URL or BOO_SUPABASE_URL')
    console.error('  MASTER_SUPABASE_SERVICE_ROLE_KEY or BOO_SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Build search query
  const afterDate = new Date()
  afterDate.setDate(afterDate.getDate() - config.daysBack)
  const afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/')

  let query = `after:${afterStr} has:attachment`

  // Filter by supplier if specified
  const suppliers = config.supplierFilter
    ? SUPPLIERS.filter(s => s.code === config.supplierFilter)
    : SUPPLIERS

  if (suppliers.length === 0) {
    console.error(`Unknown supplier: ${config.supplierFilter}`)
    process.exit(1)
  }

  // Search for each supplier
  let totalProcessed = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const supplier of suppliers) {
    console.log(`\nSearching for ${supplier.name} emails...`)

    const supplierQuery = `${query} from:${supplier.emailPattern}`

    try {
      const searchResult = await gmail.searchMessages(supplierQuery)

      if (!searchResult.messages || searchResult.messages.length === 0) {
        console.log(`  No emails found`)
        continue
      }

      console.log(`  Found ${searchResult.messages.length} emails`)

      for (const msg of searchResult.messages) {
        try {
          // Check if already processed
          if (!config.dryRun && await isMessageProcessed(supabase, msg.id)) {
            if (config.verbose) console.log(`  Skipping ${msg.id} (already processed)`)
            totalSkipped++
            continue
          }

          // Get full message
          const message = await gmail.getMessage(msg.id)

          // Extract headers
          const headers = message.payload.headers
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || ''
          const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || ''
          const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || ''

          const receivedAt = new Date(parseInt(message.internalDate))
          const fromMatch = from.match(/^(?:"?(.+?)"?\s)?<?(.+@.+)>?$/)
          const fromName = fromMatch?.[1] || ''
          const fromEmail = fromMatch?.[2] || from

          console.log(`\n  Processing: ${subject.substring(0, 60)}...`)
          if (config.verbose) {
            console.log(`    From: ${fromName} <${fromEmail}>`)
            console.log(`    Date: ${receivedAt.toISOString()}`)
          }

          // Find Excel attachments
          const attachments: { filename: string; attachmentId: string }[] = []
          findAttachments(message.payload, attachments)

          const excelAttachments = attachments.filter(a =>
            a.filename.endsWith('.xlsx') || a.filename.endsWith('.xls') || a.filename.endsWith('.csv')
          )

          if (excelAttachments.length === 0) {
            console.log(`    No Excel attachments found`)
            if (!config.dryRun) {
              await logGmailSync(supabase, msg.id, message.threadId, fromEmail, fromName, subject, receivedAt, 'skipped', null, [], 'No Excel attachments')
            }
            totalSkipped++
            continue
          }

          const processedAttachments: any[] = []
          const supplierId = await getSupplierIdByCode(supabase, supplier.code)

          for (const att of excelAttachments) {
            console.log(`    Processing attachment: ${att.filename}`)

            if (config.dryRun) {
              processedAttachments.push({ filename: att.filename, status: 'dry_run' })
              continue
            }

            try {
              // Download attachment
              const base64Data = await gmail.getAttachment(msg.id, att.attachmentId)
              const buffer = Buffer.from(base64Data, 'base64')

              // Parse Excel
              const parsed = parseExcelPricelist(buffer, supplier.code)
              console.log(`      Parsed ${parsed.items.length} items`)

              if (parsed.parse_errors.length > 0) {
                console.log(`      Errors: ${parsed.parse_errors.join(', ')}`)
              }

              // Save to database
              const pricelistId = await savePricelist(supabase, parsed, msg.id, receivedAt, att.filename)

              processedAttachments.push({
                filename: att.filename,
                status: pricelistId ? 'processed' : 'failed',
                pricelist_id: pricelistId,
                item_count: parsed.items.length,
                errors: parsed.parse_errors,
              })

              if (pricelistId) {
                console.log(`      Saved pricelist: ${pricelistId}`)
              }
            } catch (attError) {
              console.error(`      Error: ${attError instanceof Error ? attError.message : String(attError)}`)
              processedAttachments.push({
                filename: att.filename,
                status: 'failed',
                error: attError instanceof Error ? attError.message : String(attError),
              })
            }
          }

          // Log the sync
          if (!config.dryRun) {
            const allSuccess = processedAttachments.every(a => a.status === 'processed')
            await logGmailSync(
              supabase,
              msg.id,
              message.threadId,
              fromEmail,
              fromName,
              subject,
              receivedAt,
              allSuccess ? 'processed' : 'partial',
              supplierId,
              processedAttachments
            )
          }

          totalProcessed++
        } catch (msgError) {
          console.error(`  Error processing message ${msg.id}: ${msgError instanceof Error ? msgError.message : String(msgError)}`)
          totalErrors++
        }
      }
    } catch (searchError) {
      console.error(`  Search error: ${searchError instanceof Error ? searchError.message : String(searchError)}`)
      totalErrors++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Processed: ${totalProcessed}`)
  console.log(`Skipped:   ${totalSkipped}`)
  console.log(`Errors:    ${totalErrors}`)
}

// Helper to recursively find attachments in message parts
function findAttachments(part: GmailMessage['payload'] | GmailPart, attachments: { filename: string; attachmentId: string }[]): void {
  if (part.filename && part.body?.attachmentId) {
    attachments.push({ filename: part.filename, attachmentId: part.body.attachmentId })
  }
  if (part.parts) {
    for (const subpart of part.parts) {
      findAttachments(subpart, attachments)
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)

  const config: SyncConfig = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    daysBack: 7,
    supplierFilter: undefined,
  }

  // Parse --days N
  const daysIdx = args.indexOf('--days')
  if (daysIdx !== -1 && args[daysIdx + 1]) {
    config.daysBack = parseInt(args[daysIdx + 1])
  }

  // Parse --supplier X
  const supplierIdx = args.indexOf('--supplier')
  if (supplierIdx !== -1 && args[supplierIdx + 1]) {
    config.supplierFilter = args[supplierIdx + 1]
  }

  return config
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs()

  try {
    await syncPricelists(config)
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
