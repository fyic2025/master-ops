import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_ID = process.env.TEELIXIR_UNLEASHED_API_ID!
const API_KEY = process.env.TEELIXIR_UNLEASHED_API_KEY!
const BASE_URL = 'https://api.unleashedsoftware.com'

async function fetchUnleashed(endpoint: string) {
  const signature = crypto.createHmac('sha256', API_KEY).update('').digest('base64')
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      'Accept': 'application/json',
      'api-auth-id': API_ID,
      'api-auth-signature': signature
    }
  })
  return response.json()
}

async function test() {
  // Test SellPriceTiers
  console.log('Testing SellPriceTiers...')
  const tiers = await fetchUnleashed('SellPriceTiers') as any
  if (tiers.Items && tiers.Items[0]) {
    console.log('Sample tier:', JSON.stringify(tiers.Items[0], null, 2))

    const tier = tiers.Items[0]
    const record = {
      store: 'teelixir',
      guid: tier.Guid,
      tier_name: tier.TierName || tier.Name,
      raw_data: tier,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Inserting record:', JSON.stringify(record, null, 2))

    const { error } = await supabase
      .from('ul_sell_price_tiers')
      .upsert(record, { onConflict: 'store,guid' })

    if (error) console.log('Error:', error)
    else console.log('Success!')
  }

  // Test PaymentTerms
  console.log('\nTesting PaymentTerms...')
  const terms = await fetchUnleashed('PaymentTerms') as any
  if (terms.Items && terms.Items[0]) {
    console.log('Sample term:', JSON.stringify(terms.Items[0], null, 2))

    const term = terms.Items[0]
    const record = {
      store: 'teelixir',
      guid: term.Guid,
      terms_name: term.TermsName || term.Name,
      due_days: term.DueDays,
      due_next_month_after_days: term.DueNextMonthAfterDays,
      obsolete: term.Obsolete ?? false,
      raw_data: term,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Inserting record:', JSON.stringify(record, null, 2))

    const { error } = await supabase
      .from('ul_payment_terms')
      .upsert(record, { onConflict: 'store,guid' })

    if (error) console.log('Error:', error)
    else console.log('Success!')
  }
}

test()
