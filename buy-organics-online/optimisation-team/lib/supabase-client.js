/**
 * Supabase Client for BOO Optimisation Team
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found. Running in offline mode.');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export async function testConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return { connected: false, error: 'No credentials' };
  }

  try {
    const { data, error } = await client
      .from('boo_lighthouse_audits')
      .select('count')
      .limit(1);

    if (error) {
      return { connected: false, error: error.message };
    }

    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

export default getSupabaseClient;
