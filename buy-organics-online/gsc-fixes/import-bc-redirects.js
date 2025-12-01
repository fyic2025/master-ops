/**
 * Import 301 Redirects to BigCommerce
 *
 * Usage: node import-bc-redirects.js [csv-file]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// BigCommerce Config
const BC_STORE_HASH = 'hhhi253u3y';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

/**
 * Make BigCommerce API request
 */
function bcRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}${endpoint}`,
            method,
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({ status: res.statusCode, ...parsed });
                    }
                } catch (e) {
                    resolve({ raw: data, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Parse redirect CSV file
 */
function parseRedirectCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    const redirects = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^"?([^",]+)"?,\s*"?([^",]+)"?,?\s*(\d+)?/);
        if (match) {
            let fromPath = match[1].trim();
            let toPath = match[2].trim();

            // Ensure paths start with /
            if (!fromPath.startsWith('/')) fromPath = '/' + fromPath;
            if (!toPath.startsWith('/')) toPath = '/' + toPath;

            redirects.push({
                from: fromPath,
                to: toPath,
                type: parseInt(match[3]) || 301
            });
        }
    }

    return redirects;
}

/**
 * Create redirect in BigCommerce using v2 API
 */
async function createRedirectV2(redirect) {
    try {
        const result = await bcRequest('/v2/redirects', 'POST', {
            path: redirect.from,
            forward: {
                type: 'manual',
                url: redirect.to
            }
        });
        return { success: true, data: result };
    } catch (error) {
        if (error.status === 409) {
            return { success: false, error: 'Already exists', existed: true };
        }
        return { success: false, error: error.title || error.message || JSON.stringify(error) };
    }
}

/**
 * Main import function
 */
async function importRedirects(csvFile) {
    console.log('='.repeat(60));
    console.log('BOO BigCommerce Redirect Import');
    console.log('='.repeat(60));
    console.log(`\nFile: ${csvFile}\n`);

    const redirects = parseRedirectCSV(csvFile);
    console.log(`Found ${redirects.length} redirects to import\n`);

    if (redirects.length === 0) {
        console.log('No redirects found in file');
        return;
    }

    const stats = { created: 0, existed: 0, failed: 0 };
    const failed = [];

    for (let i = 0; i < redirects.length; i++) {
        const redirect = redirects[i];
        const progress = `[${i + 1}/${redirects.length}]`;

        process.stdout.write(`${progress} ${redirect.from.slice(0, 55).padEnd(55)} -> `);

        const result = await createRedirectV2(redirect);

        if (result.success) {
            stats.created++;
            console.log('✓ Created');
        } else if (result.existed) {
            stats.existed++;
            console.log('○ Already exists');
        } else {
            stats.failed++;
            console.log(`✗ ${result.error}`);
            failed.push({ ...redirect, error: result.error });
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 100));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n  Created:        ${stats.created}`);
    console.log(`  Already existed: ${stats.existed}`);
    console.log(`  Failed:         ${stats.failed}`);
    console.log(`  Total:          ${redirects.length}`);

    if (failed.length > 0) {
        const failedFile = csvFile.replace('.csv', '-failed.json');
        fs.writeFileSync(failedFile, JSON.stringify(failed, null, 2));
        console.log(`\nFailed redirects saved to: ${failedFile}`);
    }

    // Save URLs that need GSC re-inspection
    const urlsForGSC = redirects.map(r => 'https://www.buyorganicsonline.com.au' + r.from);
    const gscFile = csvFile.replace('.csv', '-gsc-urls.txt');
    fs.writeFileSync(gscFile, urlsForGSC.join('\n'));
    console.log(`\nURLs for GSC inspection saved to: ${gscFile}`);
    console.log(`\nNext step: Run GSC inspection with:`);
    console.log(`  cd shared/libs/integrations/gsc && node inspect-urls.js --queue`);

    return stats;
}

// CLI
if (require.main === module) {
    const csvFile = process.argv[2] || path.join(__dirname, 'new-404-redirects-2025-12-01.csv');

    if (!fs.existsSync(csvFile)) {
        console.error(`File not found: ${csvFile}`);
        process.exit(1);
    }

    importRedirects(csvFile)
        .then(() => console.log('\nDone!'))
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}

module.exports = { importRedirects };
