/**
 * Email Template Designer Client
 *
 * Manages email templates: CRUD operations, rendering, validation, and component assembly.
 * Integrates with brand-asset-manager for styling consistency.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Import brand client for context
import { getEmailContext, BusinessSlug } from '../../brand-asset-manager/scripts/brand-client';

// Types
export type TemplateStatus = 'draft' | 'review' | 'approved' | 'active' | 'archived';
export type TemplateType = 'promotional' | 'automated' | 'newsletter' | 'transactional' | 'b2b';
export type LayoutType = 'single-column' | 'two-column' | 'hero' | 'minimal' | 'newsletter' | 'custom';

export interface EmailTemplate {
  id: string;
  business_slug: BusinessSlug;
  category_id: string | null;
  template_slug: string;
  template_name: string;
  description: string | null;
  subject_line: string;
  preview_text: string | null;
  html_content: string;
  text_content: string | null;
  available_variables: TemplateVariable[];
  sample_data: Record<string, string>;
  layout_type: LayoutType;
  header_image_url: string | null;
  use_brand_header: boolean;
  use_brand_footer: boolean;
  status: TemplateStatus;
  version: number;
  times_sent: number;
  avg_open_rate: number | null;
  avg_click_rate: number | null;
  avg_conversion_rate: number | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  description?: string;
  required: boolean;
  default?: string;
}

export interface TemplateComponent {
  id: string;
  business_slug: BusinessSlug | null;
  component_type: string;
  component_name: string;
  html_content: string;
  css_styles: string | null;
  available_variables: TemplateVariable[];
  is_default: boolean;
  is_active: boolean;
}

export interface RenderResult {
  html: string;
  text: string;
  subject: string;
  previewText: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  line?: number;
}

// Client class
export class EmailTemplateClient {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Get all templates for a business
   */
  async getTemplates(businessSlug: BusinessSlug, status?: TemplateStatus): Promise<EmailTemplate[]> {
    let query = this.supabase
      .from('email_templates')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('is_current', true);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('template_type').order('template_name');

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data as EmailTemplate[];
  }

  /**
   * Get template by slug
   */
  async getTemplate(businessSlug: BusinessSlug, templateSlug: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('template_slug', templateSlug)
      .single();

    if (error) return null;
    return data as EmailTemplate;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) return null;
    return data as EmailTemplate;
  }

  /**
   * Create new template
   */
  async createTemplate(
    businessSlug: BusinessSlug,
    templateSlug: string,
    templateData: {
      name: string;
      type: TemplateType;
      subject: string;
      previewText?: string;
      htmlContent: string;
      textContent?: string;
      variables?: TemplateVariable[];
      layoutType?: LayoutType;
      description?: string;
    }
  ): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .insert({
        business_slug: businessSlug,
        template_slug: templateSlug,
        template_name: templateData.name,
        template_type: templateData.type,
        subject_line: templateData.subject,
        preview_text: templateData.previewText || null,
        html_content: templateData.htmlContent,
        text_content: templateData.textContent || null,
        available_variables: templateData.variables || [],
        layout_type: templateData.layoutType || 'single-column',
        description: templateData.description || null,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return null;
    }

    return data as EmailTemplate;
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating template:', error);
      return false;
    }

    return true;
  }

  /**
   * Update template status
   */
  async updateStatus(
    templateId: string,
    status: TemplateStatus,
    approvedBy?: string
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved' && approvedBy) {
      updates.approved_by = approvedBy;
      updates.approved_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId);

    return !error;
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<RenderResult | null> {
    // Get template
    const template = await this.getTemplateById(templateId);
    if (!template) return null;

    // Get brand context for automatic variables
    const brandContext = await getEmailContext(template.business_slug);
    if (!brandContext) return null;

    // Build all variables (brand + user-provided)
    const allVars: Record<string, string> = {
      // Brand variables
      brand_name: brandContext.fromName,
      brand_logo: brandContext.logo || '',
      primary_color: brandContext.colors.primary,
      secondary_color: brandContext.colors.secondary || brandContext.colors.primary,
      accent_color: brandContext.colors.accent || brandContext.colors.primary,
      background_color: brandContext.colors.background,
      text_color: brandContext.colors.text,
      website_url: brandContext.websiteUrl || '',
      social_instagram: brandContext.socialLinks?.instagram || '',
      social_facebook: brandContext.socialLinks?.facebook || '',
      from_name: brandContext.fromName,
      from_email: brandContext.fromEmail,
      // User variables override defaults
      ...variables
    };

    // Apply variable substitution
    const html = this.substituteVariables(template.html_content, allVars);
    const text = this.substituteVariables(template.text_content || '', allVars);
    const subject = this.substituteVariables(template.subject_line, allVars);
    const previewText = this.substituteVariables(template.preview_text || '', allVars);

    return { html, text, subject, previewText };
  }

  /**
   * Get components for a business
   */
  async getComponents(businessSlug: BusinessSlug, componentType?: string): Promise<TemplateComponent[]> {
    let query = this.supabase
      .from('email_template_components')
      .select('*')
      .or(`business_slug.eq.${businessSlug},business_slug.is.null`)
      .eq('is_active', true);

    if (componentType) {
      query = query.eq('component_type', componentType);
    }

    const { data, error } = await query.order('component_type').order('component_name');

    if (error) {
      console.error('Error fetching components:', error);
      return [];
    }

    return data as TemplateComponent[];
  }

  /**
   * Create new component
   */
  async createComponent(
    componentData: {
      businessSlug?: BusinessSlug;
      componentType: string;
      componentName: string;
      htmlContent: string;
      cssStyles?: string;
      variables?: TemplateVariable[];
      isDefault?: boolean;
    }
  ): Promise<TemplateComponent | null> {
    const { data, error } = await this.supabase
      .from('email_template_components')
      .insert({
        business_slug: componentData.businessSlug || null,
        component_type: componentData.componentType,
        component_name: componentData.componentName,
        html_content: componentData.htmlContent,
        css_styles: componentData.cssStyles || null,
        available_variables: componentData.variables || [],
        is_default: componentData.isDefault || false,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating component:', error);
      return null;
    }

    return data as TemplateComponent;
  }

  /**
   * Validate template HTML
   */
  validateTemplate(htmlContent: string): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check for required elements
    if (!htmlContent.includes('<!DOCTYPE')) {
      warnings.push({
        type: 'warning',
        code: 'MISSING_DOCTYPE',
        message: 'Missing DOCTYPE declaration'
      });
    }

    if (!htmlContent.includes('<meta name="viewport"')) {
      warnings.push({
        type: 'warning',
        code: 'MISSING_VIEWPORT',
        message: 'Missing viewport meta tag for mobile responsiveness'
      });
    }

    // Check for forbidden elements
    if (htmlContent.includes('<script')) {
      errors.push({
        type: 'error',
        code: 'SCRIPT_TAG',
        message: 'JavaScript is not supported in email clients'
      });
    }

    if (htmlContent.includes('<style') && !htmlContent.includes('<!--[if mso]>')) {
      warnings.push({
        type: 'warning',
        code: 'EXTERNAL_STYLES',
        message: 'Gmail may strip <style> tags. Use inline CSS.'
      });
    }

    // Check for accessibility
    const imgMatches = htmlContent.match(/<img[^>]*>/g) || [];
    for (const img of imgMatches) {
      if (!img.includes('alt=')) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_ALT',
          message: 'Image missing alt attribute'
        });
      }
    }

    // Check for unsubscribe link
    if (!htmlContent.includes('unsubscribe') && !htmlContent.includes('{{unsubscribe_url}}')) {
      warnings.push({
        type: 'warning',
        code: 'NO_UNSUBSCRIBE',
        message: 'Email should include an unsubscribe link for compliance'
      });
    }

    // Check width
    if (htmlContent.includes('width="700"') || htmlContent.includes('width: 700px')) {
      warnings.push({
        type: 'warning',
        code: 'WIDTH_TOO_LARGE',
        message: 'Email width should not exceed 600px for best compatibility'
      });
    }

    // Check for unreplaced variables
    const unreplacedVars = htmlContent.match(/\{\{[^}]+\}\}/g) || [];
    // This is just validation - variables are expected in templates

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Record template send
   */
  async recordSend(templateId: string, count: number = 1): Promise<void> {
    await this.supabase.rpc('increment_template_sends', {
      template_id: templateId,
      send_count: count
    });
  }

  /**
   * Update template performance metrics
   */
  async updatePerformance(
    templateId: string,
    metrics: {
      openRate?: number;
      clickRate?: number;
      conversionRate?: number;
    }
  ): Promise<boolean> {
    const updates: Record<string, any> = {};

    if (metrics.openRate !== undefined) updates.avg_open_rate = metrics.openRate;
    if (metrics.clickRate !== undefined) updates.avg_click_rate = metrics.clickRate;
    if (metrics.conversionRate !== undefined) updates.avg_conversion_rate = metrics.conversionRate;

    if (Object.keys(updates).length === 0) return true;

    const { error } = await this.supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId);

    return !error;
  }

  /**
   * Generate plain text version from HTML
   */
  generatePlainText(html: string): string {
    let text = html
      // Remove style and script tags with content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Convert headers
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert links to text with URL
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      // Remove all other tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  // Private helper methods
  private substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(pattern, value || '');
    }

    return result;
  }
}

// Singleton instance
let clientInstance: EmailTemplateClient | null = null;

export function getTemplateClient(): EmailTemplateClient {
  if (!clientInstance) {
    clientInstance = new EmailTemplateClient();
  }
  return clientInstance;
}

// Export convenience functions
export const getTemplates = (slug: BusinessSlug, status?: TemplateStatus) =>
  getTemplateClient().getTemplates(slug, status);
export const getTemplate = (slug: BusinessSlug, templateSlug: string) =>
  getTemplateClient().getTemplate(slug, templateSlug);
export const renderTemplate = (templateId: string, vars: Record<string, string>) =>
  getTemplateClient().renderTemplate(templateId, vars);
export const validateTemplate = (html: string) =>
  getTemplateClient().validateTemplate(html);

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const businessSlug = args[1] as BusinessSlug;

  const client = new EmailTemplateClient();

  async function main() {
    switch (command) {
      case 'list':
        const templates = await client.getTemplates(businessSlug);
        console.log(JSON.stringify(templates.map(t => ({
          slug: t.template_slug,
          name: t.template_name,
          type: t.template_type,
          status: t.status
        })), null, 2));
        break;

      case 'get':
        const templateSlug = args[2];
        const template = await client.getTemplate(businessSlug, templateSlug);
        console.log(JSON.stringify(template, null, 2));
        break;

      case 'render':
        const renderSlug = args[2];
        const varsJson = args[3] || '{}';
        const tpl = await client.getTemplate(businessSlug, renderSlug);
        if (tpl) {
          const result = await client.renderTemplate(tpl.id, JSON.parse(varsJson));
          console.log('=== SUBJECT ===');
          console.log(result?.subject);
          console.log('\n=== HTML ===');
          console.log(result?.html);
        }
        break;

      case 'validate':
        const htmlFile = args[1];
        const fs = await import('fs');
        const html = fs.readFileSync(htmlFile, 'utf-8');
        const validation = client.validateTemplate(html);
        console.log(JSON.stringify(validation, null, 2));
        break;

      case 'components':
        const components = await client.getComponents(businessSlug);
        console.log(JSON.stringify(components.map(c => ({
          type: c.component_type,
          name: c.component_name
        })), null, 2));
        break;

      default:
        console.log(`
Email Template Designer CLI

Usage:
  npx tsx template-client.ts list <business>              - List all templates
  npx tsx template-client.ts get <business> <slug>        - Get template by slug
  npx tsx template-client.ts render <business> <slug> [vars]  - Render template
  npx tsx template-client.ts validate <html-file>         - Validate HTML
  npx tsx template-client.ts components <business>        - List components

Businesses: teelixir, boo, elevate, rhf
        `);
    }
  }

  main().catch(console.error);
}
