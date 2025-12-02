# Product Image Enhancer - Quick Reference

## Cloudinary Presets

| Preset | Size | Use Case |
|--------|------|----------|
| product_main | 800x800 | Main product image |
| product_thumbnail | 200x200 | Listings, cart |
| product_zoom | 1600x1600 | Zoom feature |
| instagram_square | 1080x1080 | IG feed |
| instagram_portrait | 1080x1350 | IG optimal |
| instagram_story | 1080x1920 | Stories |
| facebook_post | 1200x630 | FB feed |
| email_hero | 600x300 | Email banner |
| email_product | 300x300 | Email product |
| background_remove | Original | PNG, no BG |
| auto_enhance | Original | Color/contrast fix |

## Quick Transform URLs

### Product Sizes
```typescript
const baseUrl = 'https://res.cloudinary.com/CLOUD_NAME/image/upload';

// Main product
`${baseUrl}/c_fill,g_auto,w_800,h_800,q_auto:best,f_auto/${publicId}`;

// Thumbnail
`${baseUrl}/c_fill,g_auto,w_200,h_200,q_auto,f_auto/${publicId}`;

// Zoom
`${baseUrl}/c_fill,g_auto,w_1600,h_1600,q_auto:best,f_auto/${publicId}`;
```

### Social Sizes
```typescript
// Instagram Square
`${baseUrl}/c_fill,g_auto,w_1080,h_1080,q_auto,f_auto/${publicId}`;

// Instagram Portrait
`${baseUrl}/c_fill,g_auto,w_1080,h_1350,q_auto,f_auto/${publicId}`;

// Instagram Story
`${baseUrl}/c_fill,g_auto,w_1080,h_1920,q_auto,f_auto/${publicId}`;
```

### Enhancement
```typescript
// Auto enhance
`${baseUrl}/e_improve,e_auto_color,e_auto_contrast,q_auto:best,f_auto/${publicId}`;

// Background removal
`${baseUrl}/e_background_removal,q_auto,f_png/${publicId}`;
```

## CLI Commands

```bash
# List presets
npx tsx scripts/image-enhancer.ts presets

# Transform image
npx tsx scripts/image-enhancer.ts transform <publicId> product_main

# Generate all product variants
npx tsx scripts/image-enhancer.ts product-variants <publicId>

# Generate social variants
npx tsx scripts/image-enhancer.ts social-variants <publicId>
```

## Responsive Images

### Generate srcSet
```typescript
const widths = [200, 400, 800, 1200, 1600];
const srcSet = widths.map(w =>
  `${baseUrl}/w_${w},c_fill,q_auto,f_auto/${publicId} ${w}w`
).join(',');
```

### HTML Usage
```html
<img
  src="{{product_main_url}}"
  srcset="{{srcSet}}"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="{{product_name}}"
  loading="lazy"
/>
```

## Image Requirements

| Platform | Format | Max Size |
|----------|--------|----------|
| Web | WebP/AVIF | <200KB |
| Email | JPG/PNG | <100KB |
| Social | JPG | <1MB |

## Transformation Parameters

| Param | Description | Example |
|-------|-------------|---------|
| c_ | Crop mode | c_fill, c_fit |
| g_ | Gravity | g_auto, g_face |
| w_ | Width | w_800 |
| h_ | Height | h_800 |
| q_ | Quality | q_auto, q_80 |
| f_ | Format | f_auto, f_webp |
| e_ | Effect | e_improve |
