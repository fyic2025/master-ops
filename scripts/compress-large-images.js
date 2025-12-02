/**
 * Compress oversized images for Cloudinary upload
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const dir = 'C:/Users/jayso/cloudinary-uploads/teelixir';
const largeFiles = [
  'teelixir-organic-cordyceps-mushroom-50g.jpg',
  'teelixir-organic-lion-s-mane-mushroom-100g.jpg',
  'teelixir-organic-resveratrol-100-off.jpg'
];

async function compressImages() {
  for (const file of largeFiles) {
    const filePath = path.join(dir, file);
    const tempPath = path.join(dir, 'temp_' + file);

    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} - not found`);
      continue;
    }

    console.log(`Compressing ${file}...`);
    const stats = fs.statSync(filePath);
    console.log(`  Original: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

    const compressedPath = filePath.replace('.jpg', '_small.jpg');

    await sharp(filePath)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(compressedPath);

    const newStats = fs.statSync(compressedPath);
    console.log(`  Compressed: ${(newStats.size / 1024 / 1024).toFixed(1)}MB → ${path.basename(compressedPath)}`);
  }
  console.log('\nDone! Now re-run upload for these files.');
}

compressImages().catch(console.error);
