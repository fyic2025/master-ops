/**
 * Bulk Upload Images to Cloudinary
 *
 * Usage: node scripts/cloudinary-upload.js <folder> [cloudinary-folder]
 *
 * Example: node scripts/cloudinary-upload.js C:\images\teelixir teelixir/products
 */

const fs = require('fs');
const path = require('path');
const creds = require('../creds.js');

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

async function uploadToCloudinary(filePath, folder, cloudName, apiKey, apiSecret) {
  const FormData = (await import('node-fetch')).FormData || require('form-data');
  const fetch = (await import('node-fetch')).default;
  const crypto = require('crypto');

  const timestamp = Math.floor(Date.now() / 1000);
  const fileName = path.basename(filePath, path.extname(filePath));
  const publicId = folder ? `${folder}/${fileName}` : fileName;

  // Generate signature
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  const base64File = `data:image/${path.extname(filePath).slice(1)};base64,${fileBuffer.toString('base64')}`;

  const formData = new URLSearchParams();
  formData.append('file', base64File);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('public_id', publicId);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  return response.json();
}

async function main() {
  const [sourceFolder, cloudinaryFolder = 'uploads'] = process.argv.slice(2);

  if (!sourceFolder) {
    console.log(`
Bulk Upload Images to Cloudinary

Usage: node scripts/cloudinary-upload.js <source-folder> [cloudinary-folder]

Examples:
  node scripts/cloudinary-upload.js C:\\images\\teelixir teelixir/products
  node scripts/cloudinary-upload.js ./my-images boo/logos
    `);
    process.exit(1);
  }

  // Check folder exists
  if (!fs.existsSync(sourceFolder)) {
    console.error(`❌ Folder not found: ${sourceFolder}`);
    process.exit(1);
  }

  // Get credentials
  const cloudName = await creds.get('global', 'cloudinary_cloud_name');
  const apiKey = await creds.get('global', 'cloudinary_api_key');
  const apiSecret = await creds.get('global', 'cloudinary_api_secret');

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary credentials not configured');
    process.exit(1);
  }

  // Get all image files
  const files = fs.readdirSync(sourceFolder)
    .filter(f => SUPPORTED_FORMATS.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(sourceFolder, f));

  if (files.length === 0) {
    console.log('No image files found in folder');
    process.exit(0);
  }

  console.log(`\n📤 Uploading ${files.length} images to Cloudinary folder: ${cloudinaryFolder}\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const fileName = path.basename(file);
    process.stdout.write(`  ${fileName}... `);

    try {
      const result = await uploadToCloudinary(file, cloudinaryFolder, cloudName, apiKey, apiSecret);

      if (result.secure_url) {
        console.log('✅');
        success++;
      } else {
        console.log('❌', result.error?.message || 'Unknown error');
        failed++;
      }
    } catch (err) {
      console.log('❌', err.message);
      failed++;
    }
  }

  console.log(`\n✅ Uploaded: ${success}  ❌ Failed: ${failed}`);
  console.log(`\nView at: https://console.cloudinary.com/console/media_library/folders/${cloudinaryFolder}`);
}

main().catch(console.error);
