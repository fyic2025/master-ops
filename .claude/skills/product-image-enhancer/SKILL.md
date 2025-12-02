---
name: product-image-enhancer
description: Product image optimization and enhancement for marketing materials. Handles image resizing, format conversion, background removal, brand overlay application, and alt-text generation. Integrates with Cloudinary for processing.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Product Image Enhancer Skill

Optimize and enhance product images for marketing across all channels.

## When to Activate This Skill

Activate this skill when the user mentions:
- "product image" or "optimize image"
- "image enhancement" or "enhance product photo"
- "remove background" or "background removal"
- "image resize" or "resize for email"
- "alt text" or "image description"
- "Cloudinary" or "image CDN"
- "product photo" or "marketing image"

## Core Capabilities

### 1. Image Optimization
- Format conversion (JPG, PNG, WebP)
- Quality optimization
- File size reduction
- Responsive variants

### 2. Background Processing
- Remove backgrounds
- Apply solid colors
- Add gradient backgrounds
- Transparent PNG export

### 3. Brand Overlays
- Add logo watermarks
- Apply brand colors
- Add promotional text
- Badge overlays (Sale, New, etc.)

### 4. Alt-Text Generation
- SEO-optimized descriptions
- Accessibility compliance
- Brand voice alignment

## Image Specifications by Platform

### Email
| Dimension | Use Case |
|-----------|----------|
| 600px wide | Full-width hero |
| 300px wide | Product cards |
| 200px wide | Thumbnails |
| Format: JPG/PNG | No WebP for email |

### Social Media
| Platform | Dimension | Format |
|----------|-----------|--------|
| Instagram Feed | 1080x1080 | JPG/PNG |
| Instagram Story | 1080x1920 | JPG/PNG |
| Facebook | 1200x628 | JPG/PNG |
| Google Ads | Various | JPG/PNG |

### E-commerce
| Platform | Dimension |
|----------|-----------|
| BigCommerce | 1280x1280 |
| Shopify | 2048x2048 |
| WooCommerce | 1000x1000 |

## Cloudinary Integration

### Environment Variables
```bash
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### Basic Usage
```typescript
import { CloudinaryClient } from '../shared/libs/integrations/cloudinary/client';

const cloudinary = new CloudinaryClient();

// Upload and optimize
const result = await cloudinary.upload(imageUrl, {
  folder: 'teelixir/products',
  transformations: [
    { width: 600, crop: 'limit' },
    { quality: 'auto' },
    { format: 'auto' }
  ]
});
```

### Remove Background
```typescript
const result = await cloudinary.removeBackground(publicId);
```

### Generate Variants
```typescript
const variants = await cloudinary.generateVariants(publicId, [
  { name: 'email', width: 600 },
  { name: 'social', width: 1080, height: 1080, crop: 'fill' },
  { name: 'thumb', width: 300, height: 300, crop: 'fill' }
]);
```

### Add Brand Overlay
```typescript
const result = await cloudinary.applyOverlay(publicId, {
  logoUrl: 'brands/teelixir/logo_icon.png',
  position: 'bottom-right',
  opacity: 70,
  width: 100
});
```

## Alt-Text Generation

### Template Patterns
```
[Product Name] - [Key Feature] | [Brand Name]

Examples:
- Lion's Mane Mushroom Extract Powder - Dual-Extracted for Potency | Teelixir
- Organic Spirulina Tablets - 500mg Certified Organic | Buy Organics Online
- Fresh Peninsula Strawberries - Local Farm Produce | Red Hill Fresh
```

### SEO Guidelines
- Include product name
- Include key attributes
- Keep under 125 characters
- Include brand name
- Avoid keyword stuffing

## Image Presets

### preset: email-hero
```json
{
  "width": 600,
  "quality": 85,
  "format": "jpg",
  "crop": "limit"
}
```

### preset: social-square
```json
{
  "width": 1080,
  "height": 1080,
  "quality": 90,
  "format": "jpg",
  "crop": "fill",
  "gravity": "auto"
}
```

### preset: product-card
```json
{
  "width": 300,
  "height": 300,
  "quality": 85,
  "format": "jpg",
  "crop": "fill",
  "background": "#ffffff"
}
```

## API Reference

### Optimize Image
```typescript
async function optimizeImage(params: {
  sourceUrl: string;
  businessSlug: BusinessSlug;
  preset: string;
}): Promise<{ url: string; size: number }>
```

### Generate Variants
```typescript
async function generateVariants(params: {
  sourceUrl: string;
  businessSlug: BusinessSlug;
  variants: ('email' | 'social' | 'thumb')[];
}): Promise<Record<string, string>>
```

### Generate Alt-Text
```typescript
async function generateAltText(params: {
  productName: string;
  productType?: string;
  keyFeatures?: string[];
  businessSlug: BusinessSlug;
}): Promise<string>
```

## Integration Points

- **brand-asset-manager**: Logo overlays, brand colors
- **email-template-designer**: Optimized images for templates
- **social-creative-generator**: Social media variants
- **BigCommerce/Shopify**: Product image sync

## Quality Checklist

Before using enhanced images:
- [ ] File size <100KB for email
- [ ] Correct dimensions for platform
- [ ] Alt text added
- [ ] Brand overlay positioned correctly
- [ ] Background appropriate for context
- [ ] Colors match brand guidelines
