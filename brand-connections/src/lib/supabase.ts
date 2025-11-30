import { createClient } from '@supabase/supabase-js';

// Master Hub Supabase - for brand applications
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NjcyMjcsImV4cCI6MjA2NDE0MzIyN30.vnKdEOIq_KE93EktcrlPw7zUqEVUU4aVCYnRE1sBA0U';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY
  );
}

// Types for brand applications
export interface BrandApplication {
  id?: string;
  contact_name: string;
  email: string;
  phone?: string;
  brand_name: string;
  website?: string;
  categories?: string[];
  current_retailers?: number;
  status?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  price_test_completed?: boolean;
  price_test_viable?: boolean;
  hubspot_contact_id?: string;
  hubspot_deal_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BrandApplicationProduct {
  id?: string;
  application_id: string;
  product_name: string;
  rrp: number;
  rrp_includes_gst?: boolean;
  distributor_price?: number;
  retailer_price?: number;
  brand_margin?: number;
  is_viable?: boolean;
  created_at?: string;
}
