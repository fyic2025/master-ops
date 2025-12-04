import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'annually'

/**
 * GET /api/cashflow/periods
 * Get cash flow data for specified periods
 *
 * Query params:
 *   business: 'teelixir', 'elevate', or 'consolidated'
 *   periodType: 'weekly', 'monthly', 'quarterly', 'annually'
 *   futurePeriods: number of future periods to include
 *   startDate: optional start date (defaults to 6 months ago)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const business = searchParams.get('business') || 'consolidated'
    const periodType = (searchParams.get('periodType') || 'monthly') as PeriodType
    const futurePeriods = parseInt(searchParams.get('futurePeriods') || '3', 10)
    const startDateParam = searchParams.get('startDate')

    const supabase = createServerClient()

    // Calculate period range
    const now = new Date()
    let startDate: Date

    if (startDateParam) {
      startDate = new Date(startDateParam)
    } else {
      // Default: go back 6 periods
      startDate = new Date(now)
      switch (periodType) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 6 * 7)
          break
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 6)
          break
        case 'quarterly':
          startDate.setMonth(startDate.getMonth() - 18)
          break
        case 'annually':
          startDate.setFullYear(startDate.getFullYear() - 3)
          break
      }
    }

    // Generate period dates
    const periods = generatePeriods(startDate, now, futurePeriods, periodType)

    // Get line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('cashflow_line_items')
      .select('*')
      .eq('business_key', business)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError)
      return NextResponse.json({ error: lineItemsError.message }, { status: 500 })
    }

    // Get budget data for these periods
    const periodStarts = periods.map(p => p.start)
    const { data: budgets, error: budgetsError } = await supabase
      .from('cashflow_budgets')
      .select('*')
      .eq('business_key', business)
      .eq('period_type', periodType)
      .in('period_start', periodStarts)

    if (budgetsError) {
      console.error('Error fetching budgets:', budgetsError)
      // Continue without budget data
    }

    // Get actuals from monthly_pnl_snapshots for historical periods
    const actualsMap = await fetchActualsFromPnL(supabase, business, periods, periodType)

    // Build budget data map: line_item_id -> period_start -> data
    const budgetData: Record<string, Record<string, any>> = {}

    // Initialize with budget entries
    for (const budget of budgets || []) {
      if (!budgetData[budget.line_item_id]) {
        budgetData[budget.line_item_id] = {}
      }
      budgetData[budget.line_item_id][budget.period_start] = {
        period_start: budget.period_start,
        budget_amount: budget.budget_amount,
        actual_amount: budget.actual_amount,
        variance_amount: budget.variance_amount,
        variance_pct: budget.variance_pct,
      }
    }

    // Merge actuals from P&L snapshots
    for (const [lineItemId, periodData] of Object.entries(actualsMap)) {
      if (!budgetData[lineItemId]) {
        budgetData[lineItemId] = {}
      }
      for (const [periodStart, actual] of Object.entries(periodData)) {
        if (!budgetData[lineItemId][periodStart]) {
          budgetData[lineItemId][periodStart] = {
            period_start: periodStart,
            budget_amount: null,
            actual_amount: actual,
            variance_amount: null,
            variance_pct: null,
          }
        } else if (budgetData[lineItemId][periodStart].actual_amount === null) {
          budgetData[lineItemId][periodStart].actual_amount = actual
        }
      }
    }

    return NextResponse.json({
      business,
      periodType,
      periods: periods.map(p => p.start),
      lineItems: lineItems || [],
      budgetData,
    })
  } catch (error: any) {
    console.error('Periods API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generatePeriods(
  start: Date,
  current: Date,
  futurePeriods: number,
  periodType: PeriodType
): { start: string; end: string; label: string }[] {
  const periods: { start: string; end: string; label: string }[] = []

  // Normalize start to period boundary
  let periodStart = new Date(start)
  switch (periodType) {
    case 'weekly':
      // Start from Monday
      const day = periodStart.getDay()
      periodStart.setDate(periodStart.getDate() - (day === 0 ? 6 : day - 1))
      break
    case 'monthly':
      periodStart.setDate(1)
      break
    case 'quarterly':
      const quarter = Math.floor(periodStart.getMonth() / 3)
      periodStart.setMonth(quarter * 3, 1)
      break
    case 'annually':
      periodStart.setMonth(0, 1)
      break
  }

  // Calculate end date (current + future periods)
  const endDate = new Date(current)
  for (let i = 0; i < futurePeriods; i++) {
    switch (periodType) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7)
        break
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1)
        break
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3)
        break
      case 'annually':
        endDate.setFullYear(endDate.getFullYear() + 1)
        break
    }
  }

  // Generate periods
  while (periodStart <= endDate) {
    let periodEnd = new Date(periodStart)
    switch (periodType) {
      case 'weekly':
        periodEnd.setDate(periodEnd.getDate() + 6)
        break
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        periodEnd.setDate(0)
        break
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3)
        periodEnd.setDate(0)
        break
      case 'annually':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        periodEnd.setDate(0)
        break
    }

    periods.push({
      start: formatDate(periodStart),
      end: formatDate(periodEnd),
      label: formatPeriodLabel(periodStart, periodType),
    })

    // Move to next period
    switch (periodType) {
      case 'weekly':
        periodStart.setDate(periodStart.getDate() + 7)
        break
      case 'monthly':
        periodStart.setMonth(periodStart.getMonth() + 1)
        break
      case 'quarterly':
        periodStart.setMonth(periodStart.getMonth() + 3)
        break
      case 'annually':
        periodStart.setFullYear(periodStart.getFullYear() + 1)
        break
    }
  }

  return periods
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatPeriodLabel(date: Date, periodType: PeriodType): string {
  switch (periodType) {
    case 'weekly':
      return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-AU', { month: 'short' })}`
    case 'monthly':
      return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `Q${quarter} ${date.getFullYear()}`
    case 'annually':
      return date.getFullYear().toString()
    default:
      return formatDate(date)
  }
}

async function fetchActualsFromPnL(
  supabase: any,
  business: string,
  periods: { start: string; end: string }[],
  periodType: PeriodType
): Promise<Record<string, Record<string, number>>> {
  const actualsMap: Record<string, Record<string, number>> = {}

  // Only fetch monthly data for now (most common case)
  if (periodType !== 'monthly') {
    return actualsMap // TODO: Aggregate for other period types
  }

  // Get the line items to map account names to IDs
  const { data: lineItems } = await supabase
    .from('cashflow_line_items')
    .select('id, name, item_type, xero_account_code')
    .eq('business_key', business)
    .eq('is_active', true)

  if (!lineItems?.length) return actualsMap

  // Build a map of item_type to parent line item ID
  const typeToLineItemId: Record<string, string> = {}
  for (const item of lineItems) {
    if (item.item_type && !item.xero_account_code) {
      // This is a parent category
      typeToLineItemId[item.item_type] = item.id
    }
  }

  // Get P&L snapshots
  const businessKeys = business === 'consolidated' ? ['teelixir', 'elevate'] : [business]

  const { data: snapshots } = await supabase
    .from('monthly_pnl_snapshots')
    .select('*')
    .in('business_key', businessKeys)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true })

  if (!snapshots?.length) return actualsMap

  // Aggregate by period
  for (const snapshot of snapshots) {
    const periodStart = `${snapshot.period_year}-${String(snapshot.period_month).padStart(2, '0')}-01`

    // Check if this period is in our range
    const isInRange = periods.some(p => p.start === periodStart)
    if (!isInRange) continue

    // Map to line item types
    const revenue = Number(snapshot.revenue) || 0
    const cogs = Number(snapshot.cogs) || 0
    const expenses = Number(snapshot.operating_expenses) || 0

    // Add to revenue line item
    if (typeToLineItemId.revenue) {
      if (!actualsMap[typeToLineItemId.revenue]) {
        actualsMap[typeToLineItemId.revenue] = {}
      }
      actualsMap[typeToLineItemId.revenue][periodStart] =
        (actualsMap[typeToLineItemId.revenue][periodStart] || 0) + revenue
    }

    // Add to COGS line item
    if (typeToLineItemId.cogs) {
      if (!actualsMap[typeToLineItemId.cogs]) {
        actualsMap[typeToLineItemId.cogs] = {}
      }
      actualsMap[typeToLineItemId.cogs][periodStart] =
        (actualsMap[typeToLineItemId.cogs][periodStart] || 0) + cogs
    }

    // Add to expenses line item
    if (typeToLineItemId.expense) {
      if (!actualsMap[typeToLineItemId.expense]) {
        actualsMap[typeToLineItemId.expense] = {}
      }
      actualsMap[typeToLineItemId.expense][periodStart] =
        (actualsMap[typeToLineItemId.expense][periodStart] || 0) + expenses
    }
  }

  return actualsMap
}
