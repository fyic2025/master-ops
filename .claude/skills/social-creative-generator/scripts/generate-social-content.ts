#!/usr/bin/env npx tsx
/**
 * Social Media Content Generator
 *
 * Generates platform-optimized social media content with captions,
 * hashtags, and carousel structures.
 *
 * Usage:
 *   npx tsx generate-social-content.ts --platform instagram --business teelixir --topic "adaptogens"
 *   npx tsx generate-social-content.ts --platform facebook --business boo --type product
 *   npx tsx generate-social-content.ts --platform tiktok --business teelixir --type educational
 */

import { createClient } from '@supabase/supabase-js';

interface SocialPost {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  type: 'product' | 'educational' | 'promotional' | 'lifestyle' | 'testimonial';
  caption: string;
  hashtags: string[];
  callToAction: string;
  suggestedImageType: string;
  carouselSlides?: { slide: number; content: string; caption: string }[];
  bestTimeToPost: string;
  characterCount: number;
}

interface BrandVoice {
  personality: string[];
  tone: string;
  hashtags: string[];
  emojis: string[];
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

// Brand voice configurations
const BRAND_VOICES: Record<string, BrandVoice> = {
  teelixir: {
    personality: ['Expert', 'Passionate', 'Wellness-focused', 'Premium'],
    tone: 'Educational yet approachable, emphasizing quality and tradition',
    hashtags: ['#adaptogens', '#medicimushrooms', '#wellness', '#teelixir', '#holistichealth', '#functionalfoods', '#plantmedicine', '#naturalhealth'],
    emojis: ['🍄', '✨', '🌿', '💚', '🧘', '🌱']
  },
  boo: {
    personality: ['Trustworthy', 'Supportive', 'Health-conscious', 'Eco-friendly'],
    tone: 'Friendly and informative, focusing on organic living',
    hashtags: ['#organic', '#healthyliving', '#organicfood', '#buyorganic', '#australianorganic', '#cleanfood', '#wholefood'],
    emojis: ['🌱', '🥗', '💚', '🌿', '✅', '🌾']
  },
  elevate: {
    personality: ['Professional', 'Reliable', 'Business-focused', 'Quality-driven'],
    tone: 'Professional and value-oriented for B2B audience',
    hashtags: ['#wholesale', '#b2b', '#retailer', '#bulkbuying', '#businessgrowth'],
    emojis: ['📦', '💼', '📈', '✅', '🤝']
  },
  rhf: {
    personality: ['Local', 'Fresh', 'Family-oriented', 'Community-focused'],
    tone: 'Warm and community-oriented, emphasizing freshness',
    hashtags: ['#redhillfresh', '#localfood', '#farmfresh', '#melbournefood', '#freshproduce', '#supportlocal'],
    emojis: ['🥬', '🍎', '🏡', '👨‍🌾', '❤️', '🌻']
  }
};

// Platform specifications
const PLATFORM_SPECS = {
  instagram: {
    maxCaptionLength: 2200,
    optimalCaptionLength: 150,
    maxHashtags: 30,
    optimalHashtags: 11,
    bestTimes: ['6-9 AM', '12-2 PM', '7-9 PM'],
    carouselMaxSlides: 10
  },
  facebook: {
    maxCaptionLength: 63206,
    optimalCaptionLength: 80,
    maxHashtags: 10,
    optimalHashtags: 3,
    bestTimes: ['1-4 PM', '6-9 PM'],
    carouselMaxSlides: 10
  },
  tiktok: {
    maxCaptionLength: 2200,
    optimalCaptionLength: 100,
    maxHashtags: 5,
    optimalHashtags: 4,
    bestTimes: ['7-9 AM', '12-3 PM', '7-11 PM'],
    carouselMaxSlides: 0
  },
  linkedin: {
    maxCaptionLength: 3000,
    optimalCaptionLength: 150,
    maxHashtags: 5,
    optimalHashtags: 3,
    bestTimes: ['7-8 AM', '12 PM', '5-6 PM'],
    carouselMaxSlides: 20
  }
};

// Content templates by type
const CONTENT_TEMPLATES = {
  product: {
    instagram: (product: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} NEW: ${product}\n\nDiscover the power of ${product.toLowerCase()} and transform your daily wellness routine.\n\n${brand.emojis[1]} What makes it special:\n• Premium quality\n• Sustainably sourced\n• Lab tested for purity\n\nTap the link in bio to shop ${brand.emojis[2]}`,
      cta: 'Link in bio to shop!',
      imageType: 'Product flat lay with lifestyle elements'
    }),
    facebook: (product: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} Introducing ${product}\n\nWe're excited to share this with you! Perfect for anyone looking to enhance their wellness journey.\n\nShop now: [link]`,
      cta: 'Shop Now',
      imageType: 'Product image with benefit callouts'
    }),
    tiktok: (product: string, brand: BrandVoice) => ({
      caption: `POV: You just discovered ${product} ${brand.emojis[0]} #wellness #healthtok`,
      cta: 'Link in bio!',
      imageType: 'Unboxing or product demo video'
    })
  },
  educational: {
    instagram: (topic: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} Did you know?\n\n${topic} can help support your body's natural processes.\n\nSwipe to learn more about how to incorporate this into your daily routine ${brand.emojis[1]}\n\nSave this post for later!`,
      cta: 'Save for later!',
      imageType: 'Carousel with educational slides',
      carousel: [
        { slide: 1, content: 'Title slide with hook', caption: topic },
        { slide: 2, content: 'What it is', caption: 'Introduction' },
        { slide: 3, content: 'Key benefits', caption: 'Benefits explained' },
        { slide: 4, content: 'How to use', caption: 'Usage guide' },
        { slide: 5, content: 'CTA slide', caption: 'Shop now' }
      ]
    }),
    facebook: (topic: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} ${topic} 101\n\nHere's what you need to know about ${topic.toLowerCase()} and why it matters for your health.\n\nRead our full guide: [link]`,
      cta: 'Read more',
      imageType: 'Infographic or blog preview'
    }),
    tiktok: (topic: string, brand: BrandVoice) => ({
      caption: `3 things about ${topic} you didn't know ${brand.emojis[0]} #learntok #wellness`,
      cta: 'Follow for more!',
      imageType: 'Talking head or text overlay video'
    })
  },
  promotional: {
    instagram: (offer: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} ${offer} OFF EVERYTHING!\n\nOur biggest sale of the year is HERE ${brand.emojis[1]}\n\n✨ Free shipping on orders $75+\n✨ Limited time only\n✨ While stocks last\n\nDon't miss out - tap the link in bio!`,
      cta: 'Shop the sale!',
      imageType: 'Bold promotional graphic with offer'
    }),
    facebook: (offer: string, brand: BrandVoice) => ({
      caption: `${brand.emojis[0]} FLASH SALE: ${offer} OFF!\n\nShop now before it's gone: [link]\n\nOffer ends soon!`,
      cta: 'Shop Now',
      imageType: 'Sale banner with countdown'
    }),
    tiktok: (offer: string, brand: BrandVoice) => ({
      caption: `RUN don't walk - ${offer} off EVERYTHING ${brand.emojis[0]} #sale #deals`,
      cta: 'Link in bio!',
      imageType: 'Quick product showcase video'
    })
  }
};

// Generate post
function generatePost(
  platform: keyof typeof PLATFORM_SPECS,
  type: keyof typeof CONTENT_TEMPLATES,
  business: string,
  topic: string
): SocialPost {
  const brandVoice = BRAND_VOICES[business] || BRAND_VOICES.teelixir;
  const specs = PLATFORM_SPECS[platform];
  const template = CONTENT_TEMPLATES[type]?.[platform];

  if (!template) {
    throw new Error(`No template for ${type} on ${platform}`);
  }

  const content = template(topic, brandVoice);

  // Select optimal hashtags
  const hashtagCount = specs.optimalHashtags;
  const selectedHashtags = brandVoice.hashtags.slice(0, hashtagCount);

  const post: SocialPost = {
    platform,
    type,
    caption: content.caption,
    hashtags: selectedHashtags,
    callToAction: content.cta,
    suggestedImageType: content.imageType,
    carouselSlides: content.carousel,
    bestTimeToPost: specs.bestTimes[0],
    characterCount: content.caption.length
  };

  return post;
}

// Format output
function formatPost(post: SocialPost): string {
  const lines = [
    '',
    '═'.repeat(60),
    `  ${post.platform.toUpperCase()} POST - ${post.type.toUpperCase()}`,
    '═'.repeat(60),
    '',
    '📝 CAPTION',
    '─'.repeat(60),
    post.caption,
    '',
    '─'.repeat(60),
    `Character count: ${post.characterCount}`,
    '',
    '#️⃣ HASHTAGS',
    '─'.repeat(60),
    post.hashtags.join(' '),
    '',
    '📸 SUGGESTED IMAGE',
    '─'.repeat(60),
    post.suggestedImageType,
    ''
  ];

  if (post.carouselSlides && post.carouselSlides.length > 0) {
    lines.push('📱 CAROUSEL STRUCTURE');
    lines.push('─'.repeat(60));
    for (const slide of post.carouselSlides) {
      lines.push(`  Slide ${slide.slide}: ${slide.content}`);
    }
    lines.push('');
  }

  lines.push('⏰ BEST TIME TO POST');
  lines.push('─'.repeat(60));
  lines.push(`  ${post.bestTimeToPost} AEST`);
  lines.push('');

  lines.push('👆 CALL TO ACTION');
  lines.push('─'.repeat(60));
  lines.push(`  ${post.callToAction}`);
  lines.push('');

  return lines.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const platform = (args.find(a => a.startsWith('--platform='))?.split('=')[1]
    || (args.includes('--platform') ? args[args.indexOf('--platform') + 1] : 'instagram')) as keyof typeof PLATFORM_SPECS;
  const business = args.find(a => a.startsWith('--business='))?.split('=')[1]
    || (args.includes('--business') ? args[args.indexOf('--business') + 1] : null);
  const type = (args.find(a => a.startsWith('--type='))?.split('=')[1]
    || (args.includes('--type') ? args[args.indexOf('--type') + 1] : 'product')) as keyof typeof CONTENT_TEMPLATES;
  const topic = args.find(a => a.startsWith('--topic='))?.split('=')[1]
    || (args.includes('--topic') ? args[args.indexOf('--topic') + 1] : 'our latest product');

  if (!business) {
    console.log('Usage: npx tsx generate-social-content.ts --platform <platform> --business <business> [options]');
    console.log('');
    console.log('Platforms: instagram, facebook, tiktok, linkedin');
    console.log('Businesses: teelixir, boo, elevate, rhf');
    console.log('Types: product, educational, promotional, lifestyle, testimonial');
    console.log('');
    console.log('Options:');
    console.log('  --type <type>      Content type (default: product)');
    console.log('  --topic "topic"    Topic or product name');
    process.exit(1);
  }

  console.log(`📱 Generating ${platform} ${type} content for ${business}...`);

  const post = generatePost(platform, type, business, topic);
  console.log(formatPost(post));

  // Store in database
  const supabase = getSupabaseClient();
  await supabase.from('social_content').insert({
    business_slug: business,
    platform: platform,
    content_type: type,
    caption: post.caption,
    hashtags: post.hashtags,
    carousel_slides: post.carouselSlides,
    suggested_image_type: post.suggestedImageType,
    created_at: new Date().toISOString()
  });

  console.log('✅ Content saved to database');

  // Copy-ready output
  console.log('\n📋 COPY-READY CAPTION:');
  console.log('─'.repeat(60));
  console.log(post.caption);
  console.log('');
  console.log(post.hashtags.join(' '));
}

main().catch(console.error);
