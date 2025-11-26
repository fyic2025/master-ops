/**
 * Google Merchant Center Snapshot Script
 *
 * Fetches all products and issues from GMC, cross-references with BigCommerce,
 * and stores everything in Supabase for analysis and tracking.
 *
 * Usage: node 03-snapshot.js
 */

const https = require('https');
const GMCClient = require('./02-gmc-client.js');

// Supabase configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

/**
 * Get credential from Supabase vault
 */
async function getCredential(project, name) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ p_project: project, p_name: name });

        const options = {
            hostname: 'usibnysqelovfuctmkqw.supabase.co',
            port: 443,
            path: '/rest/v1/rpc/get_credential',
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Failed to get credential: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Supabase API helper
 */
async function supabaseRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'usibnysqelovfuctmkqw.supabase.co',
            port: 443,
            path: `/rest/v1${path}`,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Supabase Error (${res.statusCode}): ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (body) {
            const postData = JSON.stringify(body);
            req.setHeader('Content-Length', Buffer.byteLength(postData));
            req.write(postData);
        }
        req.end();
    });
}

/**
 * Get BigCommerce products for cross-reference
 */
async function getBigCommerceProducts() {
    const response = await supabaseRequest('/ecommerce_products?select=bc_product_id,sku,name,calculated_price,is_visible,availability');
    return response;
}

/**
 * Create a new snapshot record
 */
async function createSnapshot() {
    const result = await supabaseRequest('/gmc_snapshots', 'POST', {
        status: 'running'
    });
    return result[0];
}

/**
 * Update snapshot with final counts
 */
async function updateSnapshot(snapshotId, data) {
    await supabaseRequest(`/gmc_snapshots?id=eq.${snapshotId}`, 'PATCH', data);
}

/**
 * Insert products in batches
 */
async function insertProducts(products) {
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await supabaseRequest('/gmc_products', 'POST', batch);
        console.log(`  Inserted products ${i + 1} to ${Math.min(i + batchSize, products.length)}`);
    }
}

/**
 * Insert issues in batches
 */
async function insertIssues(issues) {
    if (issues.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        await supabaseRequest('/gmc_product_issues', 'POST', batch);
        console.log(`  Inserted issues ${i + 1} to ${Math.min(i + batchSize, issues.length)}`);
    }
}

/**
 * Insert account issues
 */
async function insertAccountIssues(snapshotId, accountStatus) {
    if (!accountStatus.accountLevelIssues) return;

    const issues = accountStatus.accountLevelIssues.map(issue => ({
        snapshot_id: snapshotId,
        issue_type: issue.id,
        severity: issue.severity,
        title: issue.title,
        description: issue.detail,
        documentation_url: issue.documentation
    }));

    if (issues.length > 0) {
        await supabaseRequest('/gmc_account_issues', 'POST', issues);
    }
}

/**
 * Parse GMC product status into our format
 */
function parseProductStatus(status, snapshotId, bcProductMap) {
    // Extract offer ID (SKU) from product ID
    // Format is usually: online:en:AU:SKU
    const parts = status.productId.split(':');
    const offerId = parts.length > 3 ? parts.slice(3).join(':') : status.productId;

    // Find matching BC product
    const bcProduct = bcProductMap.get(offerId) || bcProductMap.get(offerId.toUpperCase()) || bcProductMap.get(offerId.toLowerCase());

    // Determine overall status
    let overallStatus = 'pending';
    if (status.destinationStatuses) {
        const hasApproved = status.destinationStatuses.some(d => d.status === 'approved');
        const hasDisapproved = status.destinationStatuses.some(d => d.status === 'disapproved');

        if (hasDisapproved) {
            overallStatus = 'disapproved';
        } else if (hasApproved) {
            overallStatus = 'approved';
        }
    }

    return {
        snapshot_id: snapshotId,
        gmc_product_id: status.productId,
        offer_id: offerId,
        title: status.title,
        link: status.link,
        status: overallStatus,
        destinations: JSON.stringify(status.destinationStatuses || []),
        google_product_category: status.googleExpirationDate ? null : null, // Will be populated from product data
        bc_product_id: bcProduct?.bc_product_id || null,
        bc_sku: bcProduct?.sku || null,
        bc_match_status: bcProduct ? 'matched' : 'unmatched'
    };
}

/**
 * Parse product issues
 */
function parseProductIssues(status, snapshotId) {
    const issues = [];

    if (status.itemLevelIssues) {
        for (const issue of status.itemLevelIssues) {
            issues.push({
                snapshot_id: snapshotId,
                gmc_product_id: status.productId,
                offer_id: status.productId.split(':').slice(3).join(':'),
                issue_code: issue.code,
                issue_type: issue.servability === 'disapproved' ? 'error' : 'warning',
                severity: issue.servability === 'disapproved' ? 'critical' : 'medium',
                attribute: issue.attributeName,
                description: issue.description,
                detail: issue.detail,
                documentation_url: issue.documentation,
                servability: issue.servability,
                affected_destinations: issue.applicableCountries || []
            });
        }
    }

    return issues;
}

/**
 * Main snapshot function
 */
async function runSnapshot() {
    const startTime = Date.now();
    let snapshotId = null;

    try {
        console.log('='.repeat(60));
        console.log('Google Merchant Center Snapshot');
        console.log(`Started: ${new Date().toISOString()}`);
        console.log('='.repeat(60));

        // Step 1: Get credentials
        console.log('\n[1/7] Loading credentials...');
        const [merchantId, clientId, clientSecret, refreshToken] = await Promise.all([
            getCredential('boo', 'google_merchant_id'),
            getCredential('global', 'google_ads_client_id'),
            getCredential('global', 'google_ads_client_secret'),
            getCredential('boo', 'google_ads_refresh_token')
        ]);
        console.log('  Credentials loaded successfully');

        // Step 2: Initialize GMC client
        console.log('\n[2/7] Initializing GMC client...');
        const gmc = new GMCClient({
            merchantId,
            clientId,
            clientSecret,
            refreshToken
        });
        console.log(`  Merchant ID: ${merchantId}`);

        // Step 3: Create snapshot record
        console.log('\n[3/7] Creating snapshot record...');
        const snapshot = await createSnapshot();
        snapshotId = snapshot.id;
        console.log(`  Snapshot ID: ${snapshotId}`);

        // Step 4: Get BigCommerce products for cross-reference
        console.log('\n[4/7] Loading BigCommerce products...');
        const bcProducts = await getBigCommerceProducts();
        const bcProductMap = new Map();
        bcProducts.forEach(p => {
            if (p.sku) {
                bcProductMap.set(p.sku, p);
                bcProductMap.set(p.sku.toUpperCase(), p);
                bcProductMap.set(p.sku.toLowerCase(), p);
            }
        });
        console.log(`  Loaded ${bcProducts.length} BigCommerce products`);

        // Step 5: Fetch GMC product statuses
        console.log('\n[5/7] Fetching GMC product statuses...');
        const productStatuses = await gmc.listProductStatuses();
        console.log(`  Found ${productStatuses.length} products in GMC`);

        // Step 6: Process and store products
        console.log('\n[6/7] Processing products and issues...');

        const products = [];
        const allIssues = [];
        let approvedCount = 0;
        let disapprovedCount = 0;
        let pendingCount = 0;

        for (const status of productStatuses) {
            const product = parseProductStatus(status, snapshotId, bcProductMap);
            products.push(product);

            // Count by status
            if (product.status === 'approved') approvedCount++;
            else if (product.status === 'disapproved') disapprovedCount++;
            else pendingCount++;

            // Parse issues
            const issues = parseProductIssues(status, snapshotId);
            allIssues.push(...issues);
        }

        console.log(`  Approved: ${approvedCount}`);
        console.log(`  Disapproved: ${disapprovedCount}`);
        console.log(`  Pending: ${pendingCount}`);
        console.log(`  Total issues: ${allIssues.length}`);

        // Insert products
        console.log('\n  Inserting products...');
        await insertProducts(products);

        // Insert issues
        console.log('\n  Inserting issues...');
        await insertIssues(allIssues);

        // Step 7: Get account status and update snapshot
        console.log('\n[7/7] Fetching account status and finalizing...');
        try {
            const accountStatus = await gmc.getAccountStatus();
            await insertAccountIssues(snapshotId, accountStatus);
        } catch (e) {
            console.log(`  Warning: Could not fetch account status: ${e.message}`);
        }

        // Calculate BC comparison stats
        const matchedProducts = products.filter(p => p.bc_match_status === 'matched').length;
        const unmatchedInGmc = products.filter(p => p.bc_match_status === 'unmatched').length;
        const gmcSkus = new Set(products.map(p => p.offer_id?.toUpperCase()));
        const missingFromGmc = bcProducts.filter(p =>
            p.is_visible &&
            p.availability === 'available' &&
            p.sku &&
            !gmcSkus.has(p.sku.toUpperCase())
        ).length;

        // Update snapshot with final counts
        const duration = Math.round((Date.now() - startTime) / 1000);
        await updateSnapshot(snapshotId, {
            status: 'completed',
            total_products: products.length,
            approved_count: approvedCount,
            disapproved_count: disapprovedCount,
            pending_count: pendingCount,
            total_issues: allIssues.length,
            error_count: allIssues.filter(i => i.issue_type === 'error').length,
            warning_count: allIssues.filter(i => i.issue_type === 'warning').length,
            bc_product_count: bcProducts.length,
            matched_products: matchedProducts,
            unmatched_in_gmc: unmatchedInGmc,
            missing_from_gmc: missingFromGmc,
            duration_seconds: duration
        });

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('SNAPSHOT COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total Products:     ${products.length}`);
        console.log(`  - Approved:       ${approvedCount} (${(approvedCount/products.length*100).toFixed(1)}%)`);
        console.log(`  - Disapproved:    ${disapprovedCount} (${(disapprovedCount/products.length*100).toFixed(1)}%)`);
        console.log(`  - Pending:        ${pendingCount}`);
        console.log(`Total Issues:       ${allIssues.length}`);
        console.log(`BC Cross-Reference:`);
        console.log(`  - Matched:        ${matchedProducts}`);
        console.log(`  - Unmatched GMC:  ${unmatchedInGmc}`);
        console.log(`  - Missing GMC:    ${missingFromGmc}`);
        console.log(`Duration:           ${duration}s`);
        console.log('='.repeat(60));

        return { success: true, snapshotId };

    } catch (error) {
        console.error('\nERROR:', error.message);

        // Update snapshot as failed if we have an ID
        if (snapshotId) {
            await updateSnapshot(snapshotId, {
                status: 'failed',
                error_message: error.message,
                duration_seconds: Math.round((Date.now() - startTime) / 1000)
            });
        }

        return { success: false, error: error.message };
    }
}

// Run if called directly
if (require.main === module) {
    runSnapshot()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { runSnapshot };
