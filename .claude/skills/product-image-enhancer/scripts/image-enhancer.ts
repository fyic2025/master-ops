/**
 * Product Image Enhancer Script
 *
 * CLI tool for image transformation and enhancement using Cloudinary.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCloudinaryClient, CloudinaryClient } from '../../../../shared/libs/integrations/cloudinary/client';

let client: ReturnType<typeof getCloudinaryClient>;

async function initClient() {
  await CloudinaryClient.initialize();
  client = getCloudinaryClient();
}

async function showPresets() {
  console.log('\nAvailable Image Presets:\n');
  const presets = client.getPresets();

  console.log('Product Images:');
  ['product_main', 'product_thumbnail', 'product_zoom'].forEach(key => {
    const p = presets[key];
    console.log(`  ${key}: ${p.description}`);
    console.log(`    Transforms: ${p.transformations}\n`);
  });

  console.log('Social Media:');
  ['instagram_square', 'instagram_portrait', 'instagram_story', 'facebook_post'].forEach(key => {
    const p = presets[key];
    console.log(`  ${key}: ${p.description}`);
    console.log(`    Transforms: ${p.transformations}\n`);
  });

  console.log('Email:');
  ['email_hero', 'email_product'].forEach(key => {
    const p = presets[key];
    console.log(`  ${key}: ${p.description}`);
    console.log(`    Transforms: ${p.transformations}\n`);
  });

  console.log('Enhancement:');
  ['background_remove', 'auto_enhance', 'optimize_web'].forEach(key => {
    const p = presets[key];
    console.log(`  ${key}: ${p.description}`);
    console.log(`    Transforms: ${p.transformations}\n`);
  });
}

async function transform(publicId: string, preset: string) {
  console.log(`\n🔄 Transforming ${publicId} with preset: ${preset}\n`);

  const result = client.generateTransformUrl({ publicId, preset });

  console.log('URL:', result.secureUrl);
  console.log('Transformations:', result.transformations);

  return result;
}

async function productVariants(publicId: string) {
  console.log(`\n📦 Generating product variants for: ${publicId}\n`);

  const variants = client.generateProductVariants(publicId);

  console.log('Main (800x800):');
  console.log(`  ${variants.main}\n`);

  console.log('Thumbnail (200x200):');
  console.log(`  ${variants.thumbnail}\n`);

  console.log('Zoom (1600x1600):');
  console.log(`  ${variants.zoom}\n`);

  console.log('Enhanced:');
  console.log(`  ${variants.enhanced}\n`);

  return variants;
}

async function socialVariants(publicId: string) {
  console.log(`\n📱 Generating social media variants for: ${publicId}\n`);

  const variants = client.generateSocialVariants(publicId);

  console.log('Instagram Square (1080x1080):');
  console.log(`  ${variants.instagramSquare}\n`);

  console.log('Instagram Portrait (1080x1350):');
  console.log(`  ${variants.instagramPortrait}\n`);

  console.log('Instagram Story (1080x1920):');
  console.log(`  ${variants.instagramStory}\n`);

  console.log('Facebook Post (1200x630):');
  console.log(`  ${variants.facebookPost}\n`);

  return variants;
}

async function emailVariants(publicId: string) {
  console.log(`\n📧 Generating email variants for: ${publicId}\n`);

  const variants = client.generateEmailVariants(publicId);

  console.log('Hero (600x300):');
  console.log(`  ${variants.hero}\n`);

  console.log('Product (300x300):');
  console.log(`  ${variants.product}\n`);

  console.log('Optimized:');
  console.log(`  ${variants.optimized}\n`);

  return variants;
}

async function generateSrcSet(publicId: string, widths?: string) {
  const widthArray = widths
    ? widths.split(',').map(w => parseInt(w.trim()))
    : [200, 400, 800, 1200, 1600];

  console.log(`\n📐 Generating srcset for: ${publicId}\n`);
  console.log(`Widths: ${widthArray.join(', ')}\n`);

  const srcSet = client.generateSrcSet({ publicId, widths: widthArray });

  console.log('srcset:');
  console.log(srcSet);

  console.log('\nHTML usage:');
  console.log(`<img
  src="${client.generateTransformUrl({ publicId, preset: 'product_main' }).secureUrl}"
  srcset="${srcSet.replace(/\n/g, ' ')}"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="Product image"
  loading="lazy"
/>`);

  return srcSet;
}

// CLI
async function main() {
  // Initialize client with creds from vault
  await initClient();

  const [command, ...args] = process.argv.slice(2);

  // Check configuration
  if (command !== 'presets' && command !== 'help' && !client.isConfigured()) {
    console.log('⚠️ Cloudinary not fully configured.');
    console.log('Store credentials with: node creds.js store global cloudinary_cloud_name "YOUR_NAME"');
    console.log('\nURL generation will still work with cloud name only.\n');
  }

  switch (command) {
    case 'presets':
      await showPresets();
      break;

    case 'transform':
      if (!args[0]) {
        console.error('Usage: image-enhancer.ts transform <publicId> [preset]');
        process.exit(1);
      }
      await transform(args[0], args[1] || 'product_main');
      break;

    case 'product-variants':
      if (!args[0]) {
        console.error('Usage: image-enhancer.ts product-variants <publicId>');
        process.exit(1);
      }
      await productVariants(args[0]);
      break;

    case 'social-variants':
      if (!args[0]) {
        console.error('Usage: image-enhancer.ts social-variants <publicId>');
        process.exit(1);
      }
      await socialVariants(args[0]);
      break;

    case 'email-variants':
      if (!args[0]) {
        console.error('Usage: image-enhancer.ts email-variants <publicId>');
        process.exit(1);
      }
      await emailVariants(args[0]);
      break;

    case 'srcset':
      if (!args[0]) {
        console.error('Usage: image-enhancer.ts srcset <publicId> [widths]');
        console.error('Example: image-enhancer.ts srcset my-image "200,400,800"');
        process.exit(1);
      }
      await generateSrcSet(args[0], args[1]);
      break;

    case 'configured':
      console.log('Cloudinary configured:', client.isConfigured());
      break;

    default:
      console.log(`
Product Image Enhancer

Usage:
  npx tsx image-enhancer.ts <command> [args...]

Commands:
  presets                         List all available presets
  transform <publicId> [preset]   Transform image with preset
  product-variants <publicId>     Generate all product sizes
  social-variants <publicId>      Generate social media sizes
  email-variants <publicId>       Generate email sizes
  srcset <publicId> [widths]      Generate responsive srcset
  configured                      Check API configuration

Presets:
  product_main, product_thumbnail, product_zoom
  instagram_square, instagram_portrait, instagram_story
  facebook_post, email_hero, email_product
  background_remove, auto_enhance, optimize_web

Environment Variables:
  CLOUDINARY_CLOUD_NAME   Your Cloudinary cloud name
  CLOUDINARY_API_KEY      API key (for uploads)
  CLOUDINARY_API_SECRET   API secret (for uploads)
      `);
  }
}

main().catch(console.error);
