const fs = require('fs');
const brands = JSON.parse(fs.readFileSync('bc-brands.json', 'utf8'));

let sql = '-- Import brands into seo_brands\n';
sql += '-- Run in Supabase SQL Editor\n\n';

// Batch insert
const batchSize = 50;

for (let i = 0; i < brands.length; i += batchSize) {
    const batch = brands.slice(i, i + batchSize);
    const values = batch.map(b => {
        const name = (b.name || '').replace(/'/g, "''");
        const slug = (b.slug || '').replace(/'/g, "''");
        const url = (b.url || '').replace(/'/g, "''");
        return `(${b.bc_brand_id}, '${name}', '${slug}', '${url}', 'unknown')`;
    }).join(',\n    ');

    sql += `INSERT INTO seo_brands (bc_brand_id, name, slug, url, content_status) VALUES\n    ${values}\nON CONFLICT (bc_brand_id) DO NOTHING;\n\n`;
}

fs.writeFileSync('import-brands.sql', sql);
console.log(`Created import-brands.sql with ${brands.length} brands`);
