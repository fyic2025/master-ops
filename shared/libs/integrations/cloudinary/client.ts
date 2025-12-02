/**
 * Cloudinary Image Enhancement Client
 *
 * Integration with Cloudinary for image optimization and enhancement.
 * Documentation: https://cloudinary.com/documentation
 */

import fetch from 'node-fetch';
import * as crypto from 'crypto';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface TransformationPreset {
  name: string;
  description: string;
  transformations: string;
  outputFormat?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
}

interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

interface TransformResult {
  url: string;
  secureUrl: string;
  transformations: string;
}

// Standard transformation presets for e-commerce
const TRANSFORMATION_PRESETS: Record<string, TransformationPreset> = {
  // Product Images
  product_main: {
    name: 'Product Main',
    description: 'Main product image - high quality, auto-cropped',
    transformations: 'c_fill,g_auto,w_800,h_800,q_auto:best,f_auto',
    outputFormat: 'auto'
  },
  product_thumbnail: {
    name: 'Product Thumbnail',
    description: 'Small thumbnail for listings',
    transformations: 'c_fill,g_auto,w_200,h_200,q_auto,f_auto',
    outputFormat: 'auto'
  },
  product_zoom: {
    name: 'Product Zoom',
    description: 'High-res for zoom functionality',
    transformations: 'c_fill,g_auto,w_1600,h_1600,q_auto:best,f_auto',
    outputFormat: 'auto'
  },

  // Social Media
  instagram_square: {
    name: 'Instagram Square',
    description: 'Instagram feed post',
    transformations: 'c_fill,g_auto,w_1080,h_1080,q_auto,f_auto',
    outputFormat: 'auto'
  },
  instagram_portrait: {
    name: 'Instagram Portrait',
    description: 'Instagram portrait post',
    transformations: 'c_fill,g_auto,w_1080,h_1350,q_auto,f_auto',
    outputFormat: 'auto'
  },
  instagram_story: {
    name: 'Instagram Story',
    description: 'Full screen story',
    transformations: 'c_fill,g_auto,w_1080,h_1920,q_auto,f_auto',
    outputFormat: 'auto'
  },
  facebook_post: {
    name: 'Facebook Post',
    description: 'Facebook feed image',
    transformations: 'c_fill,g_auto,w_1200,h_630,q_auto,f_auto',
    outputFormat: 'auto'
  },

  // Email
  email_hero: {
    name: 'Email Hero',
    description: 'Hero banner for emails',
    transformations: 'c_fill,g_auto,w_600,h_300,q_auto,f_auto',
    outputFormat: 'auto'
  },
  email_product: {
    name: 'Email Product',
    description: 'Product image for emails',
    transformations: 'c_fill,g_auto,w_300,h_300,q_auto,f_auto',
    outputFormat: 'auto'
  },

  // Background Removal
  background_remove: {
    name: 'Background Removed',
    description: 'Remove background for product shots',
    transformations: 'e_background_removal,q_auto,f_png',
    outputFormat: 'png'
  },

  // Enhancement
  auto_enhance: {
    name: 'Auto Enhance',
    description: 'Automatic image enhancement',
    transformations: 'e_improve,e_auto_color,e_auto_contrast,q_auto:best,f_auto',
    outputFormat: 'auto'
  },

  // Optimization only
  optimize_web: {
    name: 'Web Optimized',
    description: 'Optimized for fast web loading',
    transformations: 'q_auto,f_auto,dpr_auto',
    outputFormat: 'auto'
  }
};

export class CloudinaryClient {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private static instance: CloudinaryClient;

  private constructor(config?: CloudinaryConfig) {
    this.cloudName = config?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = config?.apiKey || process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = config?.apiSecret || process.env.CLOUDINARY_API_SECRET || '';
  }

  static getInstance(config?: CloudinaryConfig): CloudinaryClient {
    if (!CloudinaryClient.instance) {
      CloudinaryClient.instance = new CloudinaryClient(config);
    }
    return CloudinaryClient.instance;
  }

  /**
   * Check if Cloudinary is configured
   */
  isConfigured(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Get available transformation presets
   */
  getPresets(): Record<string, TransformationPreset> {
    return TRANSFORMATION_PRESETS;
  }

  /**
   * Get a specific preset
   */
  getPreset(presetName: string): TransformationPreset | null {
    return TRANSFORMATION_PRESETS[presetName] || null;
  }

  /**
   * Generate signature for upload
   */
  private generateSignature(params: Record<string, string | number>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return crypto
      .createHash('sha1')
      .update(sortedParams + this.apiSecret)
      .digest('hex');
  }

  /**
   * Upload image to Cloudinary
   */
  async uploadImage(params: {
    file: string; // URL or base64
    folder?: string;
    publicId?: string;
    tags?: string[];
    preset?: string;
  }): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary API credentials not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const uploadParams: Record<string, string | number> = {
      timestamp,
      folder: params.folder || 'master-ops'
    };

    if (params.publicId) {
      uploadParams.public_id = params.publicId;
    }

    if (params.tags) {
      uploadParams.tags = params.tags.join(',');
    }

    // Apply preset transformations if specified
    if (params.preset && TRANSFORMATION_PRESETS[params.preset]) {
      uploadParams.transformation = TRANSFORMATION_PRESETS[params.preset].transformations;
    }

    const signature = this.generateSignature(uploadParams);

    const formData = new URLSearchParams();
    formData.append('file', params.file);
    formData.append('api_key', this.apiKey);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());

    for (const [key, value] of Object.entries(uploadParams)) {
      if (key !== 'timestamp') {
        formData.append(key, value.toString());
      }
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const data = await response.json() as any;
    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  }

  /**
   * Generate transformed image URL
   */
  generateTransformUrl(params: {
    publicId: string;
    preset?: string;
    customTransformations?: string;
    format?: string;
  }): TransformResult {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    let transformations = '';

    if (params.preset && TRANSFORMATION_PRESETS[params.preset]) {
      transformations = TRANSFORMATION_PRESETS[params.preset].transformations;
    } else if (params.customTransformations) {
      transformations = params.customTransformations;
    }

    const format = params.format || 'auto';
    const transformPath = transformations ? `/${transformations}` : '';

    const url = `http://res.cloudinary.com/${this.cloudName}/image/upload${transformPath}/${params.publicId}`;
    const secureUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload${transformPath}/${params.publicId}`;

    return {
      url,
      secureUrl,
      transformations
    };
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(params: {
    publicId: string;
    widths: number[];
    aspectRatio?: string;
  }): string {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    const srcSet = params.widths.map(width => {
      let transforms = `w_${width},c_fill,q_auto,f_auto`;
      if (params.aspectRatio) {
        transforms += `,ar_${params.aspectRatio}`;
      }

      const url = `https://res.cloudinary.com/${this.cloudName}/image/upload/${transforms}/${params.publicId}`;
      return `${url} ${width}w`;
    });

    return srcSet.join(',\n');
  }

  /**
   * Get image info
   */
  async getImageInfo(publicId: string): Promise<{
    width: number;
    height: number;
    format: string;
    bytes: number;
    createdAt: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary API credentials not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature({ public_id: publicId, timestamp });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/image/upload/${publicId}`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get image info: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return {
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      createdAt: data.created_at
    };
  }

  /**
   * Delete image
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary API credentials not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature({ public_id: publicId, timestamp });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          public_id: publicId,
          api_key: this.apiKey,
          signature,
          timestamp: timestamp.toString()
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${response.statusText}`);
    }

    const data = await response.json() as { result: string };
    return data.result === 'ok';
  }

  /**
   * Generate product image variants
   */
  generateProductVariants(publicId: string): Record<string, string> {
    return {
      main: this.generateTransformUrl({ publicId, preset: 'product_main' }).secureUrl,
      thumbnail: this.generateTransformUrl({ publicId, preset: 'product_thumbnail' }).secureUrl,
      zoom: this.generateTransformUrl({ publicId, preset: 'product_zoom' }).secureUrl,
      enhanced: this.generateTransformUrl({ publicId, preset: 'auto_enhance' }).secureUrl
    };
  }

  /**
   * Generate social media image variants
   */
  generateSocialVariants(publicId: string): Record<string, string> {
    return {
      instagramSquare: this.generateTransformUrl({ publicId, preset: 'instagram_square' }).secureUrl,
      instagramPortrait: this.generateTransformUrl({ publicId, preset: 'instagram_portrait' }).secureUrl,
      instagramStory: this.generateTransformUrl({ publicId, preset: 'instagram_story' }).secureUrl,
      facebookPost: this.generateTransformUrl({ publicId, preset: 'facebook_post' }).secureUrl
    };
  }

  /**
   * Generate email image variants
   */
  generateEmailVariants(publicId: string): Record<string, string> {
    return {
      hero: this.generateTransformUrl({ publicId, preset: 'email_hero' }).secureUrl,
      product: this.generateTransformUrl({ publicId, preset: 'email_product' }).secureUrl,
      optimized: this.generateTransformUrl({ publicId, preset: 'optimize_web' }).secureUrl
    };
  }
}

// Export singleton getter
export const getCloudinaryClient = (config?: CloudinaryConfig) => CloudinaryClient.getInstance(config);

// CLI usage
if (require.main === module) {
  const client = getCloudinaryClient();

  async function main() {
    const [command, ...args] = process.argv.slice(2);

    switch (command) {
      case 'presets':
        console.log('Available Presets:');
        const presets = client.getPresets();
        for (const [key, preset] of Object.entries(presets)) {
          console.log(`\n${key}:`);
          console.log(`  Name: ${preset.name}`);
          console.log(`  Description: ${preset.description}`);
          console.log(`  Transformations: ${preset.transformations}`);
        }
        break;

      case 'configured':
        console.log('Cloudinary configured:', client.isConfigured());
        break;

      case 'transform':
        const publicId = args[0];
        const preset = args[1] || 'product_main';
        if (!publicId) {
          console.error('Usage: transform <publicId> [preset]');
          process.exit(1);
        }
        const result = client.generateTransformUrl({ publicId, preset });
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'product-variants':
        const prodId = args[0];
        if (!prodId) {
          console.error('Usage: product-variants <publicId>');
          process.exit(1);
        }
        console.log(JSON.stringify(client.generateProductVariants(prodId), null, 2));
        break;

      case 'social-variants':
        const socialId = args[0];
        if (!socialId) {
          console.error('Usage: social-variants <publicId>');
          process.exit(1);
        }
        console.log(JSON.stringify(client.generateSocialVariants(socialId), null, 2));
        break;

      default:
        console.log(`
Cloudinary Image Enhancement Client

Usage:
  npx tsx client.ts <command> [args...]

Commands:
  presets                        List available presets
  configured                     Check if API is configured
  transform <publicId> [preset]  Generate transformed URL
  product-variants <publicId>    Generate all product image sizes
  social-variants <publicId>     Generate social media sizes

Environment Variables:
  CLOUDINARY_CLOUD_NAME  Cloudinary cloud name
  CLOUDINARY_API_KEY     Cloudinary API key
  CLOUDINARY_API_SECRET  Cloudinary API secret
        `);
    }
  }

  main().catch(console.error);
}
