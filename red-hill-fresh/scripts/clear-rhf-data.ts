import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

const supabase = createClient(
  process.env.MASTER_SUPABASE_URL!,
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!
);

async function clear() {
  // Delete sync log
  const { error: e1, count: c1 } = await supabase
    .from('rhf_gmail_sync_log')
    .delete({ count: 'exact' })
    .gte('created_at', '2000-01-01');

  console.log('Sync log deleted:', c1, e1?.message || 'ok');

  // Delete products
  const { error: e2, count: c2 } = await supabase
    .from('rhf_supplier_products')
    .delete({ count: 'exact' })
    .gte('created_at', '2000-01-01');

  console.log('Products deleted:', c2, e2?.message || 'ok');

  // Delete pricelists
  const { error: e3, count: c3 } = await supabase
    .from('rhf_pricelists')
    .delete({ count: 'exact' })
    .gte('created_at', '2000-01-01');

  console.log('Pricelists deleted:', c3, e3?.message || 'ok');
}

clear();
