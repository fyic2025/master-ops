---
name: social-creative-generator
description: Social media content creation for Instagram, Facebook, and TikTok. Generates platform-optimized posts, captions, hashtags, and carousel content. Integrates with brand-asset-manager for styling and marketing-copywriter for copy.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Social Creative Generator Skill

Create platform-optimized social media content for all businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "social post" or "create post"
- "Instagram" or "Facebook" or "TikTok"
- "social media content"
- "caption" or "hashtags"
- "carousel" or "carousel post"
- "social creative" or "social content"
- "Reel" or "Story"

## Core Capabilities

### 1. Post Generation
- Platform-specific formatting
- Caption writing with brand voice
- Hashtag optimization
- Call-to-action integration

### 2. Content Types
- Single image posts
- Carousel/multi-image posts
- Story content
- Reel scripts/concepts

### 3. Platform Optimization
- Instagram (Feed, Stories, Reels)
- Facebook (Feed, Stories)
- TikTok (organic concepts)

### 4. Campaign Support
- Product launches
- Promotional content
- Educational content
- User-generated content curation

## Platform Specifications

### Instagram
| Format | Dimensions | Notes |
|--------|------------|-------|
| Feed Square | 1080x1080 | Most versatile |
| Feed Portrait | 1080x1350 | Best engagement |
| Feed Landscape | 1080x566 | Rarely used |
| Story | 1080x1920 | Full screen |
| Reel | 1080x1920 | Video only |
| Carousel | 1080x1080 | Up to 10 slides |

### Facebook
| Format | Dimensions |
|--------|------------|
| Feed | 1200x630 |
| Story | 1080x1920 |
| Cover Photo | 820x312 |

### Character Limits
| Platform | Caption | Hashtags |
|----------|---------|----------|
| Instagram | 2,200 | 30 max |
| Facebook | 63,206 | Unlimited |
| TikTok | 2,200 | Unlimited |

## Caption Templates

### Product Feature
```
✨ [Benefit Statement]

[2-3 sentences about the product]

💚 [Key feature 1]
🌿 [Key feature 2]
⚡ [Key feature 3]

[CTA]

#hashtag1 #hashtag2 #hashtag3
```

### Educational
```
Did you know? 🧠

[Educational fact about ingredient/benefit]

Here's why this matters for your [health/wellness/routine]:
• Point 1
• Point 2
• Point 3

Save this post for later! 📌

#hashtag1 #hashtag2
```

### Promotional
```
🎉 [Offer Headline]

[Offer details - discount, code, timing]

How to claim:
1️⃣ [Step 1]
2️⃣ [Step 2]
3️⃣ [Step 3]

Link in bio 👆

#hashtag1 #hashtag2
```

## Hashtag Strategy

### Tiered Approach
| Tier | Reach | Example Count |
|------|-------|---------------|
| Large (1M+) | Broad discovery | 3-5 |
| Medium (100K-1M) | Targeted reach | 5-7 |
| Small (10K-100K) | Niche engagement | 5-8 |
| Brand/Campaign | Custom | 2-3 |

### By Business

**Teelixir:**
```
#medicalmushrooms #adaptogens #lionsmane #reishi
#functionalfoods #tonicHerbs #wellness #naturalhealth
#teelixir #mushroompowder
```

**BOO:**
```
#organic #organicfood #healthyliving #wellness
#naturalproducts #australianorganic #cleaneating
#buyorganicsonline
```

**Elevate:**
```
#wholesale #retailbusiness #healthfoodstore
#naturalgrocery #b2b #wholesalehealth
```

**RHF:**
```
#localfresh #morningtonpeninsula #farmfresh
#supportlocal #redhillfresh #localfood
```

## Carousel Content

### Product Carousel (5-7 slides)
1. Hero image with product
2. Key benefit #1
3. Key benefit #2
4. How to use/serve
5. Social proof/testimonial
6. Ingredients/sourcing
7. CTA + price

### Educational Carousel (5-10 slides)
1. Hook question/statement
2. Introduction to topic
3-7. Main content points
8. Summary/key takeaways
9. CTA
10. Save/share prompt

## API Reference

### Generate Post
```typescript
async function generatePost(params: {
  businessSlug: BusinessSlug;
  platform: 'instagram' | 'facebook' | 'tiktok';
  contentType: 'product' | 'educational' | 'promotional' | 'ugc';
  productId?: string;
  campaign?: string;
}): Promise<SocialPost>
```

### Generate Hashtags
```typescript
async function generateHashtags(params: {
  businessSlug: BusinessSlug;
  topic: string;
  count?: number;
}): Promise<string[]>
```

### Generate Carousel
```typescript
async function generateCarousel(params: {
  businessSlug: BusinessSlug;
  topic: string;
  slideCount: number;
  style: 'product' | 'educational' | 'story';
}): Promise<CarouselContent>
```

## Integration Points

- **brand-asset-manager**: Brand colors, logos, voice
- **marketing-copywriter**: Caption copy
- **product-image-enhancer**: Social-optimized images
- **product-description-generator**: Product information

## Content Calendar Integration

### Posting Frequency (Recommended)
| Platform | Posts/Week | Best Times (AEST) |
|----------|------------|-------------------|
| Instagram | 4-7 | 7am, 12pm, 7pm |
| Facebook | 3-5 | 9am, 1pm, 4pm |
| Stories | Daily | Throughout day |

## Quality Checklist

- [ ] Caption matches brand voice
- [ ] Hashtags relevant and mixed tiers
- [ ] Image dimensions correct for platform
- [ ] CTA included
- [ ] Link in bio mentioned if needed
- [ ] No spelling/grammar errors
- [ ] Emojis appropriate for brand
