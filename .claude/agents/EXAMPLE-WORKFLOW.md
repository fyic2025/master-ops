# SEO Team Agent Workflow Example

This document shows exactly what happens when you task the SEO Director with optimizing a website.

---

## Example Request

**You say:** "SEO Director, optimize Buy Organics Online for better organic traffic"

---

## What Happens: Step-by-Step

### Phase 1: SEO Director Receives Task (2 min)

The **SEO Director** springs into action:

```
SEO DIRECTOR:
I'll optimize Buy Organics Online (buyorganicsonline.com.au) for better organic traffic.

Let me coordinate my specialist team to conduct comprehensive audits across all SEO dimensions.

I'm delegating the following parallel audits:
1. Technical SEO audit
2. Performance and Core Web Vitals audit
3. Current traffic baseline analysis
4. Keyword opportunity research
5. Content optimization audit
```

### Phase 2: Parallel Sub-Agent Execution (15-20 min)

The SEO Director uses the `Task` tool to launch **5 sub-agents in parallel**:

#### 🔧 Technical SEO Specialist
```
Task: "Audit buyorganicsonline.com.au for technical SEO issues.
Check schema markup, sitemap, robots.txt, canonical tags, and
mobile optimization. Report critical issues first."
```

**While working, the specialist:**
- Reads the website files
- Checks for sitemap.xml and robots.txt
- Searches for schema markup implementation
- Analyzes meta tags across pages
- Checks mobile responsiveness

**Delivers back to Director:**
```
TECHNICAL SEO AUDIT: Buy Organics Online

CRITICAL ISSUES (2):
1. Missing Product Schema - 500+ product pages lack structured data
   Impact: Missing rich snippets in search results
   Fix: Implement Product schema with price, availability, reviews

2. Duplicate Meta Descriptions - 120 pages share identical descriptions
   Impact: Reduced click-through rates from search
   Fix: Generate unique descriptions for category/product pages

HIGH PRIORITY (4):
1. Sitemap includes 404 pages (12 URLs)
2. Missing alt text on 200+ product images
3. H1 tags missing on 8 category pages
4. Canonical tags not implemented on paginated pages

[Code examples and implementation guide provided]

ESTIMATED EFFORT: 12 hours
EXPECTED IMPACT: 15-20% improvement in click-through rate
```

#### ⚡ Performance Auditor
```
Task: "Run Core Web Vitals audit on buyorganicsonline.com.au.
Check LCP, FID, CLS. Identify performance bottlenecks and provide
fix recommendations."
```

**Delivers:**
```
PERFORMANCE AUDIT: Buy Organics Online

CORE WEB VITALS:
⚠️  LCP: 3.2s (Target: <2.5s) - NEEDS IMPROVEMENT
❌ FID: 280ms (Target: <100ms) - FAIL
❌ CLS: 0.35 (Target: <0.1) - FAIL

CRITICAL ISSUES:
1. Unoptimized Hero Images (3.2MB JPGs)
   Fix: Convert to WebP, implement responsive images
   Impact: LCP will drop to ~1.8s

2. JavaScript Bundle Too Large (850KB)
   Fix: Code splitting, lazy loading
   Impact: FID will improve to <100ms

3. Images Load Without Dimensions
   Fix: Add width/height attributes
   Impact: CLS will drop to <0.1

[Specific code fixes provided]

ESTIMATED EFFORT: 6 hours
EXPECTED IMPACT: Core Web Vitals pass = 5-8% traffic increase
```

#### 📊 Analytics Reporter
```
Task: "Pull current organic traffic baseline for buyorganicsonline.com.au.
Show top landing pages, traffic trends (last 90 days), and current
keyword rankings."
```

**Delivers:**
```
ANALYTICS BASELINE: Buy Organics Online
Date Range: Oct 1 - Dec 24, 2025

CURRENT STATE:
Organic Sessions: 28,400/month
Pageviews: 95,200/month
Conversion Rate: 1.8%
Revenue from Organic: $142,000/month

TOP LANDING PAGES:
1. /products/organic-almonds - 2,400 sessions/month
2. /categories/organic-snacks - 1,850 sessions/month
3. /products/coconut-oil - 1,620 sessions/month

KEYWORD RANKINGS:
Position 1-3: 23 keywords
Position 4-10: 87 keywords
Position 11-20: 156 keywords

TOP OPPORTUNITIES:
• "buy organic groceries online" - Position 11 (high volume)
• "organic food delivery Sydney" - Position 8 (local intent)
• "certified organic products" - Position 12 (commercial intent)

TRAFFIC TREND: ↑ 12% vs last quarter (positive momentum)
```

#### 🔍 Keyword Research Analyst
```
Task: "Research keyword opportunities for organic grocery delivery
in Australia. Focus on high-intent keywords with good search volume
and achievable competition."
```

**Delivers:**
```
KEYWORD RESEARCH: Buy Organics Online

TOTAL KEYWORDS ANALYZED: 450
OPPORTUNITIES IDENTIFIED: 85 high-value keywords

QUICK WINS (Rank in 1-3 months):
1. "organic grocery delivery Sydney"
   Volume: 880/mo, Difficulty: Easy, Current: #8
   Action: Optimize existing Sydney landing page
   Expected: Position 3, +400 monthly visits

2. "buy organic vegetables online"
   Volume: 720/mo, Difficulty: Easy, Current: #11
   Action: Enhance category page content
   Expected: Position 5, +250 monthly visits

3. "certified organic food Australia"
   Volume: 590/mo, Difficulty: Easy, Current: #13
   Action: Create certification trust page
   Expected: Position 7, +180 monthly visits

[10 total quick wins identified]

STRATEGIC KEYWORDS (3-6 months):
1. "organic groceries online" - 5,400/mo volume
2. "organic food delivery" - 4,100/mo volume
3. "buy organic food online Australia" - 2,900/mo volume

KEYWORD GAP ANALYSIS:
Competitor "OrganicGrocer.com" ranks for 45 keywords we don't,
including valuable terms like "organic pantry staples" and
"bulk organic buying".

ESTIMATED TRAFFIC IMPACT:
Quick wins: +2,500 visits/month in 3 months
Strategic: +8,000 visits/month in 6 months
Total potential: +10,500 visits/month (+37% growth)
```

#### ✍️ Content Optimizer
```
Task: "Analyze the top 10 category pages on buyorganicsonline.com.au.
Identify content gaps, thin content, and optimization opportunities.
Compare to top-ranking competitors."
```

**Delivers:**
```
CONTENT AUDIT: Buy Organics Online

PAGES ANALYZED: 10 top category pages
AVERAGE CONTENT SCORE: 24/50 (Needs significant improvement)

CRITICAL ISSUES:
• 8 of 10 pages have <150 words of content
• 0 pages have FAQ sections (competitors all have them)
• Product descriptions are manufacturer copy (duplicate content)
• Missing target keywords in H1 tags on 6 pages

TOP OPPORTUNITIES:
1. /categories/organic-snacks (1,850 sessions/month)
   Current: 87 words, generic content
   Competitor average: 650 words with benefits, FAQs, recipes
   Recommendation: Expand to 600 words, add FAQ section,
                   include health benefits
   Expected: +25% traffic, +0.5% conversion improvement

2. /categories/organic-pantry (1,420 sessions/month)
   Current: 120 words, no structured content
   Gap: Missing "how to stock organic pantry" guide
   Recommendation: Create comprehensive guide with checklist
   Expected: +35% traffic from long-tail keywords

[10 detailed page recommendations]

CONTENT TEMPLATES CREATED:
✅ Optimized category page template
✅ Product page template with SEO best practices
✅ FAQ section template for common questions

PRIORITY: Fix top 5 category pages first (70% of traffic)
ESTIMATED EFFORT: 20 hours
EXPECTED IMPACT: 20-30% traffic increase to category pages
```

---

### Phase 3: SEO Director Synthesizes Results (10 min)

The SEO Director receives all 5 sub-agent reports and analyzes them together:

```
SEO DIRECTOR:
Excellent - I've received comprehensive audits from all specialists.

Let me synthesize the findings and create a prioritized action plan...

CROSS-CUTTING INSIGHTS:
• Technical foundation is weak (missing schema, poor meta tags)
• Performance issues are hurting user experience and rankings
• Content is thin but we have good traffic baseline to build from
• Strong keyword opportunities with achievable difficulty
• Quick wins available that can show results in 30-60 days

IMPACT ANALYSIS:
Technical fixes → 15-20% CTR improvement
Performance fixes → 5-8% traffic increase (Core Web Vitals)
Content optimization → 20-30% traffic to key pages
Keyword targeting → 37% overall traffic growth potential

COMBINED ESTIMATED IMPACT: 60-80% traffic growth over 6 months
```

---

### Phase 4: Strategic Prioritization (5 min)

The SEO Director creates a **prioritized action plan**:

```
SEO DIRECTOR:
Based on impact vs. effort analysis, here's the optimization roadmap:

==================================================
PHASE 1 - QUICK WINS (Week 1-2) [18 hours effort]
==================================================
These changes will show results fastest:

1. ✅ Add Product Schema to top 50 products (4 hours)
   - Technical SEO Specialist provides code template
   - Expected: Rich snippets in 2-3 weeks
   - Impact: +15% CTR on product pages

2. ✅ Fix duplicate meta descriptions (3 hours)
   - Content Optimizer provides unique descriptions
   - Impact: +10% CTR improvement

3. ✅ Optimize "organic grocery delivery Sydney" page (2 hours)
   - Currently position 8, easy move to top 3
   - Impact: +400 monthly visits

4. ✅ Convert hero images to WebP (2 hours)
   - Performance Auditor provides script
   - Impact: LCP improves from 3.2s to 1.8s

5. ✅ Add FAQ sections to top 5 category pages (5 hours)
   - Content Optimizer provides templates
   - Impact: Featured snippet opportunities + long-tail keywords

6. ✅ Fix sitemap issues (2 hours)
   - Remove 404 URLs, add missing pages
   - Impact: Better crawling and indexing

==================================================
PHASE 2 - CORE IMPROVEMENTS (Week 3-6) [38 hours]
==================================================
Foundation strengthening:

7. ✅ Expand content on top 10 category pages (20 hours)
   - Use Content Optimizer templates
   - Impact: +25% traffic to category pages

8. ✅ Implement code splitting (8 hours)
   - Performance Auditor provides implementation guide
   - Impact: FID drops to <100ms, better user experience

9. ✅ Add schema to all products and categories (6 hours)
   - Scale Product schema implementation
   - Impact: Rich snippets across entire catalog

10. ✅ Fix layout shift issues (4 hours)
    - Add image dimensions, reserve space for dynamic content
    - Impact: CLS drops to <0.1

==================================================
PHASE 3 - STRATEGIC GROWTH (Week 7-12) [40 hours]
==================================================
Long-term traffic building:

11. ✅ Target 10 strategic keywords (25 hours)
    - Create/optimize pages for high-volume terms
    - Impact: +8,000 visits/month

12. ✅ Create organic certification trust page (5 hours)
    - Targets "certified organic" keywords
    - Builds trust and authority
    - Impact: +180 visits/month + conversion rate boost

13. ✅ Build out "organic living" blog section (10 hours)
    - 5 pillar articles on topics from Keyword Research
    - Impact: Brand building + informational keyword rankings

==================================================
EXPECTED RESULTS TIMELINE
==================================================
Month 1: +15% traffic (quick wins take effect)
Month 2: +25% traffic (core improvements indexed)
Month 3: +35% traffic (strategic content starts ranking)
Month 6: +60-80% traffic (full strategy matured)

Conversion rate expected to improve 0.3-0.5% due to:
- Better page speed (less abandonment)
- More targeted traffic (better keyword alignment)
- Improved content (clearer value props, FAQs)

REVENUE IMPACT:
Current: $142,000/month from organic
Projected (6 months): $227,000-$256,000/month
Increase: $85,000-$114,000/month additional revenue

==================================================
IMPLEMENTATION APPROACH
==================================================
I recommend we proceed in phases to:
- Show early wins (builds momentum)
- Learn and adapt (see what works best for this site)
- Minimize risk (test changes before scaling)

NEXT STEPS:
1. Review and approve this plan
2. I'll delegate Phase 1 tasks to specialist sub-agents
3. They'll provide implementation-ready code/content
4. We'll track results weekly with Analytics Reporter
5. Adjust strategy based on performance data

Would you like me to begin Phase 1 implementation?
```

---

## What You Get From This Process

### 1. **Comprehensive Analysis**
- 5 specialist perspectives on your site
- Cross-functional insights (technical + content + keywords + performance + data)
- Competitive intelligence and opportunity discovery

### 2. **Prioritized Action Plan**
- Clear phases (quick wins → core → strategic)
- Effort estimates for each task
- Expected impact quantified
- Revenue projections

### 3. **Implementation-Ready Deliverables**
- Code samples for technical fixes
- Content templates for optimization
- Keyword maps for targeting
- Performance optimization guides

### 4. **Coordinated Execution**
- SEO Director manages the team
- Specialists handle implementation details
- Progress tracking and reporting
- Adaptive strategy based on results

---

## How to Use This in Practice

### Starting an Optimization Project

```
You: "SEO Director, optimize Teelixir for increased organic traffic"

[SEO Director coordinates team, delivers comprehensive plan]

You: "Approved, start with Phase 1"

[SEO Director delegates to specialists, they begin implementation]
```

### Getting Specific Analysis

```
You: "Technical SEO Specialist, audit the schema markup on
Buy Organics Online product pages"

[Specialist performs focused audit, delivers findings]
```

### Tracking Progress

```
You: "Analytics Reporter, show me the results of the optimizations
we did last month on Red Hill Fresh"

[Reporter pulls data, shows before/after comparison]
```

### Researching New Opportunities

```
You: "Keyword Research Analyst, find keyword opportunities for
expanding Elevate Wholesale into the Melbourne market"

[Analyst researches Melbourne-specific keywords, delivers opportunities]
```

---

## Benefits of This Agent Structure

### ✅ Hierarchical Delegation
- SEO Director handles strategy
- Specialists handle execution
- Clear chain of command
- Efficient task distribution

### ✅ Parallel Processing
- 5 audits run simultaneously
- 20 minutes instead of 100 minutes
- Faster insights and recommendations

### ✅ Specialized Expertise
- Each agent is expert in their domain
- Detailed, actionable recommendations
- Best practices baked into each specialist

### ✅ Scalable Across Projects
- Same team works on all 4 websites
- Consistent methodology
- Learnings transfer between sites

### ✅ Coordinated Strategy
- SEO Director sees the full picture
- Identifies synergies across specialist findings
- Creates coherent, prioritized roadmap

---

## Advanced Usage Patterns

### 1. Cross-Website Coordination
```
You: "SEO Director, analyze which SEO tactics are working best
across all 4 business websites and apply the winners to the others"

[Director coordinates analysis across all sites, identifies patterns]
```

### 2. Competitive Analysis
```
You: "SEO Director, analyze why Competitor X is outranking us for
'organic groceries' and create a plan to overtake them"

[Director delegates competitor research, creates overtaking strategy]
```

### 3. Ongoing Monitoring
```
You: "Analytics Reporter, set up monthly SEO tracking for all 4 websites
and alert me if traffic drops >10% or rankings fall out of top 10"

[Reporter establishes monitoring and alerting]
```

### 4. Content Strategy
```
You: "Keyword Research Analyst and Content Optimizer, work together to
create a 6-month content calendar for Teelixir's blog that targets
high-value informational keywords"

[Analyst finds opportunities, Optimizer creates content briefs]
```

---

## Files Created

Your SEO team is now available at:

```
/home/user/master-ops/.claude/agents/
├── seo-director.md                  # Strategic coordinator
├── technical-seo-specialist.md      # Technical infrastructure
├── content-optimizer.md             # On-page optimization
├── keyword-research-analyst.md      # Opportunity discovery
├── performance-auditor.md           # Speed and Core Web Vitals
├── analytics-reporter.md            # Tracking and reporting
└── EXAMPLE-WORKFLOW.md             # This guide
```

All agents are version-controlled in git and ready to use across your entire master-ops project for all 4 business websites.

---

## Ready to Start?

Just say: **"SEO Director, optimize [website name]"** and watch the team spring into action!

The SEO Director will:
1. Delegate to all specialists in parallel
2. Synthesize their findings
3. Create a prioritized roadmap
4. Provide implementation-ready deliverables
5. Coordinate execution
6. Track and report results

Your SEO team is ready to drive organic traffic growth across Teelixir, Buy Organics Online, Elevate Wholesale, and Red Hill Fresh. 🚀
