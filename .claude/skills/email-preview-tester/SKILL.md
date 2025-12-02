---
name: email-preview-tester
description: Email rendering preview and deliverability testing. Tests email templates across clients (Gmail, Outlook, Apple Mail), checks spam scores, validates links, and verifies mobile responsiveness. Integrates with Litmus/Email on Acid for comprehensive testing.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Email Preview Tester Skill

Test and preview email templates for cross-client compatibility and deliverability.

## When to Activate This Skill

Activate this skill when the user mentions:
- "test email" or "email test"
- "preview email" or "email preview"
- "spam score" or "spam check"
- "email rendering" or "render test"
- "mobile preview" or "responsive test"
- "deliverability check"
- "email validation"
- "Litmus" or "Email on Acid"

## Core Capabilities

### 1. Cross-Client Preview
- Gmail (Web, Mobile)
- Outlook (Desktop, Web, Mobile)
- Apple Mail (Desktop, iOS)
- Yahoo Mail
- Android Email

### 2. Spam Score Analysis
- SpamAssassin score calculation
- Blacklist checking
- Authentication verification (SPF, DKIM, DMARC)
- Content analysis

### 3. Link Validation
- Verify all links work
- Check for broken images
- Validate tracking URLs
- Verify unsubscribe link

### 4. Accessibility Testing
- Color contrast checking
- Alt text verification
- Screen reader compatibility
- Font size validation

### 5. Mobile Responsiveness
- 320px width test
- 375px width test
- 414px width test
- Touch target validation

## Litmus Integration

### Environment Variables
```bash
LITMUS_API_KEY=your_api_key
LITMUS_ACCOUNT_ID=your_account_id
```

### Create Test
```typescript
import { LitmusClient } from '../shared/libs/integrations/litmus/client';

const litmus = new LitmusClient();

const test = await litmus.createTest({
  html: emailHtml,
  subject: emailSubject,
  clients: ['gmail', 'outlook', 'apple-mail', 'iphone']
});

// Get preview screenshots
const previews = await litmus.getPreviews(test.id);
```

### Get Spam Analysis
```typescript
const spamAnalysis = await litmus.getSpamAnalysis(test.id);
// Returns: { score, issues, recommendations }
```

## Test Checklist

### Pre-Send Validation
- [ ] HTML validates (no unclosed tags)
- [ ] All images have alt text
- [ ] Unsubscribe link present
- [ ] Physical address included
- [ ] Links use HTTPS
- [ ] No JavaScript
- [ ] File size < 102KB
- [ ] Subject line < 50 chars

### Rendering Tests
- [ ] Header renders correctly
- [ ] Images load properly
- [ ] Fonts display correctly
- [ ] Colors match brand
- [ ] CTA buttons clickable
- [ ] Footer displays properly

### Mobile Tests
- [ ] Content readable at 320px
- [ ] Images scale properly
- [ ] Buttons touch-friendly (44px min)
- [ ] Text not too small (<14px body)
- [ ] Single column layout works

## Spam Score Guide

| Score | Status | Action |
|-------|--------|--------|
| 0-2 | Safe | Good to send |
| 2-5 | Warning | Review flagged items |
| 5+ | Danger | Fix issues before sending |

### Common Spam Triggers
- ALL CAPS in subject
- Excessive exclamation marks!!!
- Spam words: "free", "act now", "limited time"
- Missing unsubscribe link
- Image-only emails
- Suspicious links

## API Reference

### Generate Previews
```typescript
async function generatePreviews(
  templateId: string,
  variables: Record<string, string>
): Promise<{
  previews: {
    gmail: string;      // Screenshot URL
    outlook: string;
    appleMail: string;
    mobile: string;
  };
  spamAnalysis: {
    score: number;
    status: 'safe' | 'warning' | 'danger';
    issues: SpamIssue[];
  };
}>
```

### Send Test Email
```typescript
async function sendTestEmail(
  templateId: string,
  testRecipient: string,
  variables: Record<string, string>
): Promise<{
  sent: boolean;
  messageId?: string;
}>
```

### Validate Template
```typescript
async function validateTemplate(html: string): Promise<{
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}>
```

## Integration Points

- **email-template-designer**: Receives templates for testing
- **marketing-analytics-reporter**: Reports test results
- **email-campaign-manager**: Pre-send validation

## Database Tables

### email_test_results
```sql
SELECT *
FROM email_test_results
WHERE template_id = 'uuid'
ORDER BY tested_at DESC;
```

### email_spam_scores
```sql
SELECT spam_assassin_score, flagged_patterns, recommendations
FROM email_spam_scores
WHERE template_id = 'uuid';
```

## Quick Commands

```bash
# Test specific template
npx tsx scripts/preview-generator.ts test teelixir anniversary-15

# Validate HTML file
npx tsx scripts/preview-generator.ts validate ./template.html

# Check spam score
npx tsx scripts/preview-generator.ts spam teelixir anniversary-15

# Send test email
npx tsx scripts/preview-generator.ts send teelixir anniversary-15 test@example.com
```
