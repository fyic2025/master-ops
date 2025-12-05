/**
 * Sample businesses table and get total count
 */

import { supabase } from '../../infra/supabase/client';

async function sampleBusinessesData() {
  console.log('📊 Analyzing businesses table...\n');

  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    console.log(`✅ Total leads in businesses table: ${count}\n`);

    // Get sample data (first 5)
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('name, phone, website, city, primary_category, status, client_campaign, created_at')
      .limit(5);

    if (error) {
      throw error;
    }

    console.log('📋 Sample businesses (first 5):\n');
    businesses?.forEach((business: typeof businesses[number], index: number) => {
      console.log(`${index + 1}. ${business.name}`);
      console.log(`   📍 ${business.city}`);
      console.log(`   📞 ${business.phone || 'No phone'}`);
      console.log(`   🌐 ${business.website || 'No website'}`);
      console.log(`   🏷️  ${business.primary_category}`);
      console.log(`   📊 Status: ${business.status}`);
      console.log(`   📅 Campaign: ${business.client_campaign}`);
      console.log(`   🕐 Created: ${new Date(business.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Get status breakdown
    const { data: statusData, error: statusError } = await supabase
      .from('businesses')
      .select('status');

    if (!statusError && statusData) {
      const statusCounts = statusData.reduce((acc: any, curr: any) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log('');
    }

    // Get campaign breakdown
    const { data: campaignData, error: campaignError } = await supabase
      .from('businesses')
      .select('client_campaign');

    if (!campaignError && campaignData) {
      const campaignCounts = campaignData.reduce((acc: any, curr: any) => {
        const campaign = curr.client_campaign || 'No campaign';
        acc[campaign] = (acc[campaign] || 0) + 1;
        return acc;
      }, {});

      console.log('📢 Campaign Breakdown:');
      Object.entries(campaignCounts).forEach(([campaign, count]) => {
        console.log(`   ${campaign}: ${count}`);
      });
      console.log('');
    }

    // Get category breakdown (top 10)
    const { data: categoryData, error: categoryError } = await supabase
      .from('businesses')
      .select('primary_category');

    if (!categoryError && categoryData) {
      const categoryCounts = categoryData.reduce((acc: any, curr: any) => {
        const category = curr.primary_category || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const topCategories = Object.entries(categoryCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10);

      console.log('🏷️  Top 10 Categories:');
      topCategories.forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });
      console.log('');
    }

    return {
      totalCount: count,
      sample: businesses,
    };

  } catch (error) {
    console.error('❌ Error analyzing businesses table:', error);
    throw error;
  }
}

sampleBusinessesData()
  .then(result => {
    console.log(`\n✨ Analysis complete! Total: ${result.totalCount} leads`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to analyze businesses table');
    process.exit(1);
  });

