/**
 * Email Campaign Test Configuration Template
 *
 * Use this template to configure test parameters for email campaigns.
 */

export interface CampaignTestConfig {
  // Campaign identification
  campaignId: string;
  campaignName: string;
  business: 'teelixir' | 'boo' | 'elevate' | 'rhf';

  // Test recipients (internal only)
  testRecipients: string[];

  // Send configuration
  sendConfig: {
    provider: 'gmail' | 'smartlead' | 'resend' | 'sendgrid';
    dailyLimit: number;
    sendWindowStart: number; // Hour in AEST (0-23)
    sendWindowEnd: number;
    delayBetweenSends: number; // milliseconds
  };

  // Content configuration
  content: {
    subject: string;
    previewText?: string;
    templateFile: string;
    variables: Record<string, string>;
  };

  // Validation settings
  validation: {
    skipMxCheck: boolean;
    skipSuppressionCheck: boolean;
    maxBounceRate: number; // Percentage to pause campaign
    alertEmail: string;
  };

  // Tracking configuration
  tracking: {
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

// Example configuration for Teelixir Anniversary campaign
export const anniversaryTestConfig: CampaignTestConfig = {
  campaignId: 'tlx-anniversary-test',
  campaignName: 'Teelixir Anniversary Test',
  business: 'teelixir',

  testRecipients: [
    'jayson@fyic.com.au',
    'colette@teelixir.com'
  ],

  sendConfig: {
    provider: 'gmail',
    dailyLimit: 5, // Low limit for testing
    sendWindowStart: 9,
    sendWindowEnd: 17,
    delayBetweenSends: 5000 // 5 seconds between test emails
  },

  content: {
    subject: '[TEST] Happy Anniversary, {{first_name}}!',
    previewText: 'Your exclusive 15% discount inside',
    templateFile: 'templates/anniversary-email.html',
    variables: {
      first_name: 'Test User',
      discount_code: 'TEST-ANNIV-123',
      unsubscribe_url: 'https://teelixir.com/unsubscribe?test=true'
    }
  },

  validation: {
    skipMxCheck: true, // Skip for known test emails
    skipSuppressionCheck: true,
    maxBounceRate: 100, // Don't pause for test
    alertEmail: 'jayson@fyic.com.au'
  },

  tracking: {
    enableOpenTracking: false, // Disable for test
    enableClickTracking: false,
    utmSource: 'email',
    utmMedium: 'anniversary',
    utmCampaign: 'test-2025'
  }
};

// Example configuration for Smartlead cold outreach test
export const coldOutreachTestConfig: CampaignTestConfig = {
  campaignId: 'smartlead-test',
  campaignName: 'Cold Outreach Test',
  business: 'teelixir',

  testRecipients: [
    'jayson@fyic.com.au'
  ],

  sendConfig: {
    provider: 'smartlead',
    dailyLimit: 5,
    sendWindowStart: 9,
    sendWindowEnd: 17,
    delayBetweenSends: 60000 // 1 minute for Smartlead
  },

  content: {
    subject: '[TEST] Partnership Opportunity',
    templateFile: 'templates/cold-outreach.html',
    variables: {
      first_name: 'Test',
      company_name: 'Test Company',
      industry: 'Beauty'
    }
  },

  validation: {
    skipMxCheck: true,
    skipSuppressionCheck: true,
    maxBounceRate: 100,
    alertEmail: 'jayson@fyic.com.au'
  },

  tracking: {
    enableOpenTracking: true,
    enableClickTracking: true,
    utmSource: 'smartlead',
    utmMedium: 'cold-outreach',
    utmCampaign: 'test-campaign'
  }
};

/**
 * Validate test configuration
 */
export function validateTestConfig(config: CampaignTestConfig): string[] {
  const errors: string[] = [];

  if (!config.campaignId) {
    errors.push('Campaign ID is required');
  }

  if (config.testRecipients.length === 0) {
    errors.push('At least one test recipient is required');
  }

  if (config.sendConfig.sendWindowStart >= config.sendConfig.sendWindowEnd) {
    errors.push('Send window start must be before end');
  }

  if (config.sendConfig.dailyLimit > 10) {
    errors.push('Test daily limit should be 10 or less');
  }

  // Ensure test recipients are internal
  const internalDomains = ['fyic.com.au', 'teelixir.com', 'buyorganicsonline.com.au'];
  for (const email of config.testRecipients) {
    const domain = email.split('@')[1];
    if (!internalDomains.includes(domain)) {
      errors.push(`Test recipient ${email} is not an internal email`);
    }
  }

  return errors;
}
