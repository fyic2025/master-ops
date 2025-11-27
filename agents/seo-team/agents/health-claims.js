/**
 * Health Claims Agent
 *
 * Purpose: Scan content for health claims and manage compliance
 * - Detect health claims in product descriptions
 * - Identify claims requiring citations
 * - Research PubMed for supporting evidence
 * - Flag high-risk claims for review
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const https = require('https');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// High-risk claim patterns (TGA/FDA regulated)
const HIGH_RISK_PATTERNS = [
    /cure[sd]?\s/i,
    /treat[s]?\s/i,
    /prevent[s]?\s/i,
    /diagnos/i,
    /heal[s]?\s/i,
    /cancer/i,
    /diabetes/i,
    /heart\s+disease/i,
    /covid/i,
    /coronavirus/i,
    /tumou?r/i,
    /clinical(ly)?\s+proven/i,
    /scientifically\s+proven/i,
    /guaranteed/i
];

// Medium-risk claim patterns
const MEDIUM_RISK_PATTERNS = [
    /boost[s]?\s+(your\s+)?immun/i,
    /anti-?inflam/i,
    /anti-?oxidant/i,
    /detox/i,
    /weight\s+loss/i,
    /burn[s]?\s+fat/i,
    /lower[s]?\s+(blood\s+)?pressure/i,
    /cholesterol/i,
    /blood\s+sugar/i,
    /improve[s]?\s+(your\s+)?memory/i,
    /increase[s]?\s+energy/i,
    /reduce[s]?\s+stress/i,
    /help[s]?\s+you\s+sleep/i,
    /anti-?aging/i,
    /reverse[s]?\s+aging/i
];

// Allowed/safe claims (generally recognized)
const SAFE_PATTERNS = [
    /source\s+of\s+(vitamin|mineral|protein|fiber)/i,
    /contains\s+(vitamin|mineral|antioxidant)/i,
    /rich\s+in/i,
    /organic/i,
    /natural/i,
    /certified/i,
    /traditionally\s+used/i,
    /may\s+help/i,
    /may\s+support/i
];

/**
 * Analyze text for health claims using AI
 */
async function analyzeClaimsWithAI(text, productName) {
    const prompt = `Analyze this product description for health claims. For each claim found, classify its risk level.

Product: ${productName}
Description:
${text}

Return a JSON array of claims found:
[
  {
    "claim_text": "exact text of the claim",
    "claim_type": "efficacy|structure_function|nutrient|general_wellness",
    "severity": "high|medium|low",
    "needs_citation": true/false,
    "suggested_modification": "safer alternative wording if needed"
  }
]

Guidelines:
- HIGH severity: Disease claims, cure/treat/prevent, guaranteed results
- MEDIUM severity: Specific health benefits, boost immunity, weight loss, detox
- LOW severity: General wellness, "may help", "traditionally used"
- Structure/function claims are usually acceptable with citations
- Nutrient claims (contains vitamin X) are generally safe

Return only valid JSON array.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        });

        const content = response.choices[0].message.content;
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('AI analysis error:', error.message);
        return [];
    }
}

/**
 * Quick pattern-based claim detection
 */
function detectClaimsQuick(text) {
    const claims = [];

    // Check high-risk patterns
    for (const pattern of HIGH_RISK_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            // Get surrounding context
            const index = text.indexOf(match[0]);
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + match[0].length + 50);
            const context = text.substring(start, end);

            claims.push({
                claim_text: context.trim(),
                pattern_matched: pattern.source,
                severity: 'high',
                needs_citation: true
            });
        }
    }

    // Check medium-risk patterns
    for (const pattern of MEDIUM_RISK_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const index = text.indexOf(match[0]);
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + match[0].length + 50);
            const context = text.substring(start, end);

            claims.push({
                claim_text: context.trim(),
                pattern_matched: pattern.source,
                severity: 'medium',
                needs_citation: true
            });
        }
    }

    return claims;
}

/**
 * Search PubMed for supporting research
 */
async function searchPubMed(query, limit = 5) {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmax=${limit}&retmode=json`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const pmids = result.esearchresult?.idlist || [];
                    resolve(pmids);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Fetch PubMed article details
 */
async function fetchPubMedArticle(pmid) {
    return new Promise((resolve, reject) => {
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Simple XML parsing for key fields
                const title = data.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/s)?.[1] || '';
                const abstract = data.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/s)?.[1] || '';
                const journal = data.match(/<Title>(.*?)<\/Title>/)?.[1] || '';
                const year = data.match(/<Year>(\d{4})<\/Year>/)?.[1] || '';

                resolve({
                    pmid,
                    title: title.replace(/<[^>]+>/g, ''),
                    abstract: abstract.replace(/<[^>]+>/g, '').substring(0, 500),
                    journal,
                    year
                });
            });
        }).on('error', reject);
    });
}

/**
 * Research evidence for a health claim
 */
async function researchClaim(claim, ingredient) {
    console.log(`  Researching: "${claim.claim_text.substring(0, 50)}..."`);

    // Build search query
    const searchTerms = [];
    if (ingredient) searchTerms.push(ingredient);

    // Extract key terms from claim
    const keyTerms = claim.claim_text
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !['helps', 'support', 'improve', 'contains'].includes(w.toLowerCase()));

    searchTerms.push(...keyTerms.slice(0, 3));

    const query = searchTerms.join(' ') + ' randomized controlled trial';

    try {
        const pmids = await searchPubMed(query);
        console.log(`    Found ${pmids.length} PubMed articles`);

        const articles = [];
        for (const pmid of pmids.slice(0, 3)) {
            const article = await fetchPubMedArticle(pmid);
            articles.push(article);
            // Rate limit
            await new Promise(r => setTimeout(r, 350));
        }

        return articles;
    } catch (error) {
        console.error(`    PubMed search error: ${error.message}`);
        return [];
    }
}

/**
 * Scan products for health claims
 */
async function scanProducts(options = {}) {
    const limit = options.limit || 100;
    const useAI = options.useAI !== false;
    const researchEvidence = options.research || false;

    console.log('='.repeat(60));
    console.log('HEALTH CLAIMS AGENT - Scanning Products');
    console.log('='.repeat(60));

    // Get products with descriptions that haven't been scanned
    const { data: products, error } = await supabase
        .from('seo_products')
        .select(`
            id,
            ecommerce_product_id,
            has_health_claims,
            health_claims_status,
            ecommerce_products!inner(
                id,
                name,
                metadata
            )
        `)
        .is('health_claims_status', null)
        .limit(limit);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`\nScanning ${products.length} products...`);

    const stats = {
        scanned: 0,
        with_claims: 0,
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0,
        total_claims: 0
    };

    for (const product of products) {
        const ep = product.ecommerce_products;
        const description = ep.metadata?.description || '';

        if (!description || description.length < 20) {
            // No meaningful description to scan
            await supabase
                .from('seo_products')
                .update({
                    has_health_claims: false,
                    health_claims_status: 'scanned_clean'
                })
                .eq('id', product.id);
            stats.scanned++;
            continue;
        }

        // Detect claims
        let claims = [];

        if (useAI) {
            claims = await analyzeClaimsWithAI(description, ep.name);
        } else {
            claims = detectClaimsQuick(description);
        }

        stats.scanned++;

        if (claims.length === 0) {
            await supabase
                .from('seo_products')
                .update({
                    has_health_claims: false,
                    health_claims_status: 'scanned_clean'
                })
                .eq('id', product.id);
            continue;
        }

        stats.with_claims++;
        stats.total_claims += claims.length;

        // Determine overall status based on highest severity
        let overallStatus = 'needs_review';
        let hasHigh = false;

        for (const claim of claims) {
            if (claim.severity === 'high') {
                stats.high_severity++;
                hasHigh = true;
            } else if (claim.severity === 'medium') {
                stats.medium_severity++;
            } else {
                stats.low_severity++;
            }

            // Research evidence if requested
            let pubmedIds = [];
            if (researchEvidence && (claim.severity === 'high' || claim.severity === 'medium')) {
                const articles = await researchClaim(claim, ep.name);
                pubmedIds = articles.map(a => a.pmid);

                // Cache articles
                for (const article of articles) {
                    await supabase.from('seo_pubmed_research').upsert({
                        pmid: article.pmid,
                        title: article.title,
                        abstract: article.abstract,
                        journal: article.journal,
                        publication_date: article.year ? `${article.year}-01-01` : null
                    }, { onConflict: 'pmid' });
                }
            }

            // Insert claim record
            await supabase.from('seo_health_claims').insert({
                source_type: 'product',
                source_id: product.ecommerce_product_id,
                claim_text: claim.claim_text,
                claim_type: claim.claim_type || 'unknown',
                compliance_status: hasHigh ? 'flagged' : 'needs_citation',
                severity: claim.severity,
                pubmed_ids: pubmedIds
            });
        }

        // Update product
        await supabase
            .from('seo_products')
            .update({
                has_health_claims: true,
                health_claims_status: hasHigh ? 'flagged' : 'needs_citation'
            })
            .eq('id', product.id);

        // Log progress
        if (stats.scanned % 20 === 0) {
            console.log(`  Scanned ${stats.scanned}/${products.length}...`);
        }
    }

    // Log activity
    await supabase.from('seo_agent_logs').insert({
        agent_name: 'health-claims',
        action: 'scan_completed',
        details: stats,
        status: 'completed'
    });

    console.log('\n' + '='.repeat(60));
    console.log('HEALTH CLAIMS SCAN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Products scanned: ${stats.scanned}`);
    console.log(`Products with claims: ${stats.with_claims}`);
    console.log(`Total claims found: ${stats.total_claims}`);
    console.log(`High severity: ${stats.high_severity}`);
    console.log(`Medium severity: ${stats.medium_severity}`);
    console.log(`Low severity: ${stats.low_severity}`);

    return stats;
}

/**
 * Get flagged claims for review
 */
async function getFlaggedClaims(options = {}) {
    const limit = options.limit || 50;

    const { data: claims, error } = await supabase
        .from('seo_health_claims')
        .select(`
            id,
            claim_text,
            claim_type,
            severity,
            compliance_status,
            pubmed_ids,
            created_at
        `)
        .in('compliance_status', ['flagged', 'needs_citation'])
        .order('severity', { ascending: true })  // high first
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error:', error);
        return null;
    }

    return claims;
}

/**
 * Update claim status after review
 */
async function updateClaimStatus(claimId, status, notes = null) {
    const { error } = await supabase
        .from('seo_health_claims')
        .update({
            compliance_status: status,
            notes,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', claimId);

    return !error;
}

/**
 * Get health claims summary
 */
async function getClaimsStats() {
    const { data: claims } = await supabase
        .from('seo_health_claims')
        .select('compliance_status, severity');

    if (!claims) return null;

    const stats = {
        total: claims.length,
        by_status: {},
        by_severity: {}
    };

    for (const claim of claims) {
        stats.by_status[claim.compliance_status] = (stats.by_status[claim.compliance_status] || 0) + 1;
        stats.by_severity[claim.severity] = (stats.by_severity[claim.severity] || 0) + 1;
    }

    return stats;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'scan';
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100');
    const noAI = args.includes('--no-ai');
    const research = args.includes('--research');

    if (command === 'scan') {
        scanProducts({ limit, useAI: !noAI, research }).then(() => console.log('\nDone!'));
    } else if (command === 'flagged') {
        getFlaggedClaims({ limit }).then(claims => {
            console.log('Flagged Claims:');
            for (const claim of claims || []) {
                console.log(`\n[${claim.severity.toUpperCase()}] ${claim.claim_text.substring(0, 100)}...`);
                console.log(`  Status: ${claim.compliance_status}`);
                if (claim.pubmed_ids?.length) {
                    console.log(`  PubMed: ${claim.pubmed_ids.join(', ')}`);
                }
            }
        });
    } else if (command === 'stats') {
        getClaimsStats().then(stats => {
            console.log('Health Claims Statistics:');
            console.log(JSON.stringify(stats, null, 2));
        });
    } else {
        console.log('Usage: node health-claims.js [command] [options]');
        console.log('Commands: scan, flagged, stats');
        console.log('Options: --limit=N, --no-ai, --research');
    }
}

module.exports = {
    scanProducts,
    getFlaggedClaims,
    updateClaimStatus,
    getClaimsStats,
    researchClaim,
    searchPubMed
};
