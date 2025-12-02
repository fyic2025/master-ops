# Asset Management Playbook

Step-by-step workflows for managing brand assets across all businesses.

## Workflow 1: Upload New Logo

### Prerequisites
- Logo file in PNG format (with transparency) or SVG
- Minimum 600px width for primary logo
- 512x512px for icon variant

### Steps

1. **Prepare the file**
   ```bash
   # Ensure file is optimized
   # PNG should be <500KB
   # Consider using tinypng.com for optimization
   ```

2. **Upload via script**
   ```typescript
   import { getBrandClient } from './scripts/brand-client';

   const client = getBrandClient();
   const fileBuffer = fs.readFileSync('path/to/logo.png');

   await client.uploadAsset(
     'teelixir',           // business slug
     'logo_primary',       // asset type
     fileBuffer,
     'teelixir-logo.png',
     'Main Teelixir logo - horizontal full color'
   );
   ```

3. **Verify upload**
   ```sql
   SELECT public_url, file_size_bytes, created_at
   FROM brand_assets
   WHERE business_slug = 'teelixir'
     AND asset_type = 'logo_primary'
     AND is_current = TRUE;
   ```

4. **Test in email template**
   - Render a test email using the new logo
   - Verify display in Gmail, Outlook, Apple Mail

---

## Workflow 2: Update Brand Colors

### Steps

1. **Document the change**
   - Note old color value
   - Note new color value
   - Reason for change

2. **Update in database**
   ```sql
   UPDATE brand_guidelines
   SET primary_color = '#NEW_HEX',
       updated_at = NOW()
   WHERE business_slug = 'teelixir';
   ```

3. **Or via script**
   ```typescript
   import { getBrandClient } from './scripts/brand-client';

   const client = getBrandClient();
   await client.updateGuidelines('teelixir', {
     primary_color: '#NEW_HEX'
   });
   ```

4. **Update downstream systems**
   - Re-generate email templates
   - Update CSS variables if used
   - Notify design team

5. **Verify**
   ```sql
   SELECT primary_color, updated_at
   FROM brand_guidelines
   WHERE business_slug = 'teelixir';
   ```

---

## Workflow 3: Add New Brand Voice Guidelines

### Steps

1. **Document the new guidelines**
   - What personality trait to add?
   - What writing do's/don'ts?
   - Example phrases?

2. **Update via SQL**
   ```sql
   UPDATE brand_guidelines
   SET
     voice_personality = voice_personality || '["NewTrait"]',
     writing_dos = array_append(writing_dos, 'New guideline to follow'),
     example_phrases = array_append(example_phrases, 'New example phrase...'),
     updated_at = NOW()
   WHERE business_slug = 'teelixir';
   ```

3. **Update context documentation**
   - Edit `context/VOICE-GUIDELINES.md`
   - Add new guidelines to relevant section

4. **Notify copywriters**
   - Update marketing-copywriter skill
   - Inform human copywriters of changes

---

## Workflow 4: Generate Email Context for Campaign

### Steps

1. **Fetch email context**
   ```typescript
   import { getEmailContext } from './scripts/brand-client';

   const context = await getEmailContext('teelixir');

   // context contains:
   // - colors: { primary, secondary, accent, background, text, muted }
   // - fonts: { heading, body, cdnUrl }
   // - logo: public URL
   // - fromName, fromEmail, replyTo
   // - socialLinks: { instagram, facebook, ... }
   // - websiteUrl
   ```

2. **Pass to email template**
   ```typescript
   const emailHtml = renderTemplate(templateId, {
     ...context,
     first_name: customer.firstName,
     discount_code: 'SAVE15',
     // ... other variables
   });
   ```

3. **Verify branding**
   - Check logo displays correctly
   - Check colors match brand
   - Check fonts render properly

---

## Workflow 5: Brand Compliance Check

### Steps

1. **Run compliance validation**
   ```typescript
   import { getBrandClient } from './scripts/brand-client';

   const client = getBrandClient();
   const result = await client.validateBrandCompliance(
     'teelixir',
     emailCopyText
   );

   console.log('Score:', result.score);
   console.log('Compliant:', result.isCompliant);
   console.log('Issues:', result.issues);
   ```

2. **Review issues**
   - Score < 70: Needs revision
   - Score 70-85: Review warnings
   - Score 85+: Generally compliant

3. **Fix identified issues**
   - Address each warning/error
   - Re-run validation

4. **Document exceptions**
   - If rule violation is intentional, document why
   - Get approval from brand owner

---

## Workflow 6: Asset Audit

### Monthly Audit Steps

1. **Check all businesses have required assets**
   ```sql
   SELECT
     bg.business_slug,
     bg.business_name,
     COUNT(ba.id) as asset_count,
     array_agg(DISTINCT ba.asset_type) as asset_types
   FROM brand_guidelines bg
   LEFT JOIN brand_assets ba ON bg.business_slug = ba.business_slug
     AND ba.is_current = TRUE
   GROUP BY bg.business_slug, bg.business_name;
   ```

2. **Identify missing assets**
   - logo_primary (required)
   - logo_white (required for dark backgrounds)
   - logo_icon (required for favicons)
   - email_header (optional)
   - email_footer (optional)

3. **Check for stale assets**
   ```sql
   SELECT business_slug, asset_type, asset_name, updated_at
   FROM brand_assets
   WHERE is_current = TRUE
     AND updated_at < NOW() - INTERVAL '6 months';
   ```

4. **Verify public URLs work**
   - Test each public_url
   - Report any 404s

5. **Document findings**
   - Update BRAND-INVENTORY.md
   - Create tickets for missing assets

---

## Troubleshooting

### Asset Not Displaying in Email

1. Check public_url is accessible
2. Verify file type is email-safe (PNG, JPG, GIF - not SVG)
3. Check file size (<100KB recommended)
4. Test in multiple email clients

### Color Appearing Wrong

1. Verify hex code is correct format (#RRGGBB)
2. Check for transparency issues
3. Test on different screens/devices

### Font Not Rendering

1. Email clients often override fonts
2. Use web-safe fallbacks
3. Consider using images for critical typography

### Brand Data Not Found

1. Verify business_slug is correct
2. Check brand_guidelines table has entry
3. Run migration if table doesn't exist:
   ```bash
   npx tsx scripts/apply-migration.ts 20251203_marketing_skills_foundation.sql
   ```
