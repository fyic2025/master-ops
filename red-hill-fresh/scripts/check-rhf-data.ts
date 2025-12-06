import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

const supabase = createClient(
  process.env.MASTER_SUPABASE_URL!,
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: logs } = await supabase.from('rhf_gmail_sync_log').select('*').limit(20);
  console.log('=== SYNC LOG ===');
  console.log('Total:', logs?.length || 0);

  const { data: lists } = await supabase.from('rhf_pricelists').select('id, supplier_id, valid_from, item_count');
  console.log('\n=== PRICELISTS ===');
  console.log('Total:', lists?.length || 0);
  lists?.forEach(l => console.log(' ', l.supplier_id, l.valid_from, l.item_count, 'items'));

  const { count } = await supabase.from('rhf_supplier_products').select('*', { count: 'exact', head: true });
  console.log('\n=== SUPPLIER PRODUCTS ===');
  console.log('Total:', count);

  const { data: suppliers } = await supabase.from('rhf_suppliers').select('id, name, code');
  console.log('\n=== SUPPLIERS ===');
  suppliers?.forEach(s => console.log(' ', s.id, s.code, s.name));

  // Sample products
  const { data: products } = await supabase.from('rhf_supplier_products').select('name, cost_price, category').limit(15);
  console.log('\n=== SAMPLE PRODUCTS ===');
  products?.forEach(p => console.log(' ', p.name?.substring(0, 35).padEnd(35), '$' + p.cost_price, p.category));
}

check();
