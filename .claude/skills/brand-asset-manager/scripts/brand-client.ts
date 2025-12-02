/**
 * Brand Asset Manager Client
 *
 * Central client for managing brand guidelines, assets, and voice across all businesses.
 * Foundation for email-template-designer, marketing-copywriter, and other marketing skills.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Types
export type BusinessSlug = 'teelixir' | 'boo' | 'elevate' | 'rhf';

export interface BrandGuidelines {
  id: string;
  business_slug: BusinessSlug;
  business_name: string;
  tagline: string | null;
  mission_statement: string | null;

  // Colors
  primary_color: string;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string;
  text_color: string;
  muted_text_color: string;

  // Typography
  heading_font: string;
  body_font: string;
  font_cdn_url: string | null;

  // Voice
  voice_personality: string[];
  tone_characteristics: Record<string, string>;
  writing_dos: string[];
  writing_donts: string[];
  example_phrases: string[];

  // Email
  default_from_name: string;
  default_from_email: string;
  default_reply_to: string | null;
  email_footer_html: string | null;

  // Social
  website_url: string | null;
  social_links: Record<string, string>;

  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  business_slug: BusinessSlug;
  asset_type: string;
  asset_name: string;
  description: string | null;
  storage_path: string;
  public_url: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  dimensions: { width: number; height: number } | null;
  is_current: boolean;
  created_at: string;
}

export interface EmailContext {
  colors: {
    primary: string;
    secondary: string | null;
    accent: string | null;
    background: string;
    text: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
    cdnUrl: string | null;
  };
  logo: string | null;
  headerImage: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string>;
  footerHtml: string | null;
}

export interface VoiceGuidelines {
  personality: string[];
  tone: Record<string, string>;
  dos: string[];
  donts: string[];
  examples: string[];
}

export interface BrandComplianceResult {
  score: number; // 0-100
  isCompliant: boolean;
  issues: {
    type: 'warning' | 'error';
    message: string;
    suggestion: string | null;
  }[];
}

// Client class
export class BrandAssetManagerClient {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Get full brand guidelines for a business
   */
  async getGuidelines(businessSlug: BusinessSlug): Promise<BrandGuidelines | null> {
    const { data, error } = await this.supabase
      .from('brand_guidelines')
      .select('*')
      .eq('business_slug', businessSlug)
      .single();

    if (error) {
      console.error(`Error fetching guidelines for ${businessSlug}:`, error);
      return null;
    }

    return data as BrandGuidelines;
  }

  /**
   * Get all brand guidelines
   */
  async getAllGuidelines(): Promise<BrandGuidelines[]> {
    const { data, error } = await this.supabase
      .from('brand_guidelines')
      .select('*')
      .order('business_name');

    if (error) {
      console.error('Error fetching all guidelines:', error);
      return [];
    }

    return data as BrandGuidelines[];
  }

  /**
   * Get brand colors
   */
  async getColors(businessSlug: BusinessSlug): Promise<{
    primary: string;
    secondary: string | null;
    accent: string | null;
    background: string;
    text: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('brand_guidelines')
      .select('primary_color, secondary_color, accent_color, background_color, text_color')
      .eq('business_slug', businessSlug)
      .single();

    if (error || !data) return null;

    return {
      primary: data.primary_color,
      secondary: data.secondary_color,
      accent: data.accent_color,
      background: data.background_color,
      text: data.text_color
    };
  }

  /**
   * Get voice guidelines for copywriting
   */
  async getVoiceGuidelines(businessSlug: BusinessSlug): Promise<VoiceGuidelines | null> {
    const { data, error } = await this.supabase
      .from('brand_guidelines')
      .select('voice_personality, tone_characteristics, writing_dos, writing_donts, example_phrases')
      .eq('business_slug', businessSlug)
      .single();

    if (error || !data) return null;

    return {
      personality: data.voice_personality || [],
      tone: data.tone_characteristics || {},
      dos: data.writing_dos || [],
      donts: data.writing_donts || [],
      examples: data.example_phrases || []
    };
  }

  /**
   * Get email context for template rendering
   */
  async getEmailContext(businessSlug: BusinessSlug): Promise<EmailContext | null> {
    const guidelines = await this.getGuidelines(businessSlug);
    if (!guidelines) return null;

    // Get email-related assets
    const { data: assets } = await this.supabase
      .from('brand_assets')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('is_current', true)
      .in('asset_type', ['logo_primary', 'email_header', 'email_footer']);

    const logoAsset = assets?.find(a => a.asset_type === 'logo_primary');
    const headerAsset = assets?.find(a => a.asset_type === 'email_header');

    return {
      colors: {
        primary: guidelines.primary_color,
        secondary: guidelines.secondary_color,
        accent: guidelines.accent_color,
        background: guidelines.background_color,
        text: guidelines.text_color,
        muted: guidelines.muted_text_color
      },
      fonts: {
        heading: guidelines.heading_font,
        body: guidelines.body_font,
        cdnUrl: guidelines.font_cdn_url
      },
      logo: logoAsset?.public_url || null,
      headerImage: headerAsset?.public_url || null,
      fromName: guidelines.default_from_name,
      fromEmail: guidelines.default_from_email,
      replyTo: guidelines.default_reply_to,
      websiteUrl: guidelines.website_url,
      socialLinks: guidelines.social_links || {},
      footerHtml: guidelines.email_footer_html
    };
  }

  /**
   * Get assets for a business
   */
  async getAssets(businessSlug: BusinessSlug, assetType?: string): Promise<BrandAsset[]> {
    let query = this.supabase
      .from('brand_assets')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('is_current', true);

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    const { data, error } = await query.order('asset_type');

    if (error) {
      console.error('Error fetching assets:', error);
      return [];
    }

    return data as BrandAsset[];
  }

  /**
   * Get a specific asset
   */
  async getAsset(businessSlug: BusinessSlug, assetType: string, assetName?: string): Promise<BrandAsset | null> {
    let query = this.supabase
      .from('brand_assets')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('asset_type', assetType)
      .eq('is_current', true);

    if (assetName) {
      query = query.eq('asset_name', assetName);
    }

    const { data, error } = await query.single();

    if (error) return null;
    return data as BrandAsset;
  }

  /**
   * Upload an asset to Supabase Storage
   */
  async uploadAsset(
    businessSlug: BusinessSlug,
    assetType: string,
    file: Buffer,
    fileName: string,
    description?: string
  ): Promise<{ publicUrl: string; storagePath: string }> {
    const storagePath = `brands/${businessSlug}/${assetType}/${fileName}`;
    const fileType = this.getContentType(fileName);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('brand-assets')
      .upload(storagePath, file, {
        contentType: fileType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('brand-assets')
      .getPublicUrl(storagePath);

    // Mark previous version as not current
    await this.supabase
      .from('brand_assets')
      .update({ is_current: false })
      .eq('business_slug', businessSlug)
      .eq('asset_type', assetType)
      .eq('is_current', true);

    // Insert new asset record
    const assetName = fileName.split('.')[0];
    const { error: insertError } = await this.supabase
      .from('brand_assets')
      .insert({
        business_slug: businessSlug,
        asset_type: assetType,
        asset_name: assetName,
        description: description || null,
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: fileName,
        file_type: fileType,
        file_size_bytes: file.length,
        is_current: true
      });

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    return { publicUrl, storagePath };
  }

  /**
   * Update brand guidelines
   */
  async updateGuidelines(
    businessSlug: BusinessSlug,
    updates: Partial<Omit<BrandGuidelines, 'id' | 'business_slug' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('brand_guidelines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('business_slug', businessSlug);

    if (error) {
      console.error('Error updating guidelines:', error);
      return false;
    }

    return true;
  }

  /**
   * Validate content against brand guidelines
   */
  async validateBrandCompliance(businessSlug: BusinessSlug, content: string): Promise<BrandComplianceResult> {
    const voice = await this.getVoiceGuidelines(businessSlug);
    if (!voice) {
      return {
        score: 0,
        isCompliant: false,
        issues: [{ type: 'error', message: 'Could not fetch brand guidelines', suggestion: null }]
      };
    }

    const issues: BrandComplianceResult['issues'] = [];
    let score = 100;

    // Check for "don't" violations
    const contentLower = content.toLowerCase();
    for (const dont of voice.donts) {
      const dontKeywords = this.extractKeywords(dont);
      for (const keyword of dontKeywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          issues.push({
            type: 'warning',
            message: `May violate guideline: "${dont}"`,
            suggestion: `Review usage of "${keyword}"`
          });
          score -= 10;
        }
      }
    }

    // Check for example phrase usage (bonus)
    let usesExamplePatterns = false;
    for (const example of voice.examples) {
      const pattern = example.replace('...', '').toLowerCase().trim();
      if (contentLower.includes(pattern)) {
        usesExamplePatterns = true;
        break;
      }
    }
    if (!usesExamplePatterns && content.length > 100) {
      issues.push({
        type: 'warning',
        message: 'Content doesn\'t use brand example phrases',
        suggestion: `Consider incorporating phrases like: ${voice.examples.slice(0, 2).join(', ')}`
      });
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      isCompliant: score >= 70,
      issues
    };
  }

  /**
   * Generate CSS variables from brand colors
   */
  async generateCSSVariables(businessSlug: BusinessSlug): Promise<string> {
    const colors = await this.getColors(businessSlug);
    if (!colors) return '';

    return `
:root {
  --brand-primary: ${colors.primary};
  --brand-secondary: ${colors.secondary || colors.primary};
  --brand-accent: ${colors.accent || colors.primary};
  --brand-background: ${colors.background};
  --brand-text: ${colors.text};
}
`.trim();
  }

  /**
   * Generate inline styles for email
   */
  async generateEmailStyles(businessSlug: BusinessSlug): Promise<Record<string, string>> {
    const context = await this.getEmailContext(businessSlug);
    if (!context) return {};

    return {
      'body': `font-family: ${context.fonts.body}; color: ${context.colors.text}; background-color: ${context.colors.background};`,
      'h1': `font-family: ${context.fonts.heading}; color: ${context.colors.primary};`,
      'h2': `font-family: ${context.fonts.heading}; color: ${context.colors.primary};`,
      'h3': `font-family: ${context.fonts.heading}; color: ${context.colors.text};`,
      'a': `color: ${context.colors.primary};`,
      'button': `background-color: ${context.colors.primary}; color: #ffffff; border: none; padding: 12px 24px; border-radius: 4px;`,
      'muted': `color: ${context.colors.muted};`
    };
  }

  // Helper methods
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon'
    };
    return types[ext || ''] || 'application/octet-stream';
  }

  private extractKeywords(text: string): string[] {
    // Extract key words from guidelines (simple approach)
    const words = text.match(/\b[A-Za-z]{4,}\b/g) || [];
    const stopWords = ['don\'t', 'don', 'use', 'make', 'claims', 'about', 'with', 'that', 'this', 'from'];
    return words.filter(w => !stopWords.includes(w.toLowerCase()));
  }
}

// Singleton instance
let clientInstance: BrandAssetManagerClient | null = null;

export function getBrandClient(): BrandAssetManagerClient {
  if (!clientInstance) {
    clientInstance = new BrandAssetManagerClient();
  }
  return clientInstance;
}

// Export convenience functions
export const getGuidelines = (slug: BusinessSlug) => getBrandClient().getGuidelines(slug);
export const getColors = (slug: BusinessSlug) => getBrandClient().getColors(slug);
export const getVoiceGuidelines = (slug: BusinessSlug) => getBrandClient().getVoiceGuidelines(slug);
export const getEmailContext = (slug: BusinessSlug) => getBrandClient().getEmailContext(slug);
export const getAssets = (slug: BusinessSlug, type?: string) => getBrandClient().getAssets(slug, type);

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const businessSlug = args[1] as BusinessSlug;

  const client = new BrandAssetManagerClient();

  async function main() {
    switch (command) {
      case 'get':
        if (!businessSlug) {
          // Get all
          const all = await client.getAllGuidelines();
          console.log(JSON.stringify(all, null, 2));
        } else {
          const guidelines = await client.getGuidelines(businessSlug);
          console.log(JSON.stringify(guidelines, null, 2));
        }
        break;

      case 'colors':
        const colors = await client.getColors(businessSlug);
        console.log(JSON.stringify(colors, null, 2));
        break;

      case 'voice':
        const voice = await client.getVoiceGuidelines(businessSlug);
        console.log(JSON.stringify(voice, null, 2));
        break;

      case 'email':
        const email = await client.getEmailContext(businessSlug);
        console.log(JSON.stringify(email, null, 2));
        break;

      case 'assets':
        const assets = await client.getAssets(businessSlug);
        console.log(JSON.stringify(assets, null, 2));
        break;

      case 'css':
        const css = await client.generateCSSVariables(businessSlug);
        console.log(css);
        break;

      default:
        console.log(`
Brand Asset Manager CLI

Usage:
  npx tsx brand-client.ts get [business]     - Get guidelines (all or specific)
  npx tsx brand-client.ts colors <business>  - Get brand colors
  npx tsx brand-client.ts voice <business>   - Get voice guidelines
  npx tsx brand-client.ts email <business>   - Get email context
  npx tsx brand-client.ts assets <business>  - Get assets
  npx tsx brand-client.ts css <business>     - Generate CSS variables

Businesses: teelixir, boo, elevate, rhf
        `);
    }
  }

  main().catch(console.error);
}
