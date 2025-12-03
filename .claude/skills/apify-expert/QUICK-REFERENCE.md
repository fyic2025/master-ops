# Apify Expert - Quick Reference

## Credentials

```bash
# Get token
node creds.js get global apify_token

# Verify token works
npx tsx .claude/skills/apify-expert/scripts/check-usage.ts
```

## Check Usage

```bash
# Check current month spend
npx tsx .claude/skills/apify-expert/scripts/check-usage.ts

# Quick API check
curl -s "https://api.apify.com/v2/users/me/limits" \
  -H "Authorization: Bearer $(node creds.js get global apify_token)" | \
  node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log('Spend: $'+j.data.current.monthlyUsageUsd.toFixed(2)+' / $'+j.data.limits.maxMonthlyUsageUsd)"
```

## Run Google Maps Scraper

### Quick Lead Scrape

```bash
# Run via script
npx tsx .claude/skills/apify-expert/scripts/run-google-maps.ts \
  --query "gyms Sydney Australia" \
  --max 100
```

### Manual API Call

```bash
TOKEN=$(node creds.js get global apify_token)

curl -X POST "https://api.apify.com/v2/acts/compass~crawler-google-places/runs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "searchStringsArray": ["gyms Sydney Australia"],
    "maxCrawledPlacesPerSearch": 50,
    "language": "en",
    "includeContactInfo": true,
    "includeWebsite": true
  }'
```

## Get Results

```bash
# Get dataset items (replace DATASET_ID)
curl -s "https://api.apify.com/v2/datasets/DATASET_ID/items?clean=true" \
  -H "Authorization: Bearer $TOKEN" | head -c 2000
```

## Common Search Queries

### Fitness/Wellness
```
gyms Sydney Australia
personal trainers Melbourne Australia
yoga studios Brisbane Australia
pilates studios Perth Australia
crossfit Adelaide Australia
```

### Health Food Retail
```
health food stores Sydney Australia
organic shops Melbourne Australia
whole foods Brisbane Australia
natural grocery Perth Australia
```

### Cafes/Restaurants
```
organic cafe Sydney Australia
health cafe Melbourne Australia
smoothie bar Brisbane Australia
vegan restaurant Adelaide Australia
```

### Practitioners
```
naturopath Sydney Australia
nutritionist Melbourne Australia
wellness center Brisbane Australia
holistic health Perth Australia
```

## Budget Quick Calc

| Budget | Google Maps Results |
|--------|---------------------|
| $5 | ~700 places |
| $10 | ~1,400 places |
| $15 | ~2,100 places |
| $20 | ~2,800 places |
| $49 | ~7,000 places |

## n8n Active Workflows

| ID | Name | Status |
|----|------|--------|
| `8Sq4dp3eD0KfR9TS` | Geelong Fitness Test | ACTIVE |

## Troubleshooting

### Check if actor is running
```bash
curl -s "https://api.apify.com/v2/actor-runs?limit=5" \
  -H "Authorization: Bearer $TOKEN" | \
  node -e "const d=require('fs').readFileSync(0,'utf8');JSON.parse(d).data.items.forEach(r=>console.log(r.id,'|',r.status,'|',new Date(r.startedAt).toLocaleString()))"
```

### Get recent datasets
```bash
curl -s "https://api.apify.com/v2/datasets?limit=5" \
  -H "Authorization: Bearer $TOKEN" | \
  node -e "const d=require('fs').readFileSync(0,'utf8');JSON.parse(d).data.items.forEach(r=>console.log(r.id,'|',r.itemCount,'items','|',new Date(r.modifiedAt).toLocaleString()))"
```

## Key URLs

- **Apify Console**: https://console.apify.com
- **API Docs**: https://docs.apify.com/api/v2
- **Google Maps Actor**: https://apify.com/compass/crawler-google-places
- **n8n Instance**: https://automation.growthcohq.com
