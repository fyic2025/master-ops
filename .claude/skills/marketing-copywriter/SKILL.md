---
name: marketing-copywriter
description: AI-powered marketing copy generation using brand voice guidelines. Creates subject lines, headlines, CTAs, email body copy, and ad copy. Integrates with brand-asset-manager for voice consistency and email-template-designer for template population.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Marketing Copywriter Skill

Generate on-brand marketing copy across all channels for all 4 businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "write subject line" or "email subject"
- "write headline" or "create headline"
- "email copy" or "write email"
- "CTA" or "call to action"
- "ad copy" or "advertising copy"
- "tagline" or "slogan"
- "product copy" (marketing context)
- "A/B test copy" or "copy variants"

## Core Capabilities

### 1. Subject Line Generation
- Generate 5-10 variants per request
- A/B test friendly pairs
- Emoji usage (when appropriate)
- Character limit awareness (50 chars ideal)

### 2. Headline Creation
- Benefit-focused headlines
- Power word integration
- Brand voice alignment
- Multiple variants

### 3. Email Body Copy
- Full email narratives
- Section-by-section copy
- Personalization integration
- Compliance awareness

### 4. CTA Optimization
- Action-oriented text
- Urgency creation
- Value proposition focus
- Button text variants

## Copy Frameworks

### AIDA (Attention-Interest-Desire-Action)
```
Attention: Hook with compelling headline
Interest: Build curiosity with benefits
Desire: Create emotional connection
Action: Clear CTA
```

### PAS (Problem-Agitate-Solve)
```
Problem: Identify pain point
Agitate: Emphasize consequences
Solve: Present solution
```

### FAB (Features-Advantages-Benefits)
```
Feature: What it is
Advantage: What it does
Benefit: Why it matters to them
```

## Brand Voice Integration

This skill integrates with brand-asset-manager to fetch:
- Voice personality traits
- Tone characteristics
- Writing dos and don'ts
- Example phrases
- Key terminology

### Voice by Business

**Teelixir**: Expert, Passionate, Premium, Mystical
- Use: "Harness the power of...", "Used for centuries..."
- Avoid: Medical claims, oversimplification

**BOO**: Trustworthy, Supportive, Knowledgeable, Accessible
- Use: "Nourish your body with...", "Supporting your wellness journey..."
- Avoid: Medical claims, pushy sales language

**Elevate**: Professional, Supportive, Reliable, Value-focused
- Use: "A proven seller that delivers...", "Competitive wholesale pricing..."
- Avoid: Consumer marketing language, overly casual

**RHF**: Local, Fresh, Community, Family
- Use: "Fresh from the Mornington Peninsula...", "Supporting local growers..."
- Avoid: Corporate language, generic descriptions

## Copy Templates

### Subject Line Templates
```
[Discount] Save {{percent}}% on {{product}} - Today Only!
[Urgency] ⏰ Last chance: {{offer}} expires tonight
[Personal] {{first_name}}, we picked this just for you
[Question] Ready to transform your {{goal}}?
[Story] The ancient secret behind {{product}}
```

### Headline Templates
```
[Benefit] Unlock {{benefit}} with {{product}}
[How-to] How to {{achieve_goal}} in {{timeframe}}
[Social Proof] Join {{number}} customers who {{result}}
[Direct] {{Product}}: {{key_benefit}}
```

### CTA Templates
```
Shop Now | Claim Your Discount | Start Your Journey
Explore Collection | Get Started | Learn More
Request Quote | Partner With Us | Contact Sales
Order Fresh | Shop Local | Discover More
```

## Database Integration

### marketing_copy_library table
```sql
SELECT content, copy_type, performance_score, times_used
FROM marketing_copy_library
WHERE business_slug = 'teelixir'
  AND copy_type = 'subject_line'
ORDER BY performance_score DESC
LIMIT 10;
```

## API Reference

### Generate Subject Lines
```typescript
async function generateSubjectLines(params: {
  businessSlug: BusinessSlug;
  campaignType: 'promotional' | 'anniversary' | 'winback' | 'welcome';
  productName?: string;
  discount?: number;
  urgency: 'low' | 'medium' | 'high';
  count?: number;
}): Promise<string[]>
```

### Generate Email Body
```typescript
async function generateEmailBody(params: {
  businessSlug: BusinessSlug;
  framework: 'AIDA' | 'PAS' | 'FAB';
  templateSections: string[];
  variables: Record<string, string>;
}): Promise<{
  sections: Record<string, string>;
  fullText: string;
}>
```

## Quality Checklist

Before delivering copy:
- [ ] Matches brand voice guidelines
- [ ] No prohibited phrases used
- [ ] Character limits respected
- [ ] Personalization tokens correct
- [ ] Compliance requirements met
- [ ] A/B variants sufficiently different
- [ ] CTA is clear and actionable

## Integration Points

- **brand-asset-manager**: Fetches voice guidelines, writing dos/don'ts
- **email-template-designer**: Provides copy for template sections
- **conversion-optimizer**: Receives performance feedback for learning

## Reference Files

- Brand voice: `brand-asset-manager/context/VOICE-GUIDELINES.md`
- Existing email copy: `email-copywriter/templates/email-templates.md`
- Ad copy patterns: `ad-copy-generator/templates/ad-templates.md`
