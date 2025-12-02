/**
 * Fetch businesses from Supabase
 */

import { supabase } from './infra/supabase/client';

async function getBusinesses() {
  console.log('Fetching businesses from Supabase...\n');

  try {
    // Try to get all businesses
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .limit(100);

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${businesses?.length || 0} businesses:\n`);

    if (businesses && businesses.length > 0) {
      businesses.forEach((business: any, index: number) => {
        console.log(`${index + 1}. Business:`, JSON.stringify(business, null, 2));
        console.log('---');
      });
    } else {
      console.log('No businesses found in the database.\n');
    }

    return businesses;

  } catch (error) {
    console.error('❌ Error fetching businesses:', error);

    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variables')) {
        console.error('\n💡 Please update your .env file with actual Supabase credentials:');
        console.error('   SUPABASE_URL=https://your-project-id.supabase.co');
        console.error('   SUPABASE_ANON_KEY=your-actual-anon-key');
        console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('\n💡 The "businesses" table does not exist in your database.');
        console.error('   Please create it or check the table name.\n');
      } else if (error.message.includes('fetch failed') || error.message.includes('Invalid URL')) {
        console.error('\n💡 Could not connect to Supabase. Please check:');
        console.error('   1. Your .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY');
        console.error('   2. The URL is valid (should be https://xxx.supabase.co)');
        console.error('   3. Your internet connection is working\n');
      }
    }

    throw error;
  }
}

getBusinesses()
  .then(businesses => {
    console.log(`\n✨ Successfully fetched ${businesses.length} businesses!`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to fetch businesses');
    process.exit(1);
  });
