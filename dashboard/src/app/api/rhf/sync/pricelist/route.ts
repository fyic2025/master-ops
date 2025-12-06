import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
  raw_data: Record<string, unknown>
  parse_errors: string[]
}

interface GmailMessage {
  id: string
  threadId: string
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

class GmailClient {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || ''
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    this.refreshToken = process.env.REDHILLFRESH_GMAIL_REFRESH_TOKEN || ''
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken)
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

  async searchMessages(query: string, maxResults: number = 50): Promise<{ messages?: { id: string }[] }> {
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
  const rawData: Record<string, unknown> = {}

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  rawData.sheetName = sheetName

  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
  rawData.rowCount = jsonData.length

  if (jsonData.length < 2) {
    parseErrors.push('Sheet has fewer than 2 rows')
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  // Find header row
  const headerPatterns = ['product', 'item', 'name', 'description', 'produce', 'price', 'cost', '$', 'rrp', 'unit', 'qty', 'available', 'quantity', 'order', 'code', 'grower', 'origin', 'kg', 'box', 'comments', 'status']
  let headerRowIndex = -1
  let bestMatchCount = 0

  for (let i = 0; i < Math.min(30, jsonData.length); i++) {
    const row = jsonData[i] as unknown[]
    if (!row) continue

    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
    const matchCount = headerPatterns.filter(p => rowStr.includes(p)).length

    if (matchCount >= 2 && matchCount > bestMatchCount) {
      headerRowIndex = i
      bestMatchCount = matchCount
    }
  }

  if (headerRowIndex === -1) headerRowIndex = 0

  const headerRow = jsonData[headerRowIndex] as unknown[]
  if (!headerRow) {
    parseErrors.push('Could not find header row')
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  const headers = Array.from({ length: headerRow.length }, (_, i) =>
    String(headerRow[i] ?? '').toLowerCase().trim()
  )
  rawData.headers = headers

  const safeIncludes = (str: string | undefined, pattern: string) => str !== undefined && str.includes(pattern)

  let nameCol = headers.findIndex(h => safeIncludes(h, 'product') || safeIncludes(h, 'item') || safeIncludes(h, 'name') || safeIncludes(h, 'description') || safeIncludes(h, 'produce'))
  let priceCol = headers.findIndex(h => safeIncludes(h, 'price') || safeIncludes(h, 'cost') || safeIncludes(h, '$') || safeIncludes(h, 'rrp'))
  const unitCol = headers.findIndex(h => safeIncludes(h, 'unit') || safeIncludes(h, 'pack') || safeIncludes(h, 'size'))
  const qualityCol = headers.findIndex(h => safeIncludes(h, 'quality') || safeIncludes(h, 'days') || safeIncludes(h, 'life'))
  const categoryCol = headers.findIndex(h => safeIncludes(h, 'category') || safeIncludes(h, 'type'))
  const codeCol = headers.findIndex(h => h === 'code' || safeIncludes(h, 'sku'))

  // BDM/OGG specific layouts
  if (supplierCode === 'bdm' && codeCol === 0 && nameCol === -1) nameCol = 2
  if (supplierCode === 'ogg' && nameCol === 1 && priceCol === -1) priceCol = 7

  if (nameCol === -1 || priceCol === -1) {
    parseErrors.push(`Could not find name (${nameCol}) or price (${priceCol}) columns`)
    return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
  }

  let currentCategory = ''

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as unknown[]
    if (!row) continue

    const firstCellText = String(row[0] || row[1] || '').trim().toUpperCase()
    const hasPriceValue = row[priceCol] !== undefined && row[priceCol] !== null && row[priceCol] !== ''
    const isCategoryRow = firstCellText.length > 0 && firstCellText.length < 30 && !hasPriceValue && /^[A-Z\s&]+$/.test(firstCellText)

    if (isCategoryRow) {
      currentCategory = firstCellText.toLowerCase()
      continue
    }

    if (!row[nameCol]) continue

    const name = String(row[nameCol] || '').trim()
    if (!name || name.length < 2) continue

    const priceValue = row[priceCol]
    const price = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue || '0').replace(/[^0-9.]/g, ''))

    if (isNaN(price)) continue

    const item: PricelistItem = {
      name,
      cost_price: price,
      is_available: price > 0,
      is_organic: /organic|org\b/i.test(name),
    }

    if (codeCol !== -1 && row[codeCol]) item.supplier_code = String(row[codeCol]).trim()
    if (unitCol !== -1 && row[unitCol]) item.unit = String(row[unitCol]).trim()
    if (qualityCol !== -1 && row[qualityCol]) {
      const qd = parseInt(String(row[qualityCol]))
      if (!isNaN(qd)) item.quality_days = qd
    }
    if (categoryCol !== -1 && row[categoryCol]) item.category = String(row[categoryCol]).trim()
    if (!item.category && currentCategory) item.category = currentCategory

    items.push(item)
  }

  rawData.parsedCount = items.length

  return { supplier_code: supplierCode, valid_from: new Date().toISOString().split('T')[0], items, raw_data: rawData, parse_errors: parseErrors }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getSupplierIdByCode(supabase: SupabaseClient, code: string): Promise<string | null> {
  const { data } = await supabase.from('rhf_suppliers').select('id').eq('code', code).single()
  return data?.id || null
}

async function savePricelist(supabase: SupabaseClient, parsed: ParsedPricelist, emailId: string, emailDate: Date, filename: string): Promise<string | null> {
  const supplierId = await getSupplierIdByCode(supabase, parsed.supplier_code)
  if (!supplierId) return null

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

  if (plError) return null

  for (const item of parsed.items) {
    await supabase.from('rhf_supplier_products').upsert({
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
    }, { onConflict: 'supplier_id,name,unit', ignoreDuplicates: false })
  }

  return pricelist.id
}

async function isMessageProcessed(supabase: SupabaseClient, messageId: string): Promise<boolean> {
  const { data } = await supabase.from('rhf_gmail_sync_log').select('status').eq('message_id', messageId).single()
  return data?.status === 'processed'
}

async function logGmailSync(supabase: SupabaseClient, messageId: string, threadId: string, fromEmail: string, fromName: string, subject: string, receivedAt: Date, status: string, supplierId: string | null, attachments: unknown[], error?: string): Promise<void> {
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
  }, { onConflict: 'message_id', ignoreDuplicates: false })
}

function findAttachments(part: GmailMessage['payload'] | GmailPart, attachments: { filename: string; attachmentId: string }[]): void {
  if ('filename' in part && part.filename && part.body?.attachmentId) {
    attachments.push({ filename: part.filename, attachmentId: part.body.attachmentId })
  }
  if (part.parts) {
    for (const subpart of part.parts) {
      findAttachments(subpart, attachments)
    }
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function runPricelistSync(daysBack: number, supplierFilter: string): Promise<{ processed: number; skipped: number; errors: number; details: unknown[] }> {
  const gmail = new GmailClient()

  if (!gmail.isConfigured()) {
    throw new Error('Gmail credentials not configured. Need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDHILLFRESH_GMAIL_REFRESH_TOKEN')
  }

  const supabase = getSupabase()
  const afterDate = new Date()
  afterDate.setDate(afterDate.getDate() - daysBack)
  const afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/')

  const suppliers = supplierFilter === 'all' ? SUPPLIERS : SUPPLIERS.filter(s => s.code === supplierFilter)

  let totalProcessed = 0
  let totalSkipped = 0
  let totalErrors = 0
  const details: unknown[] = []

  for (const supplier of suppliers) {
    const query = `after:${afterStr} has:attachment from:${supplier.emailPattern}`

    try {
      const searchResult = await gmail.searchMessages(query)

      if (!searchResult.messages?.length) continue

      for (const msg of searchResult.messages) {
        try {
          if (await isMessageProcessed(supabase, msg.id)) {
            totalSkipped++
            continue
          }

          const message = await gmail.getMessage(msg.id)
          const headers = message.payload.headers
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || ''
          const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || ''
          const receivedAt = new Date(parseInt(message.internalDate))

          const fromMatch = from.match(/^(?:"?(.+?)"?\s)?<?(.+@.+)>?$/)
          const fromName = fromMatch?.[1] || ''
          const fromEmail = fromMatch?.[2] || from

          const attachments: { filename: string; attachmentId: string }[] = []
          findAttachments(message.payload, attachments)

          const excelAttachments = attachments.filter(a =>
            a.filename.endsWith('.xlsx') || a.filename.endsWith('.xls')
          )

          if (!excelAttachments.length) {
            await logGmailSync(supabase, msg.id, message.threadId, fromEmail, fromName, subject, receivedAt, 'skipped', null, [], 'No Excel attachments')
            totalSkipped++
            continue
          }

          const processedAttachments: unknown[] = []
          const supplierId = await getSupplierIdByCode(supabase, supplier.code)

          for (const att of excelAttachments) {
            try {
              const base64Data = await gmail.getAttachment(msg.id, att.attachmentId)
              const buffer = Buffer.from(base64Data, 'base64')
              const parsed = parseExcelPricelist(buffer, supplier.code)
              const pricelistId = await savePricelist(supabase, parsed, msg.id, receivedAt, att.filename)

              processedAttachments.push({
                filename: att.filename,
                status: pricelistId ? 'processed' : 'failed',
                pricelist_id: pricelistId,
                item_count: parsed.items.length,
              })

              details.push({ supplier: supplier.code, filename: att.filename, items: parsed.items.length, pricelist_id: pricelistId })
            } catch (attError) {
              processedAttachments.push({
                filename: att.filename,
                status: 'failed',
                error: attError instanceof Error ? attError.message : String(attError),
              })
              totalErrors++
            }
          }

          const allSuccess = processedAttachments.every((a: unknown) => (a as { status: string }).status === 'processed')
          await logGmailSync(supabase, msg.id, message.threadId, fromEmail, fromName, subject, receivedAt, allSuccess ? 'processed' : 'partial', supplierId, processedAttachments)

          totalProcessed++
        } catch (msgError) {
          totalErrors++
        }
      }
    } catch (searchError) {
      totalErrors++
    }
  }

  return { processed: totalProcessed, skipped: totalSkipped, errors: totalErrors, details }
}

// ============================================================================
// API ROUTES
// ============================================================================

// Trigger pricelist sync - called by n8n on schedule
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify auth header for n8n calls
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.N8N_WEBHOOK_SECRET || 'rhf-sync-2024'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync parameters
    const body = await request.json().catch(() => ({}))
    const daysBack = body.days || 1
    const supplier = body.supplier || 'all'

    // Log sync start
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_start',
      level: 'info',
      status: 'pending',
      message: `Starting pricelist sync (${daysBack} days, supplier: ${supplier})`,
      details_json: { days: daysBack, supplier, triggered_by: 'n8n' }
    })

    // Run the actual sync
    const result = await runPricelistSync(daysBack, supplier)
    const elapsed = Date.now() - startTime

    // Log success
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_complete',
      level: 'info',
      status: 'success',
      message: `Pricelist sync completed: ${result.processed} processed, ${result.skipped} skipped, ${result.errors} errors`,
      details_json: { ...result, elapsed_ms: elapsed }
    })

    return NextResponse.json({
      success: true,
      message: 'Pricelist sync completed',
      ...result,
      elapsed_ms: elapsed
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_error',
      level: 'error',
      status: 'failed',
      message: errorMessage,
      details_json: { error: errorMessage }
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// GET - Check sync status
export async function GET() {
  try {
    // Get latest sync logs
    const { data: logs } = await getSupabase()
      .from('integration_logs')
      .select('*')
      .eq('source', 'rhf')
      .eq('service', 'pricelist_sync')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get pricelist stats
    const { data: stats } = await getSupabase()
      .from('rhf_pricelists')
      .select('supplier_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    // Group by supplier
    const bySupplier: Record<string, { count: number; latest: string }> = {}
    stats?.forEach(p => {
      if (!bySupplier[p.supplier_id]) {
        bySupplier[p.supplier_id] = { count: 0, latest: p.created_at }
      }
      bySupplier[p.supplier_id].count++
    })

    return NextResponse.json({
      status: 'ok',
      recent_logs: logs,
      pricelist_stats: bySupplier
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
