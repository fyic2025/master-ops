# Sync Google Ads Data

Sync Google Ads data from all accounts to Supabase.

## Arguments

- `$ARGUMENTS` - Optional: business name (boo, teelixir, redhillfresh) or "all"

## Steps

1. **Parse arguments**:
   - If business specified, sync only that account
   - If "all" or no argument, sync all 3 businesses

2. **Run sync service**:
   ```typescript
   import { GoogleAdsSyncService, syncAllBusinesses } from '@/shared/libs/integrations/google-ads'

   // For all businesses
   await syncAllBusinesses()

   // For specific business
   const sync = new GoogleAdsSyncService('boo')
   await sync.syncYesterdaysData()
   ```

3. **Report results**:
   - Number of campaigns synced
   - Number of keywords synced
   - Number of search terms synced
   - Any errors encountered

## Backfill Option

If user asks to backfill:
```typescript
await sync.syncLastNDays(30) // Sync last 30 days
```
