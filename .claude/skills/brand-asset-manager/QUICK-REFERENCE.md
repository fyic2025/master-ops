# Brand Asset Manager - Quick Reference

## Get Brand Colors

```sql
SELECT primary_color, secondary_color, accent_color
FROM brand_guidelines
WHERE business_slug = 'teelixir';
```

**Results:**
| Business | Primary | Secondary | Accent |
|----------|---------|-----------|--------|
| teelixir | #1B4D3E | #D4AF37 | #8B4513 |
| boo | #4CAF50 | #2E7D32 | #FFA000 |
| elevate | #1E3A5F | #3498DB | #E74C3C |
| rhf | #C62828 | #4E342E | #43A047 |

## Get Brand Voice

```sql
SELECT voice_personality, writing_dos, writing_donts
FROM brand_guidelines
WHERE business_slug = 'teelixir';
```

## Get Email Settings

```sql
SELECT default_from_name, default_from_email, website_url, social_links
FROM brand_guidelines
WHERE business_slug = 'boo';
```

## Get All Assets for Business

```sql
SELECT asset_type, asset_name, public_url
FROM brand_assets
WHERE business_slug = 'teelixir' AND is_current = TRUE;
```

## Update Brand Color

```sql
UPDATE brand_guidelines
SET primary_color = '#NEW_HEX', updated_at = NOW()
WHERE business_slug = 'teelixir';
```

## Brand Voice Summary

### Teelixir
- **Personality**: Expert, Passionate, Premium, Mystical
- **Tone**: Inspiring, knowledgeable, wellness-focused
- **Key phrases**: "Harness the power of...", "Used for centuries..."

### BOO
- **Personality**: Trustworthy, Supportive, Knowledgeable, Accessible
- **Tone**: Warm, informative, encouraging
- **Key phrases**: "Nourish your body with...", "Supporting your wellness journey..."

### Elevate
- **Personality**: Professional, Supportive, Reliable, Value-focused
- **Tone**: Business-like, efficient, benefit-focused
- **Key phrases**: "A proven seller that delivers...", "Competitive wholesale pricing..."

### RHF
- **Personality**: Local, Fresh, Community, Family
- **Tone**: Friendly, warm, authentic
- **Key phrases**: "Fresh from the Mornington Peninsula...", "Supporting local growers..."

## Common Operations

### Get Full Brand Context for Email
```typescript
const context = await getEmailContext('teelixir');
// Returns: { colors, fonts, logo, fromName, fromEmail, socialLinks }
```

### Validate Copy Against Brand
```typescript
const result = await validateBrandCompliance('teelixir', copyText);
// Returns: { score, issues, suggestions }
```

### Upload New Logo
```typescript
await uploadAsset('teelixir', 'logo_primary', fileBuffer, 'logo.png');
```

## Asset Types

| Type | Usage |
|------|-------|
| `logo_primary` | Main logo for emails, documents |
| `logo_white` | Logo on dark backgrounds |
| `logo_dark` | Logo on light backgrounds |
| `logo_icon` | Square icon/favicon |
| `email_header` | Email header banner |
| `email_footer` | Email footer graphic |
| `social_banner` | Social media cover images |
| `watermark` | Product image watermark |

## Integration with Other Skills

```typescript
// From email-template-designer
import { getEmailContext } from '../brand-asset-manager/scripts/brand-client';
const brand = await getEmailContext('teelixir');

// From marketing-copywriter
import { getVoiceGuidelines } from '../brand-asset-manager/scripts/brand-client';
const voice = await getVoiceGuidelines('boo');
```
