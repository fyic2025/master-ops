// SEO Fix Prompt Generator
// Generates prompts for Claude Code to fix SEO issues

export interface SeoIssue {
  id: string
  business: string
  url: string
  issue_type: string
  severity: 'critical' | 'warning'
  status: string
  fix_status?: 'pending' | 'in_progress' | 'failed' | 'resolved'
  fix_attempt_count?: number
  last_fix_attempt_at?: string | null
  linked_task_id?: string | null
  first_detected: string
  last_checked: string
  detection_reason?: string | null
  traffic_before?: number | null
  traffic_after?: number | null
  api_coverage_state?: string | null
  api_page_fetch_state?: string | null
}

const issueTypeLabels: Record<string, string> = {
  not_found_404: '404 Not Found',
  soft_404: 'Soft 404',
  server_error: 'Server Error',
  blocked_robots: 'Blocked by robots.txt',
  blocked_noindex: 'Blocked by noindex',
  crawled_not_indexed: 'Crawled but Not Indexed',
}

const issueTypeDescriptions: Record<string, string> = {
  not_found_404: 'The page returns a 404 status code. The URL may have been deleted, moved, or never existed.',
  soft_404: 'The page exists but returns content that appears to be a 404 (thin content, error messages). Google treats this as a 404.',
  server_error: 'The server returns 5xx errors when Google tries to access this URL.',
  blocked_robots: 'The URL is blocked by robots.txt rules, preventing Google from crawling it.',
  blocked_noindex: 'The page has a noindex meta tag or HTTP header, telling Google not to index it.',
  crawled_not_indexed: 'Google has crawled the page but decided not to include it in the index, usually due to low quality or duplicate content.',
}

function isAutoFixable(issueType: string): boolean {
  // These can potentially be fixed automatically
  const autoFixableTypes = ['not_found_404', 'blocked_robots', 'blocked_noindex']
  return autoFixableTypes.includes(issueType)
}

function getFixInstructions(issueType: string, business: string): string {
  const baseUrl = business === 'boo'
    ? 'https://www.buyorganicsonline.com.au'
    : business === 'teelixir'
    ? 'https://teelixir.com'
    : business === 'elevate'
    ? 'https://elevatewholesale.com.au'
    : 'https://redhillfresh.com.au'

  switch (issueType) {
    case 'not_found_404':
      return `## Fix Strategy: 404 Not Found

### Step 1: Investigate
1. Check if the product/page was intentionally deleted
2. Search BigCommerce/Shopify admin for the product/category
3. Check if content was moved to a new URL

### Step 2: Choose Resolution
**Option A - Add 301 Redirect** (if content moved):
\`\`\`bash
# For BigCommerce (BOO):
# Add redirect via BigCommerce admin > Marketing > 301 Redirects
# Old URL: /discontinued-product/
# New URL: /replacement-product/ or category page

# For Shopify (Teelixir/Elevate):
# Settings > Navigation > URL Redirects
\`\`\`

**Option B - Update Internal Links** (if page shouldn't exist):
1. Search codebase for links to this URL
2. Update or remove broken links
3. Update sitemap if manually managed

### Step 3: Verify
1. Visit the URL in browser - should redirect or show appropriate content
2. Use: \`curl -I ${baseUrl}/the-url/\` to check status code
3. Request re-indexing in GSC if needed`

    case 'soft_404':
      return `## Fix Strategy: Soft 404

### Step 1: Investigate
1. Visit the page - check if content is thin/empty
2. Check if it's a search results page with no results
3. Check if product is out of stock showing empty page

### Step 2: Choose Resolution
**Option A - Add Real Content** (if page should exist):
1. Add meaningful product description, images, etc.
2. Ensure page has unique, valuable content
3. Add internal links to/from related pages

**Option B - Return Proper 404** (if page shouldn't exist):
1. Configure server to return 404 status code
2. Remove from sitemap
3. Add redirect to relevant category if appropriate

### Step 3: Verify
1. Check page has substantial content (500+ words for category pages)
2. Use: \`curl -I ${baseUrl}/the-url/\` - should return 200 with content
3. Request re-indexing in GSC`

    case 'server_error':
      return `## Fix Strategy: Server Error (5xx)

### Step 1: Investigate
1. Check server logs for error details
2. Test URL directly: \`curl -v ${baseUrl}/the-url/\`
3. Check if issue is intermittent or consistent

### Step 2: Fix
1. Debug the underlying server issue
2. Check for database connection issues
3. Check for PHP/Node errors in logs
4. Verify hosting resources (memory, CPU)

### Step 3: Verify
1. URL returns 200 status consistently
2. Monitor for 24 hours to ensure stability
3. Request re-indexing in GSC`

    case 'blocked_robots':
      return `## Fix Strategy: Blocked by robots.txt

### Step 1: Investigate
1. Check robots.txt rules: ${baseUrl}/robots.txt
2. Identify which rule is blocking this URL
3. Determine if block is intentional

### Step 2: Fix (if should be indexed)
1. Edit robots.txt to allow the URL pattern
2. Be careful not to accidentally allow sensitive URLs
3. Test with Google's robots.txt tester in GSC

### Step 3: Verify
1. Use GSC URL Inspection tool
2. Request re-indexing
3. Monitor coverage in GSC over next few days`

    case 'blocked_noindex':
      return `## Fix Strategy: Blocked by noindex

### Step 1: Investigate
1. Check page source for: \`<meta name="robots" content="noindex">\`
2. Check HTTP headers for: \`X-Robots-Tag: noindex\`
3. Determine if this was intentional

### Step 2: Fix (if should be indexed)
**For BigCommerce:**
1. Edit page/product in admin
2. Look for SEO settings > "Page Visibility" or similar
3. Remove noindex setting

**For Shopify:**
1. Check theme Liquid templates for noindex logic
2. Edit product/page metafields if applicable

### Step 3: Verify
1. View page source - no noindex tag
2. Check headers: \`curl -I ${baseUrl}/the-url/\`
3. Request re-indexing in GSC`

    case 'crawled_not_indexed':
      return `## Fix Strategy: Crawled but Not Indexed

### Step 1: Analyze
1. Check content quality - is it thin, duplicate, or low-value?
2. Check internal linking - are there links to this page?
3. Check page authority signals

### Step 2: Improve
1. **Add Unique Content**: 500+ words of original content
2. **Improve Internal Links**: Add links from high-traffic pages
3. **Add Schema Markup**: Product, Article, or appropriate schema
4. **Improve Meta Tags**: Unique title and description
5. **Add Images**: Original, optimized images with alt text

### Step 3: Request Indexing
1. Use GSC URL Inspection > Request Indexing
2. Build backlinks if possible
3. Monitor for 2-4 weeks`

    default:
      return `## Fix Strategy: General SEO Issue

1. Investigate the specific issue
2. Research best practices for this issue type
3. Apply appropriate fix
4. Verify in GSC
5. Monitor for resolution`
  }
}

export function generateSeoFixPrompt(issue: SeoIssue): string {
  const issueLabel = issueTypeLabels[issue.issue_type] || issue.issue_type
  const description = issueTypeDescriptions[issue.issue_type] || 'Unknown issue type'
  const autoFixable = isAutoFixable(issue.issue_type)

  const trafficInfo = issue.traffic_before && issue.traffic_after !== undefined
    ? `\n**Traffic Impact**: ${issue.traffic_before} → ${issue.traffic_after} impressions (${Math.round(((issue.traffic_after - issue.traffic_before) / issue.traffic_before) * 100)}%)`
    : ''

  return `## SEO Fix Request

**Issue Type**: ${issueLabel}
**Severity**: ${issue.severity.toUpperCase()}
**URL**: ${issue.url}
**Business**: ${issue.business}
**Auto-Fixable**: ${autoFixable ? 'Yes' : 'Manual Review Required'}

### Issue Description
${description}
${trafficInfo}

**First Detected**: ${new Date(issue.first_detected).toLocaleDateString()}
**Last Checked**: ${new Date(issue.last_checked).toLocaleDateString()}
${issue.detection_reason ? `**Detection Reason**: ${issue.detection_reason}` : ''}
${issue.api_coverage_state ? `**GSC Coverage State**: ${issue.api_coverage_state}` : ''}
${issue.api_page_fetch_state ? `**GSC Fetch State**: ${issue.api_page_fetch_state}` : ''}

---

${getFixInstructions(issue.issue_type, issue.business)}

---

### After Fixing

1. Verify the fix is applied correctly
2. Use GSC URL Inspection to check status
3. Request re-indexing if needed
4. Update the SEO dashboard issue status
5. Monitor for 1-2 weeks for Google to re-crawl

**Dashboard Link**: https://ops.growthcohq.com/${issue.business}/seo
`
}

export function generateBatchSeoFixPrompt(issues: SeoIssue[]): string {
  // Group by issue type
  const byType: Record<string, SeoIssue[]> = {}
  for (const issue of issues) {
    if (!byType[issue.issue_type]) byType[issue.issue_type] = []
    byType[issue.issue_type].push(issue)
  }

  const typeSummary = Object.entries(byType)
    .map(([type, typeIssues]) => `- **${issueTypeLabels[type] || type}**: ${typeIssues.length} URLs`)
    .join('\n')

  const urlList = issues.map((issue, i) => {
    return `${i + 1}. \`${issue.url}\`
   - Type: ${issueTypeLabels[issue.issue_type] || issue.issue_type}
   - Severity: ${issue.severity}
   - Detected: ${new Date(issue.first_detected).toLocaleDateString()}`
  }).join('\n\n')

  const business = issues[0]?.business || 'boo'

  return `## SEO Batch Fix Request

**Total Issues**: ${issues.length}
**Business**: ${business}

### Issue Summary
${typeSummary}

---

## URLs to Fix

${urlList}

---

### Batch Fix Strategy

1. **Group by Type**: Fix all issues of the same type together
2. **Priority Order**: 404s > Soft 404s > Server Errors > Blocks
3. **Verify Each**: Check each URL after fixing
4. **Mark Progress**: Update dashboard as you complete fixes

### Quick Commands

\`\`\`bash
# Check URL status
curl -I https://www.buyorganicsonline.com.au/url-path/

# Check robots.txt
curl https://www.buyorganicsonline.com.au/robots.txt

# View page source (check for noindex)
curl -s https://www.buyorganicsonline.com.au/url-path/ | grep -i "noindex"
\`\`\`

---

### After Completing Batch

1. Run verification checks on all fixed URLs
2. Report: How many fixed, any that need manual review
3. Request re-indexing in GSC for critical pages
4. Schedule follow-up check in 1-2 weeks

**Dashboard Link**: https://ops.growthcohq.com/${business}/seo
`
}

export function getRecommendedAction(issue: SeoIssue): string {
  switch (issue.issue_type) {
    case 'not_found_404':
      return 'Add 301 redirect to similar product or category page'
    case 'soft_404':
      return 'Add meaningful content or return proper 404 status'
    case 'server_error':
      return 'Check server logs and fix underlying error'
    case 'blocked_robots':
      return 'Review robots.txt rules and unblock if needed'
    case 'blocked_noindex':
      return 'Remove noindex tag if page should be indexed'
    case 'crawled_not_indexed':
      return 'Improve content quality and internal linking'
    default:
      return 'Investigate and apply appropriate fix'
  }
}
