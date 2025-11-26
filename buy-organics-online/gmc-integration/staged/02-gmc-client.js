/**
 * Google Merchant Center API Client
 * Handles OAuth token refresh and API calls
 */

const https = require('https');

class GMCClient {
    constructor(config) {
        this.merchantId = config.merchantId;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.refreshToken = config.refreshToken;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Refresh OAuth access token
     */
    async refreshAccessToken() {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            }).toString();

            const options = {
                hostname: 'oauth2.googleapis.com',
                port: 443,
                path: '/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const result = JSON.parse(data);
                        this.accessToken = result.access_token;
                        this.tokenExpiry = Date.now() + (result.expires_in * 1000) - 60000; // Refresh 1 min early
                        resolve(result.access_token);
                    } else {
                        reject(new Error(`Token refresh failed: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Ensure we have a valid access token
     */
    async ensureToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            await this.refreshAccessToken();
        }
        return this.accessToken;
    }

    /**
     * Make an API request to Google Merchant Center
     */
    async apiRequest(path, method = 'GET', body = null) {
        await this.ensureToken();

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'shoppingcontent.googleapis.com',
                port: 443,
                path: `/content/v2.1/${this.merchantId}${path}`,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
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
                        reject(new Error(`API Error (${res.statusCode}): ${data}`));
                    }
                });
            });

            req.on('error', reject);

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    /**
     * List all products with pagination
     */
    async listAllProducts() {
        const allProducts = [];
        let pageToken = null;

        do {
            const path = `/products?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await this.apiRequest(path);

            if (response.resources) {
                allProducts.push(...response.resources);
            }

            pageToken = response.nextPageToken;

            // Log progress
            console.log(`  Fetched ${allProducts.length} products...`);

        } while (pageToken);

        return allProducts;
    }

    /**
     * Get product statuses with issues
     */
    async listProductStatuses() {
        const allStatuses = [];
        let pageToken = null;

        do {
            const path = `/productstatuses?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await this.apiRequest(path);

            if (response.resources) {
                allStatuses.push(...response.resources);
            }

            pageToken = response.nextPageToken;

            // Log progress
            console.log(`  Fetched ${allStatuses.length} product statuses...`);

        } while (pageToken);

        return allStatuses;
    }

    /**
     * Get account status (account-level issues)
     */
    async getAccountStatus() {
        return this.apiRequest('/accountstatuses/self');
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId) {
        return this.apiRequest(`/products/${encodeURIComponent(productId)}`);
    }

    /**
     * Get a single product status by ID
     */
    async getProductStatus(productId) {
        return this.apiRequest(`/productstatuses/${encodeURIComponent(productId)}`);
    }
}

module.exports = GMCClient;
