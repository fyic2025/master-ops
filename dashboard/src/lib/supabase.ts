import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Business codes
export type BusinessCode = 'boo' | 'teelixir' | 'elevate' | 'rhf'

export const BUSINESSES = {
  boo: { name: 'Buy Organics Online', platform: 'BigCommerce' },
  teelixir: { name: 'Teelixir', platform: 'Shopify' },
  elevate: { name: 'Elevate Wholesale', platform: 'Shopify B2B' },
  rhf: { name: 'Red Hill Fresh', platform: 'WooCommerce' },
} as const
