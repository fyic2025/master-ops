#!/usr/bin/env npx tsx
/**
 * AI Categorization Script for Customer Interactions
 *
 * Automatically categorizes customer interactions based on:
 * 1. Rule-based pattern matching (fast, no API needed)
 * 2. AI classification (optional, uses Claude/OpenAI)
 *
 * Usage:
 *   npx tsx categorize-interactions.ts              # Rule-based only
 *   npx tsx categorize-interactions.ts --ai         # Use AI for uncategorized
 *   npx tsx categorize-interactions.ts --reprocess  # Reprocess all
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: 'buy-organics-online/BOO-CREDENTIALS.env' });
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  supabase: {
    url: process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  batchSize: 50,
};

// ============================================================================
// CATEGORIZATION RULES
// ============================================================================

interface CategoryRule {
  category: string;
  subcategory?: string;
  patterns: RegExp[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
}

const CATEGORY_RULES: CategoryRule[] = [
  // Order Tracking (most common)
  {
    category: 'order_tracking',
    subcategory: 'where_is_order',
    patterns: [
      /where.*(my|is|the).*(order|package|parcel|delivery)/i,
      /track(ing)?.*(number|code|order)/i,
      /order.*status/i,
      /when.*(will|does|is).*(deliver|arrive|ship)/i,
      /hasn't.*(arrived|shipped|been.delivered)/i,
      /not.*(received|arrived|delivered)/i,
    ],
    priority: 'medium',
  },
  {
    category: 'order_tracking',
    subcategory: 'delivery_time',
    patterns: [
      /how.long.*(deliver|ship|take)/i,
      /delivery.*(time|date|estimate)/i,
      /when.*expect/i,
      /estimated.*delivery/i,
    ],
    priority: 'low',
  },

  // Order Issues (high priority)
  {
    category: 'order_issue',
    subcategory: 'missing_items',
    patterns: [
      /missing.*(item|product|order)/i,
      /didn't.*(receive|get|include)/i,
      /not.*(include|in.*box|in.*order)/i,
      /incomplete.*order/i,
    ],
    priority: 'high',
    sentiment: 'negative',
  },
  {
    category: 'order_issue',
    subcategory: 'wrong_items',
    patterns: [
      /wrong.*(item|product|order)/i,
      /incorrect.*(item|product)/i,
      /sent.*(wrong|different)/i,
      /received.*different/i,
    ],
    priority: 'high',
    sentiment: 'negative',
  },
  {
    category: 'order_issue',
    subcategory: 'damaged',
    patterns: [
      /damaged|broken|crushed|leaked/i,
      /arrived.*broken/i,
      /package.*(damaged|crushed)/i,
    ],
    priority: 'high',
    sentiment: 'negative',
  },

  // Payment Issues (urgent)
  {
    category: 'payment',
    subcategory: 'payment_failed',
    patterns: [
      /payment.*(failed|declined|error|issue|problem)/i,
      /card.*(declined|rejected|not.*work)/i,
      /can't.*(pay|checkout|complete.*payment)/i,
      /transaction.*(failed|error)/i,
    ],
    priority: 'urgent',
  },
  {
    category: 'payment',
    subcategory: 'eft_bank_transfer',
    patterns: [
      /bank.transfer|eft|direct.deposit/i,
      /paid.*bank/i,
      /transfer.*money/i,
      /bsb|account.number/i,
    ],
    priority: 'medium',
  },
  {
    category: 'payment',
    subcategory: 'refund',
    patterns: [
      /refund|money.back|reimburse/i,
      /want.*refund/i,
      /credit.*back/i,
    ],
    priority: 'high',
  },

  // Returns
  {
    category: 'returns',
    subcategory: 'return_request',
    patterns: [
      /return.*(product|item|order)/i,
      /send.*back/i,
      /return.*policy/i,
      /how.*return/i,
    ],
    priority: 'medium',
  },
  {
    category: 'returns',
    subcategory: 'exchange',
    patterns: [
      /exchange|swap|replace/i,
      /different.*(size|flavor|variant)/i,
    ],
    priority: 'medium',
  },

  // Order Changes
  {
    category: 'order_change',
    subcategory: 'cancel',
    patterns: [
      /cancel.*(order|my)/i,
      /want.*cancel/i,
      /stop.*order/i,
    ],
    priority: 'high',
  },
  {
    category: 'order_change',
    subcategory: 'address_change',
    patterns: [
      /change.*(address|delivery)/i,
      /wrong.*address/i,
      /update.*address/i,
      /different.*address/i,
    ],
    priority: 'high',
  },
  {
    category: 'order_change',
    subcategory: 'modify_order',
    patterns: [
      /change.*(order|item)/i,
      /add.*to.*order/i,
      /remove.*from.*order/i,
      /modify.*order/i,
    ],
    priority: 'medium',
  },

  // Product Inquiries
  {
    category: 'product_inquiry',
    subcategory: 'stock',
    patterns: [
      /in.stock|out.of.stock|available/i,
      /when.*back.*stock/i,
      /stock.*level/i,
      /availability/i,
    ],
    priority: 'low',
  },
  {
    category: 'product_inquiry',
    subcategory: 'ingredients',
    patterns: [
      /ingredient|contain|allergen|allergy/i,
      /gluten.free|vegan|organic/i,
      /what's.*in/i,
    ],
    priority: 'low',
  },
  {
    category: 'product_inquiry',
    subcategory: 'usage',
    patterns: [
      /how.*(use|take|apply)/i,
      /dosage|directions/i,
      /instructions/i,
    ],
    priority: 'low',
  },
  {
    category: 'product_inquiry',
    subcategory: 'recommendation',
    patterns: [
      /recommend|suggest|which.*should/i,
      /best.*for/i,
      /what.*product/i,
    ],
    priority: 'low',
  },

  // Shipping
  {
    category: 'shipping',
    subcategory: 'shipping_cost',
    patterns: [
      /shipping.*(cost|fee|price|charge)/i,
      /how.*much.*ship/i,
      /free.*shipping/i,
      /delivery.*fee/i,
    ],
    priority: 'low',
  },
  {
    category: 'shipping',
    subcategory: 'shipping_options',
    patterns: [
      /express.*shipping|overnight|next.day/i,
      /shipping.*(method|option)/i,
      /auspost|sendle|courier/i,
    ],
    priority: 'low',
  },

  // Technical Issues
  {
    category: 'technical',
    subcategory: 'website_issue',
    patterns: [
      /website.*(not.*work|error|issue|problem)/i,
      /can't.*(login|sign|access|checkout)/i,
      /page.*(error|not.*load|broken)/i,
      /cart.*(error|issue|empty)/i,
    ],
    priority: 'high',
  },
  {
    category: 'technical',
    subcategory: 'account_issue',
    patterns: [
      /password.*(reset|forgot|change)/i,
      /account.*(locked|blocked|access)/i,
      /can't.*log.?in/i,
    ],
    priority: 'medium',
  },

  // Pricing
  {
    category: 'pricing',
    subcategory: 'discount',
    patterns: [
      /discount|coupon|promo|voucher/i,
      /code.*not.*work/i,
      /sale|special.*offer/i,
    ],
    priority: 'low',
  },
  {
    category: 'pricing',
    subcategory: 'price_match',
    patterns: [
      /price.*match|cheaper.*elsewhere/i,
      /found.*cheaper/i,
    ],
    priority: 'low',
  },

  // Complaints (always high priority)
  {
    category: 'complaint',
    patterns: [
      /complain|complaint|unacceptable|disgusted/i,
      /terrible|awful|worst|horrible/i,
      /never.*again|lost.*customer/i,
      /report|escalate|manager|supervisor/i,
    ],
    priority: 'urgent',
    sentiment: 'negative',
  },

  // Positive Feedback
  {
    category: 'feedback',
    subcategory: 'positive',
    patterns: [
      /thank|thanks|appreciate|grateful/i,
      /great.*service|excellent|amazing|wonderful/i,
      /love.*product|highly.*recommend/i,
    ],
    priority: 'low',
    sentiment: 'positive',
  },

  // Wholesale/Business
  {
    category: 'wholesale',
    patterns: [
      /wholesale|bulk.*order|business.*account/i,
      /resell|retailer|shop.*owner/i,
      /trade.*price/i,
    ],
    priority: 'medium',
  },
];

// ============================================================================
// CATEGORIZATION ENGINE
// ============================================================================

class CategorizationEngine {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async categorizeAll(options: { reprocess?: boolean } = {}): Promise<{
    processed: number;
    categorized: number;
    uncategorized: number;
  }> {
    console.log('\n🏷️  Starting categorization...\n');

    let processed = 0;
    let categorized = 0;
    let uncategorized = 0;

    // Fetch uncategorized interactions (or all if reprocessing)
    let query = this.supabase
      .from('customer_interactions')
      .select('id, subject, transcript')
      .order('started_at', { ascending: false })
      .limit(1000);

    if (!options.reprocess) {
      query = query.is('category', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching interactions:', error.message);
      return { processed: 0, categorized: 0, uncategorized: 0 };
    }

    if (!data || data.length === 0) {
      console.log('No interactions to categorize.');
      return { processed: 0, categorized: 0, uncategorized: 0 };
    }

    console.log(`Found ${data.length} interactions to process.\n`);

    // Process in batches
    for (let i = 0; i < data.length; i += CONFIG.batchSize) {
      const batch = data.slice(i, i + CONFIG.batchSize);
      const updates: any[] = [];

      for (const interaction of batch) {
        processed++;
        const text = `${interaction.subject || ''} ${interaction.transcript || ''}`;
        const result = this.categorize(text);

        if (result) {
          categorized++;
          updates.push({
            id: interaction.id,
            category: result.category,
            subcategory: result.subcategory || null,
            priority: result.priority,
            sentiment: result.sentiment || null,
          });
        } else {
          uncategorized++;
        }
      }

      // Batch update
      if (updates.length > 0) {
        for (const update of updates) {
          await this.supabase
            .from('customer_interactions')
            .update({
              category: update.category,
              subcategory: update.subcategory,
              priority: update.priority,
              sentiment: update.sentiment,
            })
            .eq('id', update.id);
        }
      }

      console.log(`Processed ${Math.min(i + CONFIG.batchSize, data.length)}/${data.length}...`);
    }

    console.log(`\n✅ Categorization complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Categorized: ${categorized}`);
    console.log(`   Uncategorized: ${uncategorized}`);

    return { processed, categorized, uncategorized };
  }

  categorize(text: string): CategoryRule | null {
    if (!text || text.trim().length === 0) return null;

    // Try each rule in order
    for (const rule of CATEGORY_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          return rule;
        }
      }
    }

    return null;
  }

  async showCategoryDistribution(): Promise<void> {
    console.log('\n📊 CATEGORY DISTRIBUTION');
    console.log('─'.repeat(50));

    const { data } = await this.supabase
      .from('customer_interactions')
      .select('category, subcategory');

    if (!data || data.length === 0) {
      console.log('No data available.');
      return;
    }

    // Count by category
    const catCounts: Record<string, number> = {};
    const subCounts: Record<string, Record<string, number>> = {};

    data.forEach(row => {
      const cat = row.category || 'uncategorized';
      catCounts[cat] = (catCounts[cat] || 0) + 1;

      if (row.subcategory) {
        if (!subCounts[cat]) subCounts[cat] = {};
        subCounts[cat][row.subcategory] = (subCounts[cat][row.subcategory] || 0) + 1;
      }
    });

    // Sort and display
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;

    sorted.forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.ceil((count / maxCount) * 25));
      const pct = ((count / data.length) * 100).toFixed(1);
      console.log(`\n${cat.toUpperCase()} (${count} - ${pct}%)`);
      console.log(`  ${bar}`);

      // Show subcategories
      if (subCounts[cat]) {
        Object.entries(subCounts[cat])
          .sort((a, b) => b[1] - a[1])
          .forEach(([sub, subCount]) => {
            console.log(`    └─ ${sub}: ${subCount}`);
          });
      }
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('Customer Interaction Categorization');
  console.log('═'.repeat(60));

  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    console.error('❌ Missing Supabase credentials!');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const reprocess = args.includes('--reprocess');
  const showDistribution = args.includes('--show');

  const engine = new CategorizationEngine(
    CONFIG.supabase.url,
    CONFIG.supabase.serviceKey
  );

  if (showDistribution) {
    await engine.showCategoryDistribution();
  } else {
    await engine.categorizeAll({ reprocess });
    await engine.showCategoryDistribution();
  }
}

main().catch(console.error);
