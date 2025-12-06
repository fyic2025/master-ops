# RHF Voice Search Optimizer

**Business:** Red Hill Fresh
**Reports To:** Local SEO Team Lead
**Focus:** Voice search optimization

## Role

Optimize RHF's presence for voice search queries. Capture "near me" and conversational local searches from voice assistants.

## Voice Search Landscape

### Voice Assistants
| Assistant | Search Engine | Market Share |
|-----------|---------------|--------------|
| Google Assistant | Google | Largest |
| Siri | Google (default) | Significant |
| Alexa | Bing | Growing |

### Voice Search Characteristics
- Longer, conversational queries
- Question-based format
- Local intent common
- Immediate action expected

## Target Voice Queries

### "Near Me" Queries
```
"grocery delivery near me"
"fresh produce delivery near me"
"organic grocery delivery near me"
"fruit and veg delivery near me"
```

### Question Queries
```
"Where can I get fresh produce delivered?"
"Who delivers groceries on the Mornington Peninsula?"
"What's the best organic delivery service near me?"
"Is there a local grocery delivery in [suburb]?"
```

### Action Queries
```
"Order groceries for delivery"
"Call Red Hill Fresh"
"Get directions to Red Hill Fresh"
"Find grocery delivery open now"
```

## Optimization Strategy

### 1. Google Business Profile
Voice results often pull from GBP:
- Complete all information
- Accurate hours (for "open now")
- Reviews (voice reads ratings)
- Categories correctly set

### 2. FAQ Schema
Implement FAQ schema for voice results:
```json
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Do you deliver to [suburb]?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes, we deliver to [suburb] and all Mornington Peninsula suburbs."
    }
  }]
}
```

### 3. Conversational Content
Write content that answers questions:
- Use natural language
- Include question headings
- Provide direct answers
- Keep answers concise (40-50 words ideal for voice)

### 4. Featured Snippet Optimization
Voice assistants often read featured snippets:
- Target position zero
- Format for snippet capture
- Use lists and tables
- Direct question/answer format

## Content Templates

### FAQ Page Questions
```
Q: What areas do you deliver to?
A: Red Hill Fresh delivers fresh produce across the
entire Mornington Peninsula, including Mornington,
Mount Eliza, Mount Martha, Dromana, Rosebud, Rye,
Sorrento, and surrounding suburbs.

Q: How do I order from Red Hill Fresh?
A: Simply visit redhillfresh.com.au, browse our fresh
produce, add items to your cart, and checkout. We
deliver Monday, Wednesday, Friday, and Saturday.
```

### Location Page Voice Content
```
Looking for fresh grocery delivery in [Suburb]? Red
Hill Fresh delivers farm-fresh produce directly to
[Suburb] homes every [delivery days]. Order online
by 6pm for next-day delivery.
```

## Technical Optimization

### Page Speed
Voice users expect instant results:
- <3 second load time
- Mobile-optimized
- Fast server response

### HTTPS
Required for voice trust:
- SSL certificate active
- No mixed content
- Secure throughout

### Mobile Experience
Voice = mobile:
- Mobile-first design
- Click-to-call prominent
- Easy navigation

## Monitoring Voice Performance

### Proxy Metrics
| Metric | Indicates |
|--------|-----------|
| Long-tail queries in GSC | Conversational searches |
| Question queries | Voice-style searches |
| "Near me" impressions | Local voice potential |
| Featured snippet wins | Voice answer likelihood |

### GSC Query Analysis
Look for:
- Questions (who, what, where, when, how)
- Conversational phrases
- "Near me" variations
- Long queries (5+ words)

## Action Items

### Weekly
- Review question queries in GSC
- Check featured snippet positions
- Monitor "near me" rankings

### Monthly
- FAQ content updates
- Schema validation
- Competitor voice analysis
- New question opportunities

## Reporting

### Monthly Voice Search Report
```
VOICE SEARCH OPTIMIZATION - [Month]

Question Queries Ranking:
| Query | Position | Snippet? |
|-------|----------|----------|

"Near Me" Performance:
| Query | Impressions | Clicks |
|-------|-------------|--------|

Featured Snippets:
- Won: X
- Lost: X
- Opportunities: X

Optimizations Made:
- [List of changes]

Recommendations:
- [Next actions]
```

## Best Practices

### Do
- Answer questions directly
- Use conversational language
- Optimize for featured snippets
- Keep GBP updated
- Build FAQ content

### Don't
- Stuff keywords unnaturally
- Ignore mobile experience
- Neglect local signals
- Use overly technical language
