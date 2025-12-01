# Troubleshooting - GSC Expert

## Decision Trees

### Traffic Drop Investigation

```
Traffic dropped?
├── How much?
│   ├── >50% → CRITICAL
│   │   ├── Check for manual action
│   │   ├── Check for algorithm update
│   │   ├── Check for site outage
│   │   └── Review coverage report
│   │
│   ├── 20-50% → WARNING
│   │   ├── Compare queries before/after
│   │   ├── Check position changes
│   │   ├── Review recent site changes
│   │   └── Check competitor activity
│   │
│   └── <20% → MONITOR
│       ├── May be seasonality
│       ├── Check day-of-week patterns
│       └── Wait 7 days for trend
│
├── Sudden or gradual?
│   ├── Sudden → Look for event
│   │   ├── Site change/deploy
│   │   ├── Algorithm update
│   │   ├── Technical issue
│   │   └── Manual action
│   │
│   └── Gradual → Trend issue
│       ├── Content quality
│       ├── Competition
│       ├── Seasonality
│       └── Technical debt
│
└── Which queries affected?
    ├── All queries → Site-wide issue
    ├── Specific category → Category issue
    └── Single query → Query-specific issue
```

---

### Indexing Issue Resolution

```
Pages not indexed?
├── What does coverage report say?
│   │
│   ├── "Discovered - currently not indexed"
│   │   ├── Page found but deemed low value
│   │   ├── Solutions:
│   │   │   ├── Improve content quality
│   │   │   ├── Add internal links
│   │   │   ├── Build external links
│   │   │   └── Consolidate thin pages
│   │
│   ├── "Crawled - currently not indexed"
│   │   ├── Page crawled but not indexed
│   │   ├── Google chose not to index
│   │   ├── Solutions:
│   │   │   ├── Significantly improve content
│   │   │   ├── Make page more unique
│   │   │   ├── Add schema markup
│   │   │   └── Get quality backlinks
│   │
│   ├── "Duplicate without user-selected canonical"
│   │   ├── Multiple URLs, Google chose canonical
│   │   ├── Solutions:
│   │   │   ├── Add canonical tag to preferred URL
│   │   │   ├── 301 redirect duplicates
│   │   │   └── Use URL parameters in GSC
│   │
│   ├── "Duplicate, Google chose different canonical"
│   │   ├── Your canonical ignored
│   │   ├── Solutions:
│   │   │   ├── Ensure canonical is correct
│   │   │   ├── Check for conflicting signals
│   │   │   ├── Consolidate content
│   │   │   └── 301 redirect if appropriate
│   │
│   ├── "Blocked by robots.txt"
│   │   ├── Robots.txt preventing crawl
│   │   ├── Solutions:
│   │   │   ├── Update robots.txt
│   │   │   ├── Wait for recrawl
│   │   │   └── Request indexing
│   │
│   ├── "Blocked by noindex"
│   │   ├── Page has noindex meta tag
│   │   ├── Solutions:
│   │   │   ├── Remove noindex if page should be indexed
│   │   │   ├── Check for plugin adding noindex
│   │   │   └── Verify robots meta tag
│   │
│   ├── "Not found (404)"
│   │   ├── Page returns 404
│   │   ├── Solutions:
│   │   │   ├── Restore page if deleted accidentally
│   │   │   ├── 301 redirect to relevant page
│   │   │   └── Remove internal links to 404s
│   │
│   ├── "Soft 404"
│   │   ├── Page returns 200 but looks empty
│   │   ├── Solutions:
│   │   │   ├── Return proper 404 status
│   │   │   ├── Add meaningful content
│   │   │   └── Redirect to relevant page
│   │
│   └── "Server error (5xx)"
│       ├── Server returning errors
│       ├── Solutions:
│           ├── Fix server issues
│           ├── Check hosting capacity
│           └── Monitor server logs
```

---

### CTR Improvement

```
Low CTR despite impressions?
├── Check position first
│   ├── Position >10 → Focus on ranking first
│   │   ├── CTR naturally low
│   │   ├── Improve content/links for ranking
│   │   └── Don't expect high CTR yet
│   │
│   └── Position 1-10 → Snippet issue
│       │
│       ├── Check title tag
│       │   ├── Is it compelling?
│       │   ├── Is it truncated? (<60 chars)
│       │   ├── Does it match search intent?
│       │   └── Does it include target keyword?
│       │
│       ├── Check meta description
│       │   ├── Is it compelling?
│       │   ├── Is it truncated? (<155 chars)
│       │   ├── Does it have call to action?
│       │   └── Does it match query?
│       │
│       ├── Check rich results
│       │   ├── Do competitors have stars/prices?
│       │   ├── Add structured data
│       │   └── Test with Rich Results Test
│       │
│       └── Check SERP features
│           ├── Is there a featured snippet?
│           ├── Are there ads above?
│           ├── Is there a knowledge panel?
│           └── Adapt strategy accordingly
```

---

### Position Drop

```
Position dropped?
├── Single query or multiple?
│   │
│   ├── Single query
│   │   ├── Check specific page
│   │   ├── Review content quality
│   │   ├── Check for new competitors
│   │   └── Check search intent shift
│   │
│   └── Multiple queries
│       ├── Site-wide issue likely
│       ├── Check for algorithm update
│       ├── Check technical issues
│       └── Review recent changes
│
├── Gradual or sudden?
│   │
│   ├── Sudden drop
│   │   ├── Technical issue
│   │   ├── Manual action
│   │   ├── Algorithm update
│   │   └── Site change
│   │
│   └── Gradual decline
│       ├── Content aging
│       ├── Competition increasing
│       └── Technical debt
│
└── Recovery steps
    ├── Document current state
    ├── Identify cause
    ├── Make targeted fix
    ├── Monitor for 2-4 weeks
    └── Iterate if needed
```

---

## Common Issues by Platform

### BigCommerce (BOO)

| Issue | Cause | Solution |
|-------|-------|----------|
| Duplicate products | Variant URLs | Use canonical tags |
| Faceted navigation | Filter parameters | Block in robots.txt or use canonicals |
| Category pagination | Many pages | Implement rel=next/prev or view-all |
| Search URLs indexed | No noindex on search | Add noindex to search pages |
| Out of stock pages | Products disabled | Return 404 or redirect |

### Shopify (Teelixir, Elevate)

| Issue | Cause | Solution |
|-------|-------|----------|
| Collection filter URLs | ?sort_by, ?filter | Handled by Shopify (mostly) |
| Variant URLs | ?variant= parameter | Canonical to main product |
| Pagination URLs | ?page= parameter | Canonicals in place |
| Preview URLs | /preview themes | Should be blocked |
| Apps adding pages | App routes | Block if not needed |

### WooCommerce (RHF)

| Issue | Cause | Solution |
|-------|-------|----------|
| Attachment pages | WordPress default | Redirect to post or disable |
| Tag archives | Too many thin tags | Noindex or consolidate |
| Date archives | Duplicate content | Noindex date archives |
| Author archives | Single author site | Redirect to homepage |
| Feed URLs | RSS feeds | Low priority, ignore |

---

## Emergency Procedures

### Manual Action Received
1. **Immediate**: Review message in GSC Security & Manual Actions
2. **Identify**: Understand exact issue and affected pages
3. **Fix**: Address the violation completely
4. **Document**: Record what was fixed and when
5. **Request Review**: Submit reconsideration request
6. **Wait**: Typically 2-4 weeks for response
7. **Follow Up**: If rejected, fix remaining issues and resubmit

### Sudden Index Drop
1. **Verify**: Confirm drop in coverage report
2. **Timeline**: When did it start?
3. **Correlation**: Any site changes around that time?
4. **Technical Check**:
   - robots.txt accessible?
   - Sitemap working?
   - Server responding?
   - No accidental noindex?
5. **Sample URLs**: Inspect 5-10 affected URLs
6. **Fix**: Address root cause
7. **Request Indexing**: For critical pages

### Security Issue Detected
1. **Immediate**: Review security issues in GSC
2. **Scan**: Use security scanner on site
3. **Identify**: Find infected files/content
4. **Clean**: Remove malware/hacked content
5. **Secure**: Update passwords, patch vulnerabilities
6. **Request Review**: In GSC Security section
7. **Monitor**: Check for recurrence

---

## Monitoring Checklist

### Daily
- [ ] Check for new coverage errors
- [ ] Review click/impression trends
- [ ] Monitor tracked keywords

### Weekly
- [ ] Full coverage report review
- [ ] Top query analysis
- [ ] Position change review
- [ ] CWV status check

### Monthly
- [ ] Sitemap health check
- [ ] Full SEO report generation
- [ ] Keyword opportunity analysis
- [ ] Competitor comparison
- [ ] Index coverage trend analysis
