const https = require('https');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';

function listThemes() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Fetching themes from BigCommerce...\n');

        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${STORE_HASH}/v3/themes`,
            method: 'GET',
            headers: {
                'X-Auth-Token': ACCESS_TOKEN,
                'Accept': 'application/json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    const themes = response.data;

                    console.log(`Found ${themes.length} themes:\n`);

                    themes.forEach(theme => {
                        const status = theme.is_active ? '✅ ACTIVE' : '  ';
                        console.log(`${status} ${theme.name}`);
                        console.log(`   UUID: ${theme.uuid}`);
                        console.log(`   Version: ${theme.version || 'N/A'}`);
                        console.log(`   Updated: ${new Date(theme.updated_at).toLocaleString()}`);
                        console.log('');
                    });

                    const activeTheme = themes.find(t => t.is_active);
                    if (activeTheme) {
                        console.log('\n📌 Currently Active Theme:');
                        console.log(`   Name: ${activeTheme.name}`);
                        console.log(`   UUID: ${activeTheme.uuid}`);
                        console.log(`   Version: ${activeTheme.version || 'N/A'}`);
                    }

                    resolve(themes);
                } else {
                    reject(new Error(`Failed to get themes: ${res.statusCode} ${data}`));
                }
            });
        }).on('error', reject);
    });
}

listThemes().catch(error => console.error('❌ Error:', error.message));
