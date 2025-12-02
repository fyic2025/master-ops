---
name: brand-asset-manager
description: Central brand identity management for all 4 businesses (Teelixir, BOO, Elevate, RHF). Manages brand guidelines, visual assets, color palettes, typography, and brand voice settings. Foundation skill that email-template-designer, marketing-copywriter, and other marketing skills depend on.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Brand Asset Manager Skill

Central hub for managing brand identity, assets, and guidelines across all 4 businesses in master-ops.

## When to Activate This Skill

Activate this skill when the user mentions:
- "brand colors" or "color palette"
- "logo URL" or "brand logo"
- "brand guidelines" or "brand guide"
- "brand voice" or "tone of voice"
- "brand assets" or "marketing assets"
- "upload logo" or "update branding"
- "email branding" or "email styling"
- "brand font" or "typography"
- "brand consistency" or "on-brand"

## Businesses Managed

| Business | Slug | Primary Color | Voice |
|----------|------|---------------|-------|
| Teelixir | `teelixir` | #1B4D3E (Forest Green) | Expert, Passionate, Premium |
| Buy Organics Online | `boo` | #4CAF50 (Organic Green) | Trustworthy, Supportive |
| Elevate Wholesale | `elevate` | #1E3A5F (Navy Blue) | Professional, Reliable |
| Red Hill Fresh | `rhf` | #C62828 (Fresh Red) | Local, Family, Fresh |

## Core Capabilities

### 1. Brand Guidelines Management
- Fetch brand guidelines for any business
- Update colors, fonts, voice characteristics
- Validate content against brand guidelines

### 2. Asset Management
- Upload assets to Supabase Storage
- Track asset versions
- Generate public URLs for assets
- Manage logo variants (primary, white, dark, icon)

### 3. Email Context Generation
- Generate email-ready brand context (colors, fonts, logos)
- Provide footer HTML with brand styling
- Supply social links for email footers

### 4. Brand Compliance Validation
- Check copy against writing dos/don'ts
- Validate terminology usage
- Score content for brand alignment

## Database Schema

### brand_guidelines table
```sql
SELECT
  business_slug,
  business_name,
  primary_color,
  secondary_color,
  accent_color,
  heading_font,
  body_font,
  voice_personality,
  tone_characteristics,
  writing_dos,
  writing_donts,
  example_phrases,
  default_from_name,
  default_from_email,
  website_url,
  social_links
FROM brand_guidelines
WHERE business_slug = 'teelixir';
```

### brand_assets table
```sql
SELECT
  asset_type,
  asset_name,
  public_url,
  file_type,
  dimensions
FROM brand_assets
WHERE business_slug = 'teelixir'
  AND is_current = TRUE;
```

## API Reference

### Get Brand Guidelines
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getGuidelines(businessSlug: string) {
  const { data, error } = await supabase
    .from('brand_guidelines')
    .select('*')
    .eq('business_slug', businessSlug)
    .single();

  return data;
}
```

### Get Email Context
```typescript
async function getEmailContext(businessSlug: string) {
  const guidelines = await getGuidelines(businessSlug);

  const { data: assets } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('business_slug', businessSlug)
    .eq('is_current', true)
    .in('asset_type', ['logo_primary', 'email_header', 'email_footer']);

  return {
    colors: {
      primary: guidelines.primary_color,
      secondary: guidelines.secondary_color,
      accent: guidelines.accent_color,
      background: guidelines.background_color,
      text: guidelines.text_color
    },
    fonts: {
      heading: guidelines.heading_font,
      body: guidelines.body_font
    },
    logo: assets?.find(a => a.asset_type === 'logo_primary')?.public_url,
    fromName: guidelines.default_from_name,
    fromEmail: guidelines.default_from_email,
    socialLinks: guidelines.social_links,
    websiteUrl: guidelines.website_url
  };
}
```

### Upload Asset
```typescript
async function uploadAsset(
  businessSlug: string,
  assetType: string,
  file: Buffer,
  fileName: string
) {
  const storagePath = `brands/${businessSlug}/${assetType}/${fileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(storagePath, file, {
      contentType: getContentType(fileName),
      upsert: true
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(storagePath);

  // Update database
  const { data, error } = await supabase
    .from('brand_assets')
    .upsert({
      business_slug: businessSlug,
      asset_type: assetType,
      asset_name: fileName.split('.')[0],
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: fileName,
      file_type: getContentType(fileName),
      is_current: true
    }, {
      onConflict: 'business_slug,asset_type,asset_name'
    });

  return { publicUrl, storagePath };
}
```

## Task Execution Methodology

### Phase 1: Understanding Request
1. Identify which business(es) the request applies to
2. Determine if request is read (get) or write (update/upload)
3. Check if brand_guidelines table exists (run migration if needed)

### Phase 2: Execution

**For "Get brand colors" requests:**
```typescript
const { data } = await supabase
  .from('brand_guidelines')
  .select('primary_color, secondary_color, accent_color, background_color, text_color')
  .eq('business_slug', businessSlug)
  .single();

return {
  primary: data.primary_color,
  secondary: data.secondary_color,
  accent: data.accent_color,
  background: data.background_color,
  text: data.text_color
};
```

**For "Get brand voice" requests:**
```typescript
const { data } = await supabase
  .from('brand_guidelines')
  .select('voice_personality, tone_characteristics, writing_dos, writing_donts, example_phrases')
  .eq('business_slug', businessSlug)
  .single();

return {
  personality: data.voice_personality,
  tone: data.tone_characteristics,
  dos: data.writing_dos,
  donts: data.writing_donts,
  examples: data.example_phrases
};
```

**For "Update brand color" requests:**
```typescript
await supabase
  .from('brand_guidelines')
  .update({ primary_color: newColor, updated_at: new Date() })
  .eq('business_slug', businessSlug);
```

### Phase 3: Response
- Return structured data for programmatic use
- Format nicely for human-readable display
- Include relevant context (e.g., "This is Teelixir's forest green")

## Reference Files

- Database migration: `infra/supabase/migrations/20251203_marketing_skills_foundation.sql`
- Brand voice source: `product-description-generator/context/BRAND-VOICE-GUIDE.md`
- Email campaign manager (integration): `email-campaign-manager/SKILL.md`

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

## Quick Reference: Brand Colors

| Business | Primary | Secondary | Accent |
|----------|---------|-----------|--------|
| Teelixir | #1B4D3E | #D4AF37 | #8B4513 |
| BOO | #4CAF50 | #2E7D32 | #FFA000 |
| Elevate | #1E3A5F | #3498DB | #E74C3C |
| RHF | #C62828 | #4E342E | #43A047 |

## Quick Reference: Brand Fonts

| Business | Heading | Body |
|----------|---------|------|
| Teelixir | Playfair Display | Lato |
| BOO | Arial | Arial |
| Elevate | Arial | Arial |
| RHF | Arial | Arial |

## Quick Reference: Email Settings

| Business | From Name | From Email |
|----------|-----------|------------|
| Teelixir | Teelixir | colette@teelixir.com |
| BOO | Buy Organics Online | sales@buyorganicsonline.com.au |
| Elevate | Elevate Wholesale | wholesale@elevatewholesale.com.au |
| RHF | Red Hill Fresh | hello@redhillfresh.com.au |

## Integration Points

This skill provides data to:
- **email-template-designer**: Colors, fonts, logos for email templates
- **marketing-copywriter**: Voice guidelines, dos/don'ts, example phrases
- **social-creative-generator**: Brand assets, colors for social content
- **product-image-enhancer**: Logo overlays, brand watermarks
- **landing-page-builder**: Brand styling for landing pages

## Guardrails

1. **Read-only for production assets**: Don't delete or overwrite production logos without explicit confirmation
2. **Color validation**: Ensure color values are valid hex codes
3. **Asset versioning**: When updating assets, preserve previous version
4. **Business isolation**: Never mix assets between businesses

## Success Criteria

- Brand guidelines retrieved in <100ms
- Assets served from CDN with caching
- All 4 businesses have complete brand data
- Integration tests pass with email-template-designer

## Emergency Procedures

If brand_guidelines table doesn't exist:
```bash
npx tsx scripts/apply-migration.ts 20251203_marketing_skills_foundation.sql
```

If brand data is missing:
```sql
-- Re-run the INSERT statement from the migration
-- See infra/supabase/migrations/20251203_marketing_skills_foundation.sql
```
