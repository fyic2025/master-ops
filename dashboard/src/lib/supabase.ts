import { createClient } from '@supabase/supabase-js'

// Master Hub Supabase (fallback values for production)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NjcyMjcsImV4cCI6MjA2NDE0MzIyN30.vnKdEOIq_KE93EktcrlPw7zUqEVUU4aVCYnRE1sBA0U'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY
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
