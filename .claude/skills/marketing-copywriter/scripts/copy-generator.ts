/**
 * Marketing Copywriter Client
 *
 * Generates brand-consistent marketing copy using templates and AI.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

type BusinessSlug = 'teelixir' | 'boo' | 'elevate' | 'rhf';
type CopyCategory = 'email_subject' | 'email_body' | 'ad_copy' | 'product_description' | 'social_post' | 'sms';
type CopyFramework = 'aida' | 'pas' | 'fab' | 'before_after' | 'storytelling';

interface CopyTemplate {
  id: string;
  business_slug: BusinessSlug;
  category: CopyCategory;
  template_name: string;
  template_content: string;
  variables: string[];
  example_output: string;
  performance_score?: number;
}

interface VoiceGuidelines {
  tone: string[];
  vocabulary: {
    preferred: string[];
    avoid: string[];
  };
  sentence_style: string;
  brand_phrases: string[];
}

interface GeneratedCopy {
  headline?: string;
  body: string;
  cta?: string;
  framework: CopyFramework;
  variationsCount: number;
  brandScore: number;
}

interface SubjectLineResult {
  subject: string;
  previewText: string;
  characterCount: number;
  formula: string;
}

// Power words categorized for different purposes
const POWER_WORDS = {
  urgency: ['now', 'today', 'limited', 'expires', 'last chance', 'hurry', 'quick', 'instant', 'immediately'],
  exclusivity: ['exclusive', 'VIP', 'members-only', 'private', 'invitation-only', 'insider', 'elite'],
  trust: ['proven', 'certified', 'guaranteed', 'backed', 'authentic', 'trusted', 'verified', 'safe'],
  value: ['free', 'save', 'bonus', 'gift', 'included', 'extra', 'complimentary', 'special'],
  wellness: ['nourish', 'restore', 'balance', 'energize', 'revitalize', 'heal', 'strengthen', 'support'],
  curiosity: ['secret', 'discover', 'revealed', 'unlock', 'hidden', 'surprising', 'unexpected'],
  emotion: ['love', 'transform', 'amazing', 'incredible', 'powerful', 'life-changing']
};

// Subject line formulas
const SUBJECT_FORMULAS = [
  { name: 'question', template: '{{question}}?' },
  { name: 'how_to', template: 'How to {{benefit}} in {{timeframe}}' },
  { name: 'list', template: '{{number}} {{ways/tips/secrets}} to {{benefit}}' },
  { name: 'urgency', template: 'Last chance: {{offer}} ends {{when}}' },
  { name: 'curiosity', template: 'The secret to {{benefit}}' },
  { name: 'personal', template: '{{name}}, your {{item}} is waiting' },
  { name: 'announcement', template: 'Introducing: {{product}}' },
  { name: 'discount', template: 'Save {{percent}}% on {{product}}' }
];

export class MarketingCopywriterClient {
  private supabase: SupabaseClient;
  private static instance: MarketingCopywriterClient;

  private constructor() {
    const supabaseUrl = process.env.MASTER_SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
    const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseKey) {
      throw new Error('MASTER_SUPABASE_SERVICE_ROLE_KEY is required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): MarketingCopywriterClient {
    if (!MarketingCopywriterClient.instance) {
      MarketingCopywriterClient.instance = new MarketingCopywriterClient();
    }
    return MarketingCopywriterClient.instance;
  }

  /**
   * Get voice guidelines for a business
   */
  async getVoiceGuidelines(businessSlug: BusinessSlug): Promise<VoiceGuidelines | null> {
    const { data, error } = await this.supabase
      .from('brand_guidelines')
      .select('voice_guidelines')
      .eq('business_slug', businessSlug)
      .single();

    if (error || !data) {
      console.error('Error fetching voice guidelines:', error);
      return null;
    }

    return data.voice_guidelines as VoiceGuidelines;
  }

  /**
   * Get copy templates for a business
   */
  async getTemplates(
    businessSlug: BusinessSlug,
    category?: CopyCategory
  ): Promise<CopyTemplate[]> {
    let query = this.supabase
      .from('marketing_copy_library')
      .select('*')
      .eq('business_slug', businessSlug);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('performance_score', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Generate email subject lines
   */
  async generateSubjectLines(
    businessSlug: BusinessSlug,
    params: {
      topic: string;
      offer?: string;
      productName?: string;
      urgency?: boolean;
      personalization?: boolean;
    }
  ): Promise<SubjectLineResult[]> {
    const voice = await this.getVoiceGuidelines(businessSlug);
    const results: SubjectLineResult[] = [];

    // Question format
    results.push({
      subject: `Ready to ${params.topic.toLowerCase()}?`,
      previewText: `Discover how ${params.productName || 'our products'} can help...`,
      characterCount: `Ready to ${params.topic.toLowerCase()}?`.length,
      formula: 'question'
    });

    // Benefit format
    if (params.offer) {
      results.push({
        subject: `Save ${params.offer} on ${params.productName || 'your order'}`,
        previewText: 'Limited time offer inside...',
        characterCount: `Save ${params.offer} on ${params.productName || 'your order'}`.length,
        formula: 'discount'
      });
    }

    // Urgency format
    if (params.urgency) {
      results.push({
        subject: `Last chance: ${params.topic} ends tonight`,
        previewText: `Don't miss out on ${params.offer || 'this offer'}...`,
        characterCount: `Last chance: ${params.topic} ends tonight`.length,
        formula: 'urgency'
      });
    }

    // Curiosity format
    results.push({
      subject: `The secret to ${params.topic.toLowerCase()}`,
      previewText: voice?.brand_phrases?.[0] || 'We have something special for you...',
      characterCount: `The secret to ${params.topic.toLowerCase()}`.length,
      formula: 'curiosity'
    });

    return results;
  }

  /**
   * Generate copy using AIDA framework
   */
  generateAIDA(params: {
    attention: string;
    interest: string;
    desire: string;
    action: string;
  }): GeneratedCopy {
    const body = `${params.attention}

${params.interest}

${params.desire}

${params.action}`;

    return {
      headline: params.attention,
      body,
      cta: params.action,
      framework: 'aida',
      variationsCount: 1,
      brandScore: 85
    };
  }

  /**
   * Generate copy using PAS framework
   */
  generatePAS(params: {
    problem: string;
    agitate: string;
    solution: string;
    cta?: string;
  }): GeneratedCopy {
    const body = `${params.problem}

${params.agitate}

${params.solution}`;

    return {
      headline: params.problem,
      body,
      cta: params.cta,
      framework: 'pas',
      variationsCount: 1,
      brandScore: 85
    };
  }

  /**
   * Generate copy using FAB framework
   */
  generateFAB(params: {
    feature: string;
    advantage: string;
    benefit: string;
  }): GeneratedCopy {
    const body = `${params.feature}

${params.advantage}

${params.benefit}`;

    return {
      body,
      framework: 'fab',
      variationsCount: 1,
      brandScore: 85
    };
  }

  /**
   * Validate copy against brand guidelines
   */
  async validateBrandVoice(
    businessSlug: BusinessSlug,
    copy: string
  ): Promise<{
    isCompliant: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const voice = await this.getVoiceGuidelines(businessSlug);
    if (!voice) {
      return { isCompliant: true, score: 50, issues: ['No voice guidelines found'], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for avoided words
    const lowerCopy = copy.toLowerCase();
    for (const word of voice.vocabulary.avoid) {
      if (lowerCopy.includes(word.toLowerCase())) {
        issues.push(`Contains avoided word: "${word}"`);
        score -= 10;
      }
    }

    // Check for preferred vocabulary usage
    let preferredCount = 0;
    for (const word of voice.vocabulary.preferred) {
      if (lowerCopy.includes(word.toLowerCase())) {
        preferredCount++;
      }
    }
    if (preferredCount === 0) {
      suggestions.push(`Consider using brand vocabulary: ${voice.vocabulary.preferred.slice(0, 3).join(', ')}`);
      score -= 5;
    }

    // Check for brand phrases
    let brandPhraseUsed = false;
    for (const phrase of voice.brand_phrases || []) {
      if (lowerCopy.includes(phrase.toLowerCase())) {
        brandPhraseUsed = true;
        break;
      }
    }
    if (!brandPhraseUsed && voice.brand_phrases?.length > 0) {
      suggestions.push(`Consider including a brand phrase`);
    }

    return {
      isCompliant: score >= 70,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  /**
   * Save a copy template
   */
  async saveTemplate(
    businessSlug: BusinessSlug,
    template: Omit<CopyTemplate, 'id' | 'business_slug'>
  ): Promise<CopyTemplate | null> {
    const { data, error } = await this.supabase
      .from('marketing_copy_library')
      .insert({
        business_slug: businessSlug,
        ...template
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving template:', error);
      return null;
    }

    return data;
  }

  /**
   * Get power words by category
   */
  getPowerWords(category: keyof typeof POWER_WORDS): string[] {
    return POWER_WORDS[category] || [];
  }

  /**
   * Get all subject line formulas
   */
  getSubjectFormulas(): typeof SUBJECT_FORMULAS {
    return SUBJECT_FORMULAS;
  }
}

// Export singleton instance getter
export const getCopywriterClient = () => MarketingCopywriterClient.getInstance();

// CLI usage
if (require.main === module) {
  const client = getCopywriterClient();

  async function main() {
    const [command, businessSlug, ...args] = process.argv.slice(2);

    switch (command) {
      case 'voice':
        const voice = await client.getVoiceGuidelines(businessSlug as BusinessSlug);
        console.log(JSON.stringify(voice, null, 2));
        break;

      case 'templates':
        const templates = await client.getTemplates(businessSlug as BusinessSlug, args[0] as CopyCategory);
        console.log(JSON.stringify(templates, null, 2));
        break;

      case 'subjects':
        const subjects = await client.generateSubjectLines(businessSlug as BusinessSlug, {
          topic: args[0] || 'wellness',
          offer: args[1],
          productName: args[2]
        });
        console.log(JSON.stringify(subjects, null, 2));
        break;

      case 'power-words':
        console.log(JSON.stringify(POWER_WORDS, null, 2));
        break;

      default:
        console.log(`
Marketing Copywriter CLI

Usage:
  npx tsx copy-generator.ts <command> <businessSlug> [args...]

Commands:
  voice <businessSlug>           Get voice guidelines
  templates <businessSlug> [category]  Get copy templates
  subjects <businessSlug> <topic> [offer] [product]  Generate subject lines
  power-words                    Get power words by category
        `);
    }
  }

  main().catch(console.error);
}
