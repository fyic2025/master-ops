import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

const supabase = createClient(
  process.env.MASTER_SUPABASE_URL!,
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Only show 0-item pricelists to understand parsing failures
  const { data, error } = await supabase
    .from('rhf_pricelists')
    .select('supplier_id, source_filename, item_count, raw_data')
    .eq('item_count', 0)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Found', data?.length, 'pricelists\n');

  data?.forEach(p => {
    console.log('---');
    console.log('File:', p.source_filename);
    console.log('Items:', p.item_count);
    if (p.raw_data) {
      const rd = p.raw_data as any;
      console.log('Sheet:', rd.sheetName);
      console.log('Header row:', rd.headerRowIndex);
      console.log('Headers:', rd.headers?.slice(0, 6));
      console.log('Col mapping:', rd.columnMapping);
      if (rd.firstRows) {
        console.log('First rows:');
        rd.firstRows.forEach((r: any, i: number) => console.log(`  ${i}:`, r));
      }
    }
  });
}

check();
