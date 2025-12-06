const fs = require('fs');

console.log('\n📝 Generating UHP Redirects from Deletion Report\n');

// Load deletion report
const deletionReport = JSON.parse(fs.readFileSync('reports/uhp-safe-deletion-report.json', 'utf8'));

console.log(`Total products in report: ${deletionReport.total_products}`);

// Category mapping based on product type keywords
const categoryMap = {
  'shampoo': '/beauty-personal-care/hair-care/',
  'conditioner': '/beauty-personal-care/hair-care/',
  'body wash': '/beauty-personal-care/body-care/',
  'body lotion': '/beauty-personal-care/body-care/',
  'soap': '/beauty-personal-care/body-care/',
  'toothbrush': '/beauty-personal-care/oral-care/',
  'toothpaste': '/beauty-personal-care/oral-care/',
  'face': '/beauty-personal-care/skin-care/',
  'cream': '/beauty-personal-care/skin-care/',
  'serum': '/beauty-personal-care/skin-care/',
  'moisturiser': '/beauty-personal-care/skin-care/',
  'protein': '/superfoods-supplements/protein/',
  'powder': '/superfoods-supplements/',
  'capsule': '/superfoods-supplements/',
  'vitamin': '/superfoods-supplements/',
  'supplement': '/superfoods-supplements/',
  'noodle': '/noodles/',
  'pasta': '/noodles/',
  'oil': '/plant-animal-oils/',
  'tea': '/drinks/tea-coffee/',
  'coffee': '/drinks/tea-coffee/',
  'chocolate': '/snacks-treats/',
  'snack': '/snacks-treats/'
};

function getCategoryForProduct(name) {
  const lowerName = name.toLowerCase();

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerName.includes(keyword)) {
      return category;
    }
  }

  // Default to homepage
  return '/';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate redirects
const redirects = [];

for (const product of deletionReport.products) {
  // Try to reconstruct the product URL from name
  // Most BigCommerce product URLs follow pattern: /product-name-slug/
  const slug = slugify(product.name);
  const fromPath = `/${slug}/`;

  // Determine best category redirect
  const toPath = getCategoryForProduct(product.name);

  redirects.push({
    from: fromPath,
    to: toPath,
    brand: product.brand,
    name: product.name
  });
}

console.log(`\nGenerated ${redirects.length} redirects`);

// Category breakdown
const categoryBreakdown = {};
redirects.forEach(r => {
  categoryBreakdown[r.to] = (categoryBreakdown[r.to] || 0) + 1;
});

console.log('\n📊 Redirect Destination Breakdown:');
Object.entries(categoryBreakdown)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dest, count]) => {
    const percentage = ((count / redirects.length) * 100).toFixed(1);
    console.log(`  ${dest.padEnd(40)} ${count.toString().padStart(3)} (${percentage}%)`);
  });

// Generate CSV
const csv = ['Domain,Old Path,Manual URL/Path,Dynamic Target Type,Dynamic Target ID'];

for (const redirect of redirects) {
  csv.push(`www.buyorganicsonline.com.au,${redirect.from},${redirect.to},,`);
}

const csvContent = csv.join('\n');
const outputFile = 'uhp-redirects-generated.csv';

fs.writeFileSync(outputFile, csvContent);
console.log(`\n✅ CSV generated: ${outputFile}`);
console.log(`   ${redirects.length} redirects ready for import\n`);

// Also save detailed JSON for reference
const detailFile = 'uhp-redirects-generated-detail.json';
fs.writeFileSync(detailFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  total: redirects.length,
  category_breakdown: categoryBreakdown,
  redirects: redirects
}, null, 2));

console.log(`✅ Detail file: ${detailFile}\n`);
