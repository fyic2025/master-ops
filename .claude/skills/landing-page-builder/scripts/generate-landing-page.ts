#!/usr/bin/env npx tsx
/**
 * Landing Page Generator
 *
 * Generates conversion-optimized landing pages with HTML/CSS output.
 * Integrates with brand-asset-manager for styling.
 *
 * Usage:
 *   npx tsx generate-landing-page.ts --type product-launch --business teelixir --product "Lion's Mane"
 *   npx tsx generate-landing-page.ts --type lead-gen --business boo --offer "10% off"
 *   npx tsx generate-landing-page.ts --type promotion --business teelixir --campaign "Black Friday"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

interface BrandGuidelines {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  logoUrl: string;
  websiteUrl: string;
}

interface LandingPageConfig {
  type: 'product-launch' | 'lead-gen' | 'promotion' | 'webinar' | 'ebook';
  business: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  benefits: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  urgencyText?: string;
  product?: string;
  offer?: string;
  campaign?: string;
}

// Initialize Supabase
function getSupabaseClient() {
  const url = process.env.MASTER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// Fetch brand guidelines
async function fetchBrandGuidelines(
  supabase: ReturnType<typeof createClient>,
  business: string
): Promise<BrandGuidelines> {
  const { data, error } = await supabase
    .from('brand_guidelines')
    .select('*')
    .eq('business_slug', business)
    .single();

  if (error || !data) {
    // Fallback defaults
    const defaults: Record<string, BrandGuidelines> = {
      teelixir: {
        primaryColor: '#1B4D3E',
        secondaryColor: '#D4AF37',
        accentColor: '#8B4513',
        headingFont: 'Playfair Display',
        bodyFont: 'Lato',
        logoUrl: 'https://teelixir.com/logo.png',
        websiteUrl: 'https://teelixir.com'
      },
      boo: {
        primaryColor: '#4CAF50',
        secondaryColor: '#2E7D32',
        accentColor: '#FFA000',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        logoUrl: 'https://buyorganicsonline.com.au/logo.png',
        websiteUrl: 'https://buyorganicsonline.com.au'
      },
      elevate: {
        primaryColor: '#1E3A5F',
        secondaryColor: '#3498DB',
        accentColor: '#E74C3C',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        logoUrl: 'https://elevatewholesale.com.au/logo.png',
        websiteUrl: 'https://elevatewholesale.com.au'
      },
      rhf: {
        primaryColor: '#C62828',
        secondaryColor: '#4E342E',
        accentColor: '#43A047',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        logoUrl: 'https://redhillfresh.com.au/logo.png',
        websiteUrl: 'https://redhillfresh.com.au'
      }
    };

    return defaults[business] || defaults.teelixir;
  }

  return {
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    headingFont: data.heading_font,
    bodyFont: data.body_font,
    logoUrl: data.logo_url || '',
    websiteUrl: data.website_url
  };
}

// Generate HTML
function generateHTML(config: LandingPageConfig, brand: BrandGuidelines): string {
  const benefits = config.benefits.map(b =>
    `<li><span class="check">✓</span> ${b}</li>`
  ).join('\n            ');

  const testimonialSection = config.testimonial ? `
        <section class="testimonial">
          <blockquote>
            "${config.testimonial.quote}"
          </blockquote>
          <cite>
            <strong>${config.testimonial.author}</strong>
            <span>${config.testimonial.role}</span>
          </cite>
        </section>` : '';

  const urgencySection = config.urgencyText ? `
        <div class="urgency">
          <span class="urgency-icon">⏰</span>
          ${config.urgencyText}
        </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.headline} | ${config.business.toUpperCase()}</title>
  <link href="https://fonts.googleapis.com/css2?family=${brand.headingFont.replace(' ', '+')}:wght@400;700&family=${brand.bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${brand.primaryColor};
      --secondary: ${brand.secondaryColor};
      --accent: ${brand.accentColor};
      --heading-font: '${brand.headingFont}', serif;
      --body-font: '${brand.bodyFont}', sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--body-font);
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      text-align: center;
      padding: 40px 20px;
      background: white;
      border-bottom: 3px solid var(--primary);
    }

    .logo {
      max-height: 60px;
      margin-bottom: 20px;
    }

    .hero {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
      padding: 60px 20px;
      text-align: center;
    }

    h1 {
      font-family: var(--heading-font);
      font-size: 2.5rem;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .subheadline {
      font-size: 1.25rem;
      opacity: 0.95;
      max-width: 600px;
      margin: 0 auto 30px;
    }

    .cta-button {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 18px 40px;
      font-size: 1.2rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }

    .benefits {
      background: white;
      padding: 50px 20px;
    }

    .benefits h2 {
      font-family: var(--heading-font);
      text-align: center;
      color: var(--primary);
      margin-bottom: 30px;
      font-size: 1.8rem;
    }

    .benefits ul {
      list-style: none;
      max-width: 500px;
      margin: 0 auto;
    }

    .benefits li {
      padding: 12px 0;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
    }

    .check {
      color: var(--accent);
      font-size: 1.4rem;
      margin-right: 15px;
    }

    .testimonial {
      background: var(--secondary);
      color: white;
      padding: 50px 20px;
      text-align: center;
    }

    blockquote {
      font-size: 1.3rem;
      font-style: italic;
      max-width: 600px;
      margin: 0 auto 20px;
    }

    cite {
      display: block;
    }

    cite strong {
      display: block;
      font-size: 1.1rem;
    }

    cite span {
      opacity: 0.8;
    }

    .urgency {
      background: var(--accent);
      color: white;
      padding: 15px 20px;
      text-align: center;
      font-weight: 600;
    }

    .urgency-icon {
      margin-right: 8px;
    }

    .final-cta {
      background: white;
      padding: 60px 20px;
      text-align: center;
    }

    .final-cta h2 {
      font-family: var(--heading-font);
      color: var(--primary);
      margin-bottom: 20px;
      font-size: 2rem;
    }

    footer {
      text-align: center;
      padding: 30px 20px;
      background: #333;
      color: white;
      font-size: 0.9rem;
    }

    footer a {
      color: var(--accent);
    }

    @media (max-width: 600px) {
      h1 { font-size: 1.8rem; }
      .subheadline { font-size: 1rem; }
      .cta-button { padding: 15px 30px; font-size: 1rem; }
    }
  </style>
</head>
<body>
  <header>
    <img src="${brand.logoUrl}" alt="${config.business}" class="logo">
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <h1>${config.headline}</h1>
        <p class="subheadline">${config.subheadline}</p>
        <a href="${config.ctaUrl}" class="cta-button">${config.ctaText}</a>
      </div>
    </section>

    <section class="benefits">
      <div class="container">
        <h2>What You'll Get</h2>
        <ul>
          ${benefits}
        </ul>
      </div>
    </section>
    ${testimonialSection}
    ${urgencySection}

    <section class="final-cta">
      <div class="container">
        <h2>Ready to Get Started?</h2>
        <a href="${config.ctaUrl}" class="cta-button">${config.ctaText}</a>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; ${new Date().getFullYear()} <a href="${brand.websiteUrl}">${config.business.toUpperCase()}</a>. All rights reserved.</p>
  </footer>

  <!-- Tracking -->
  <script>
    // Add your analytics tracking here
    console.log('Landing page loaded:', '${config.type}');
  </script>
</body>
</html>`;
}

// Generate page configuration based on type
function generateConfig(
  type: string,
  business: string,
  options: { product?: string; offer?: string; campaign?: string }
): LandingPageConfig {
  const configs: Record<string, Partial<LandingPageConfig>> = {
    'product-launch': {
      headline: `Introducing ${options.product || 'Our Latest Product'}`,
      subheadline: 'Discover the benefits of our newest addition to the family.',
      ctaText: 'Shop Now',
      ctaUrl: '#shop',
      benefits: [
        'Premium quality ingredients',
        'Sustainably sourced',
        'Lab tested for purity',
        'Free shipping on orders over $75',
        '30-day money-back guarantee'
      ],
      testimonial: {
        quote: "This product has completely transformed my daily routine. I can't imagine life without it!",
        author: 'Sarah M.',
        role: 'Verified Customer'
      }
    },
    'lead-gen': {
      headline: `Get ${options.offer || 'Your Free Guide'}`,
      subheadline: 'Join thousands of health-conscious Australians who have already discovered the secret.',
      ctaText: 'Get Free Access',
      ctaUrl: '#signup',
      benefits: [
        'Exclusive tips not found anywhere else',
        'Instant digital access',
        'Bonus discount code included',
        'Weekly wellness updates',
        'Easy to unsubscribe anytime'
      ]
    },
    'promotion': {
      headline: `${options.campaign || 'Special'} Sale - Limited Time`,
      subheadline: 'Save big on your favorite products. This offer won\'t last long!',
      ctaText: 'Shop the Sale',
      ctaUrl: '#sale',
      benefits: [
        'Up to 40% off selected items',
        'Free shipping on all orders',
        'No minimum purchase required',
        'Extra 10% off with code SAVE10',
        'While stocks last'
      ],
      urgencyText: 'Offer ends in 48 hours!'
    }
  };

  const baseConfig = configs[type] || configs['product-launch'];

  return {
    type: type as LandingPageConfig['type'],
    business,
    ...baseConfig,
    product: options.product,
    offer: options.offer,
    campaign: options.campaign
  } as LandingPageConfig;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const type = args.find(a => a.startsWith('--type='))?.split('=')[1]
    || (args.includes('--type') ? args[args.indexOf('--type') + 1] : 'product-launch');
  const business = args.find(a => a.startsWith('--business='))?.split('=')[1]
    || (args.includes('--business') ? args[args.indexOf('--business') + 1] : null);
  const product = args.find(a => a.startsWith('--product='))?.split('=')[1]
    || (args.includes('--product') ? args[args.indexOf('--product') + 1] : undefined);
  const offer = args.find(a => a.startsWith('--offer='))?.split('=')[1]
    || (args.includes('--offer') ? args[args.indexOf('--offer') + 1] : undefined);
  const campaign = args.find(a => a.startsWith('--campaign='))?.split('=')[1]
    || (args.includes('--campaign') ? args[args.indexOf('--campaign') + 1] : undefined);

  if (!business) {
    console.log('Usage: npx tsx generate-landing-page.ts --type <type> --business <business> [options]');
    console.log('');
    console.log('Types: product-launch, lead-gen, promotion, webinar, ebook');
    console.log('Businesses: teelixir, boo, elevate, rhf');
    console.log('');
    console.log('Options:');
    console.log('  --product "Product Name"   For product launches');
    console.log('  --offer "10% off"          For lead gen pages');
    console.log('  --campaign "Black Friday"  For promotions');
    process.exit(1);
  }

  console.log(`🎨 Generating ${type} landing page for ${business}...`);

  const supabase = getSupabaseClient();
  const brand = await fetchBrandGuidelines(supabase, business);
  const config = generateConfig(type, business, { product, offer, campaign });

  const html = generateHTML(config, brand);

  // Save to file
  const filename = `landing-page-${business}-${type}-${Date.now()}.html`;
  fs.writeFileSync(filename, html);

  console.log(`\n✅ Landing page generated: ${filename}`);
  console.log(`   Type: ${type}`);
  console.log(`   Business: ${business}`);
  console.log(`   Primary Color: ${brand.primaryColor}`);
  console.log(`\nOpen in browser to preview.`);

  // Store in database
  await supabase.from('landing_pages').insert({
    business_slug: business,
    page_type: type,
    headline: config.headline,
    html_content: html,
    config: config,
    created_at: new Date().toISOString()
  });

  console.log('📊 Saved to database');
}

main().catch(console.error);
