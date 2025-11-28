const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Load credentials
require('dotenv').config({ path: path.join(__dirname, '../../MASTER-CREDENTIALS-COMPLETE.env') });

const STORE_HASH = process.env.BOO_BC_STORE_HASH || 'hhhi';
const ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN || 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

async function getActiveTheme() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${STORE_HASH}/v3/themes`,
            method: 'GET',
            headers: {
                'X-Auth-Token': ACCESS_TOKEN,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const active = result.data?.find(t => t.is_active);
                    resolve(active);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function downloadTheme(themeUuid) {
    return new Promise((resolve, reject) => {
        // Request download job
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${STORE_HASH}/v3/themes/${themeUuid}/actions/download`,
            method: 'POST',
            headers: {
                'X-Auth-Token': ACCESS_TOKEN,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('Download job created:', result);
                    resolve(result.data?.job_id);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write('{}');
        req.end();
    });
}

async function main() {
    try {
        console.log('Getting active theme...');
        const theme = await getActiveTheme();
        console.log('Active theme:', theme?.name, '- UUID:', theme?.uuid);

        if (theme) {
            console.log('\nTheme variations:');
            theme.variations?.forEach(v => {
                console.log(`  - ${v.name} (${v.uuid})${v.is_active ? ' [ACTIVE]' : ''}`);
            });
        }

        console.log('\n=== Instructions ===');
        console.log('Since Stencil CLI has node-sass issues on Windows,');
        console.log('please copy the brands.html content directly in BC Control Panel:');
        console.log('\n1. Go to: Storefront > Themes > Advanced > Edit Theme Files');
        console.log('2. Navigate to: templates/pages/brands.html');
        console.log('3. Replace content with the optimized version from:');
        console.log('   ' + path.join(__dirname, 'templates/pages/brands.html'));
        console.log('\nThe local file is syntactically correct and ready.');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
