/**
 * Litmus Email Preview Testing Client
 *
 * Integration with Litmus API for email preview testing across clients.
 * Documentation: https://docs.litmus.com/api/
 */

import fetch from 'node-fetch';

interface LitmusConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

interface EmailClient {
  id: string;
  name: string;
  platform: 'desktop' | 'webmail' | 'mobile';
  category: string;
}

interface PreviewResult {
  clientId: string;
  clientName: string;
  imageUrl: string;
  thumbnailUrl: string;
  status: 'pending' | 'complete' | 'error';
  renderTime?: number;
}

interface SpamResult {
  score: number;
  maxScore: number;
  isSpammy: boolean;
  tests: {
    name: string;
    score: number;
    description: string;
  }[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  accessibility: {
    score: number;
    issues: string[];
  };
}

// Priority email clients for testing
const PRIORITY_CLIENTS: EmailClient[] = [
  // Desktop
  { id: 'ol2019', name: 'Outlook 2019', platform: 'desktop', category: 'outlook' },
  { id: 'ol2021', name: 'Outlook 2021', platform: 'desktop', category: 'outlook' },
  { id: 'applemailmac', name: 'Apple Mail (macOS)', platform: 'desktop', category: 'apple' },
  { id: 'olmac', name: 'Outlook for Mac', platform: 'desktop', category: 'outlook' },

  // Webmail
  { id: 'gmailchrome', name: 'Gmail (Chrome)', platform: 'webmail', category: 'gmail' },
  { id: 'outlookcom', name: 'Outlook.com', platform: 'webmail', category: 'outlook' },
  { id: 'yahoo', name: 'Yahoo Mail', platform: 'webmail', category: 'yahoo' },

  // Mobile
  { id: 'iphonexs', name: 'iPhone XS', platform: 'mobile', category: 'apple' },
  { id: 'iphone13', name: 'iPhone 13', platform: 'mobile', category: 'apple' },
  { id: 'gmailapp', name: 'Gmail App', platform: 'mobile', category: 'gmail' },
  { id: 'outlookapp', name: 'Outlook App', platform: 'mobile', category: 'outlook' }
];

// Spam trigger words
const SPAM_TRIGGERS = [
  'act now', 'click here', 'free', 'urgent', 'limited time',
  'congratulations', 'winner', 'cash', 'cheap', 'guarantee',
  'no obligation', 'order now', 'special promotion', 'buy now',
  'discount', 'double your', 'earn money', 'extra income',
  'great offer', 'incredible deal', 'money back', 'no catch',
  'no cost', 'no fees', 'no strings', 'obligation', 'once in a lifetime',
  'one time', 'pennies a day', 'potential earnings', 'prize',
  'promise', 'pure profit', 'risk free', 'satisfaction guaranteed',
  'special offer', 'this is not spam', 'trial', 'unlimited',
  'while supplies last', 'you have been selected', 'you\'re a winner'
];

export class LitmusClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private static instance: LitmusClient;

  private constructor(config?: LitmusConfig) {
    this.apiKey = config?.apiKey || process.env.LITMUS_API_KEY || '';
    this.apiSecret = config?.apiSecret || process.env.LITMUS_API_SECRET || '';
    this.baseUrl = config?.baseUrl || 'https://api.litmus.com/v1';
  }

  static getInstance(config?: LitmusConfig): LitmusClient {
    if (!LitmusClient.instance) {
      LitmusClient.instance = new LitmusClient(config);
    }
    return LitmusClient.instance;
  }

  /**
   * Check if Litmus is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get priority email clients for testing
   */
  getPriorityClients(): EmailClient[] {
    return PRIORITY_CLIENTS;
  }

  /**
   * Create email preview test
   */
  async createPreviewTest(params: {
    subject: string;
    html: string;
    plainText?: string;
    clients?: string[];
  }): Promise<{ testId: string; status: string }> {
    if (!this.isConfigured()) {
      throw new Error('Litmus API credentials not configured');
    }

    const clientIds = params.clients || PRIORITY_CLIENTS.map(c => c.id);

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: params.subject,
        html_source: params.html,
        plain_text_source: params.plainText,
        clients: clientIds
      })
    });

    if (!response.ok) {
      throw new Error(`Litmus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { id: string; status: string };
    return { testId: data.id, status: data.status };
  }

  /**
   * Get preview results for a test
   */
  async getPreviewResults(testId: string): Promise<PreviewResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Litmus API credentials not configured');
    }

    const response = await fetch(`${this.baseUrl}/emails/${testId}/previews`, {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Litmus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any[];
    return data.map(preview => ({
      clientId: preview.client_id,
      clientName: preview.client_name,
      imageUrl: preview.image_url,
      thumbnailUrl: preview.thumbnail_url,
      status: preview.status,
      renderTime: preview.render_time
    }));
  }

  /**
   * Analyze email for spam triggers (offline analysis)
   */
  analyzeSpamScore(params: {
    subject: string;
    html: string;
    plainText?: string;
  }): SpamResult {
    const tests: SpamResult['tests'] = [];
    let totalScore = 0;

    const fullText = `${params.subject} ${params.html} ${params.plainText || ''}`.toLowerCase();

    // Check spam trigger words
    for (const trigger of SPAM_TRIGGERS) {
      if (fullText.includes(trigger.toLowerCase())) {
        const score = trigger.includes('free') || trigger.includes('urgent') ? 2 : 1;
        tests.push({
          name: `Contains "${trigger}"`,
          score,
          description: `Spam trigger word found: "${trigger}"`
        });
        totalScore += score;
      }
    }

    // Check for excessive caps in subject
    const capsRatio = (params.subject.match(/[A-Z]/g) || []).length / params.subject.length;
    if (capsRatio > 0.5) {
      tests.push({
        name: 'Excessive capitals',
        score: 2,
        description: 'Subject line has too many capital letters'
      });
      totalScore += 2;
    }

    // Check for excessive exclamation marks
    const exclamationCount = (params.subject.match(/!/g) || []).length;
    if (exclamationCount > 1) {
      tests.push({
        name: 'Multiple exclamation marks',
        score: 1.5,
        description: `Subject contains ${exclamationCount} exclamation marks`
      });
      totalScore += 1.5;
    }

    // Check for unsubscribe link
    if (!params.html.toLowerCase().includes('unsubscribe')) {
      tests.push({
        name: 'Missing unsubscribe',
        score: 3,
        description: 'Email should contain an unsubscribe link'
      });
      totalScore += 3;
    }

    // Check text to image ratio
    const imageCount = (params.html.match(/<img/gi) || []).length;
    const textLength = params.html.replace(/<[^>]*>/g, '').length;
    if (imageCount > 0 && textLength / imageCount < 100) {
      tests.push({
        name: 'Low text to image ratio',
        score: 1,
        description: 'Email has too many images relative to text'
      });
      totalScore += 1;
    }

    // Check for plain text version
    if (!params.plainText) {
      tests.push({
        name: 'No plain text version',
        score: 0.5,
        description: 'Including a plain text version improves deliverability'
      });
      totalScore += 0.5;
    }

    return {
      score: Math.min(10, totalScore),
      maxScore: 10,
      isSpammy: totalScore >= 5,
      tests
    };
  }

  /**
   * Validate email HTML
   */
  validateHTML(html: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const accessibilityIssues: string[] = [];
    let accessibilityScore = 100;

    // Check for DOCTYPE
    if (!html.includes('<!DOCTYPE')) {
      warnings.push('Missing DOCTYPE declaration');
    }

    // Check for HTML lang attribute
    if (!html.match(/<html[^>]*lang=/i)) {
      accessibilityIssues.push('Missing language attribute on <html> tag');
      accessibilityScore -= 10;
    }

    // Check for meta charset
    if (!html.match(/charset/i)) {
      warnings.push('Missing charset declaration');
    }

    // Check for viewport meta tag (mobile)
    if (!html.match(/viewport/i)) {
      warnings.push('Missing viewport meta tag for mobile');
    }

    // Check all images have alt attributes
    const imagesWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
    if (imagesWithoutAlt.length > 0) {
      accessibilityIssues.push(`${imagesWithoutAlt.length} image(s) missing alt text`);
      accessibilityScore -= imagesWithoutAlt.length * 5;
    }

    // Check for table role="presentation"
    const tablesWithoutRole = html.match(/<table(?![^>]*role="presentation")[^>]*>/gi) || [];
    if (tablesWithoutRole.length > 0) {
      accessibilityIssues.push(`${tablesWithoutRole.length} table(s) missing role="presentation"`);
      accessibilityScore -= 5;
    }

    // Check for inline styles (required for email)
    if (!html.includes('style=')) {
      warnings.push('No inline styles found - may not render correctly in email clients');
    }

    // Check for "click here" links
    if (html.match(/click here/gi)) {
      accessibilityIssues.push('Avoid "click here" link text - use descriptive links');
      accessibilityScore -= 5;
    }

    // Check for sufficient text contrast (basic check)
    if (html.match(/color:\s*#[a-f0-9]{6}/gi)) {
      // Would need full color parsing for accurate contrast check
      warnings.push('Verify color contrast meets WCAG 4.5:1 ratio');
    }

    // Check for max-width for Outlook
    if (!html.match(/max-width:\s*600px/i) && !html.match(/width:\s*600/i)) {
      warnings.push('Consider 600px max-width for optimal rendering');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      accessibility: {
        score: Math.max(0, accessibilityScore),
        issues: accessibilityIssues
      }
    };
  }

  /**
   * Generate dark mode CSS
   */
  generateDarkModeCSS(params: {
    bgDark: string;
    textDark: string;
    primaryDark?: string;
  }): string {
    return `
<!-- Dark Mode Styles -->
<style>
  /* Gmail App, Apple Mail */
  @media (prefers-color-scheme: dark) {
    .dark-bg { background-color: ${params.bgDark} !important; }
    .dark-text { color: ${params.textDark} !important; }
    ${params.primaryDark ? `.dark-primary { color: ${params.primaryDark} !important; }` : ''}
  }

  /* Outlook.com */
  [data-ogsb] .dark-bg { background-color: ${params.bgDark} !important; }
  [data-ogsb] .dark-text { color: ${params.textDark} !important; }
  ${params.primaryDark ? `[data-ogsb] .dark-primary { color: ${params.primaryDark} !important; }` : ''}

  /* Outlook Windows */
  [data-ogsc] .dark-bg { background-color: ${params.bgDark} !important; }
  [data-ogsc] .dark-text { color: ${params.textDark} !important; }
</style>
`;
  }
}

// Export singleton getter
export const getLitmusClient = (config?: LitmusConfig) => LitmusClient.getInstance(config);

// CLI usage
if (require.main === module) {
  const client = getLitmusClient();

  async function main() {
    const [command, ...args] = process.argv.slice(2);

    switch (command) {
      case 'clients':
        console.log('Priority Email Clients:');
        console.table(client.getPriorityClients());
        break;

      case 'configured':
        console.log('Litmus configured:', client.isConfigured());
        break;

      case 'spam-analyze':
        const html = args[0] || '<html><body>Test email</body></html>';
        const subject = args[1] || 'Test Subject';
        const result = client.analyzeSpamScore({ subject, html });
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'validate':
        const htmlContent = args[0] || '<html><body>Test</body></html>';
        const validation = client.validateHTML(htmlContent);
        console.log(JSON.stringify(validation, null, 2));
        break;

      default:
        console.log(`
Litmus Email Preview Testing Client

Usage:
  npx tsx client.ts <command> [args...]

Commands:
  clients                        List priority email clients
  configured                     Check if API is configured
  spam-analyze <html> [subject]  Analyze email for spam triggers
  validate <html>                Validate email HTML

Environment Variables:
  LITMUS_API_KEY     Litmus API key
  LITMUS_API_SECRET  Litmus API secret
        `);
    }
  }

  main().catch(console.error);
}
