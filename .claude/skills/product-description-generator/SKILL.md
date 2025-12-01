# Product Description Generator Skill

AI-powered product description generation for all 4 e-commerce stores with brand voice consistency and SEO optimization.

## Businesses Covered

| Business | Platform | Products | Voice |
|----------|----------|----------|-------|
| Buy Organics Online | BigCommerce | 11,000+ | Informative, health-focused |
| Teelixir | Shopify | 200+ | Premium, wellness, educational |
| Elevate Wholesale | Shopify | 150+ | Professional, B2B, value-focused |
| Red Hill Fresh | WooCommerce | 100+ | Local, fresh, community |

---

## When to Activate This Skill

Activate when the user mentions:
- "write product description"
- "product copy" or "product content"
- "rewrite description"
- "improve product page"
- "bulk descriptions"
- "SEO product description"
- "generate descriptions"
- "product listing copy"
- "missing descriptions"

---

## Core Capabilities

### 1. Single Product Descriptions
Generate compelling descriptions for individual products:
- Short description (50-100 words)
- Long description (150-300 words)
- Meta description (155 characters)
- Key benefits/features bullet points

### 2. Bulk Description Generation
Process multiple products efficiently:
- CSV/spreadsheet import
- Template-based generation
- Batch processing with progress tracking
- Quality review workflow

### 3. SEO Optimization
Descriptions optimized for search:
- Primary keyword integration
- Secondary keyword placement
- Natural language flow
- Meta description optimization
- Header structure (H2, H3)

### 4. Brand Voice Consistency
Maintain consistent tone per business:
- Voice guidelines per brand
- Tone adjustment (formal/casual)
- Terminology preferences
- Avoid terms/phrases lists

### 5. A/B Variant Generation
Create multiple versions for testing:
- Different angle variations
- Feature-focused vs benefit-focused
- Short vs detailed versions

---

## Brand Voice Guidelines

### Buy Organics Online (BOO)
**Voice:** Informative, trustworthy, health-conscious
**Tone:** Educational, approachable, supportive
**Target Audience:** Health-conscious Australians, families, organic enthusiasts

**Key Themes:**
- Certified organic quality
- Health and wellness benefits
- Australian-owned and operated
- Wide product selection
- Expert knowledge

**Vocabulary:**
- Use: "certified organic", "natural", "wholesome", "nourishing", "quality"
- Avoid: "cheap", "basic", overused superlatives

**Example Style:**
> Certified organic and packed with nutrients, this [product] supports your wellness journey. Sourced from trusted suppliers, it's a natural choice for health-conscious families.

---

### Teelixir
**Voice:** Premium, mystical, educational, passionate
**Tone:** Expert, inspiring, wellness-focused
**Target Audience:** Biohackers, wellness enthusiasts, health-conscious millennials

**Key Themes:**
- Ancient wisdom meets modern science
- Adaptogenic and functional benefits
- Sustainable sourcing
- Potency and purity
- Transformative wellness

**Vocabulary:**
- Use: "adaptogenic", "tonic", "potent", "ancient", "wildcrafted", "dual-extracted"
- Avoid: "cure", "treat", medical claims

**Example Style:**
> Harness the power of this revered tonic herb, used for centuries in traditional medicine. Our dual-extracted [product] delivers maximum bioavailability, supporting your body's natural ability to adapt and thrive.

---

### Elevate Wholesale
**Voice:** Professional, value-focused, supportive
**Tone:** Business-like, helpful, efficient
**Target Audience:** Retailers, practitioners, health food stores

**Key Themes:**
- Wholesale pricing advantages
- Quality for resale
- Business partnership
- Reliable supply
- Marketing support

**Vocabulary:**
- Use: "wholesale", "retail-ready", "margin", "partner", "supply"
- Avoid: Consumer-focused language

**Example Style:**
> Stock your shelves with this customer-favourite [product]. Retail-ready packaging and competitive wholesale pricing help you maintain healthy margins while offering premium quality to your customers.

---

### Red Hill Fresh
**Voice:** Local, fresh, community-oriented
**Tone:** Friendly, personal, authentic
**Target Audience:** Local families, fresh food lovers, community members

**Key Themes:**
- Local sourcing
- Farm-fresh quality
- Supporting local farmers
- Family-friendly
- Seasonal availability

**Vocabulary:**
- Use: "local", "fresh", "farm", "seasonal", "family", "community"
- Avoid: Generic supermarket language

**Example Style:**
> Sourced from local Mornington Peninsula farms, this [product] brings farm-fresh goodness straight to your table. Supporting local growers has never been more delicious.

---

## Description Structure

### Short Description (50-100 words)
```
[Hook/Benefit Statement]
[Key Feature 1-2]
[Call to Action or Usage Hint]
```

### Long Description (150-300 words)
```
[Opening Hook - Benefit or Story]

[Product Details/Features]
- Key benefit 1
- Key benefit 2
- Key benefit 3

[How to Use / Serving Suggestions]

[Quality/Sourcing Story]

[Call to Action]
```

### Meta Description (≤155 characters)
```
[Primary Keyword] + [Key Benefit] + [Brand/Trust Element] + [CTA]
```

### Bullet Points (5-7 items)
```
✓ Primary benefit
✓ Key ingredient/feature
✓ How it helps
✓ Quality marker (organic, certified, etc.)
✓ Usage tip
✓ Value proposition
✓ Trust element
```

---

## SEO Guidelines

### Keyword Integration
- Primary keyword: In first 25 words and H1
- Secondary keywords: Natural placement throughout
- Keyword density: 1-2% maximum
- LSI keywords: Include related terms

### Structure
- Use H2 for main sections
- Use H3 for subsections
- Short paragraphs (2-3 sentences)
- Bullet points for features/benefits

### Meta Description
- Include primary keyword
- Compelling value proposition
- Call to action
- Stay under 155 characters

### URL Slug
- Primary keyword
- Hyphen-separated
- No stop words
- 3-5 words ideal

---

## Input Requirements

### Minimum Information Needed
- Product name
- Brand (if applicable)
- Key ingredients/materials
- Product category
- Business context

### Ideal Information
- Product name and brand
- Full ingredient/material list
- Size/weight/quantity
- Key benefits (from supplier)
- Target use cases
- Price point (for value positioning)
- Certifications (organic, vegan, etc.)
- Unique selling points
- Competitor products (for differentiation)

### Optional Enhancements
- Customer reviews (for benefit extraction)
- Supplier marketing materials
- Similar product descriptions (for consistency)
- Target keywords

---

## Generation Workflow

### Step 1: Gather Information
```
1. Extract product details from:
   - Supplier feed data
   - Existing descriptions
   - Product images
   - Category context

2. Identify:
   - Primary keyword target
   - Secondary keywords
   - Key benefits
   - Unique selling points
```

### Step 2: Generate Draft
```
1. Select appropriate brand voice
2. Create structure:
   - Hook/opening
   - Features/benefits
   - Usage/application
   - Trust elements
   - CTA

3. Integrate keywords naturally
4. Check word count
```

### Step 3: Review & Refine
```
1. Brand voice check
2. SEO verification
3. Factual accuracy
4. Compliance check (no medical claims)
5. Readability score
```

### Step 4: Format & Deliver
```
1. Format for platform:
   - BigCommerce HTML
   - Shopify Liquid
   - WooCommerce WordPress

2. Generate meta description
3. Create bullet points
4. Suggest URL slug
```

---

## Compliance & Guidelines

### Health Products (All Businesses)
- No disease treatment claims
- No cure/prevent language
- Use "may support", "traditionally used for"
- Cite traditional use, not medical efficacy
- Include disclaimers where required

### Food Products
- Accurate ingredient lists
- Allergen information
- Storage instructions
- Serving suggestions only

### Supplements (Teelixir, BOO)
- TGA compliance (Australia)
- No therapeutic claims without listing
- Traditional use statements only
- Required disclaimers

### Certifications
- Only claim verified certifications
- Use official certification language
- Display certification logos appropriately

---

## Templates

### Health Food Product
```markdown
## [Product Name] - [Key Benefit]

[Opening hook focusing on primary benefit]

**What makes it special:**
- [Feature 1 with benefit]
- [Feature 2 with benefit]
- [Feature 3 with benefit]

**How to enjoy:**
[Usage suggestions]

**Quality you can trust:**
[Sourcing/certification story]

*[Disclaimer if applicable]*
```

### Supplement Product
```markdown
## [Product Name]

[Traditional use opening]

**Benefits:**
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

**How to use:**
[Dosage/serving suggestions]

**Our commitment to quality:**
[Sourcing, testing, certification details]

*Always read the label. Follow directions for use. Supplements should not replace a balanced diet.*
```

### Wholesale Product
```markdown
## [Product Name] - Wholesale

A customer favourite that delivers consistent sales and healthy margins.

**Why stock this product:**
- [Retail benefit 1]
- [Retail benefit 2]
- [Consumer appeal point]

**Product details:**
- RRP: $[X]
- Shelf life: [X]
- Min order: [X]

**Marketing support:**
[Available POS, imagery, etc.]
```

---

## Quality Checklist

### Before Delivery
- [ ] Matches brand voice guidelines
- [ ] Primary keyword in first 25 words
- [ ] No medical/health claims (unless TGA listed)
- [ ] Accurate product information
- [ ] Appropriate length (short: 50-100, long: 150-300)
- [ ] Meta description ≤155 characters
- [ ] No spelling/grammar errors
- [ ] Mobile-friendly formatting
- [ ] CTA included
- [ ] Unique (not duplicated from elsewhere)

---

## Environment Variables

```bash
# OpenAI for generation assistance (optional)
OPENAI_API_KEY=

# Supabase for storing generated content
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Platform APIs for direct upload
TEELIXIR_SHOPIFY_ACCESS_TOKEN=
BOO_BC_ACCESS_TOKEN=
ELEVATE_SHOPIFY_ACCESS_TOKEN=
```

---

## Integration Points

### Data Sources
- Supplier product feeds
- Existing product database
- Category taxonomies

### Output Destinations
- BigCommerce product editor
- Shopify product editor
- WooCommerce product editor
- CSV export for bulk upload

### Quality Tools
- Readability scoring
- SEO analysis
- Plagiarism checking
- Brand voice validation

---

## Success Criteria

A successful product description should:
- Match brand voice guidelines
- Include target keywords naturally
- Provide clear benefit statements
- Be accurate and compliant
- Meet length requirements
- Score well on readability (Grade 8-10)
- Include compelling CTA
- Be unique and original
