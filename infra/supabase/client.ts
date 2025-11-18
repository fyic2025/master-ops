/**
 * Supabase Client Wrapper
 *
 * Provides configured Supabase clients for the master-ops infrastructure.
 *
 * Usage:
 * - `supabase` - Standard client with anon key (client-side safe)
 * - `serviceClient` - Service role client (server-side only, full access)
 *
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Public anon key (safe to expose)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (server-side only, never expose)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    'Please ensure your .env file is configured correctly.\n' +
    'See .env.example for reference.'
  )
}

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Standard Supabase client (uses anon key)
// Safe for client-side use, respects Row Level Security (RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Service role client (bypasses RLS)
// WARNING: Only use server-side! Has full database access.
// Use for admin operations, n8n workflows, and server-side automation
export const serviceClient = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Warn if service role key is not configured
if (!serviceClient) {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY not found. Service role client is unavailable.\n' +
    'This is fine for client-side operations, but required for server-side automation.'
  )
}

/**
 * Type definitions for our task tracking schema
 * Based on infra/supabase/schema-tasks.sql
 */

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'failed' | 'needs_fix' | 'completed' | 'cancelled'
  plan_json: any | null
  current_step: number
  supervisor_summary: string | null
  supervisor_recommendation: string | null
  repair_instruction: string | null
  retry_count: number
  next_action_after: string | null
  created_at: string
  updated_at: string
}

export interface TaskLog {
  id: string
  task_id: string
  attempt_number: number | null
  source: string
  status: 'info' | 'success' | 'warning' | 'error'
  message: string
  details_json: any | null
  created_at: string
}

/**
 * Database type definition for TypeScript autocomplete
 * Extend this as you add more tables
 */
export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
      }
      task_logs: {
        Row: TaskLog
        Insert: Omit<TaskLog, 'id' | 'created_at'>
        Update: Partial<Omit<TaskLog, 'id' | 'created_at'>>
      }
    }
    Views: {
      tasks_with_latest_log: {
        Row: Task & {
          latest_log_id: string | null
          latest_log_message: string | null
          latest_log_status: string | null
          latest_log_created_at: string | null
        }
      }
      tasks_needing_attention: {
        Row: Task & {
          error_log_count: number
        }
      }
    }
  }
}

// Export typed clients
export type SupabaseClient = typeof supabase
export type ServiceClient = typeof serviceClient
