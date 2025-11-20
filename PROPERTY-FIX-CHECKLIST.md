# HubSpot Property Fix Checklist

## Current Situation
- 10/10 unique field slots are full
- 8 slots are used by engagement/category fields that shouldn't be unique
- Need 1 slot for `lead_id` (the actual unique identifier)

## Manual Steps Required

### Step 1: Archive 8 Properties (Frees up 8 slots)
Go to: **Settings → Properties → Company Properties**

Search for and **ARCHIVE** each of these:
- [ ] `assigned_category`
- [ ] `bounce_rate`
- [ ] `category_score`
- [ ] `click_rate`
- [ ] `email_engagement_score`
- [ ] `engagement_score`
- [ ] `total_emails_clicked`
- [ ] `total_emails_opened`

**How to archive:**
1. Search for property name
2. Click on it
3. Click "Actions" → "Archive property"
4. Confirm

### Step 2: Create lead_id as Unique (Uses 1 slot)
**Settings → Properties → Company Properties → Create property**

Create with these exact settings:
- **Object type:** Company
- **Group:** Company information
- **Label:** Lead ID
- **Internal name:** `lead_id`
- **Description:** Unique identifier from lead database (Supabase)
- **Field type:** Single-line text
- **Validation:** ✅ **CHECK "Require unique values"** ← IMPORTANT!

### Step 3: Recreate the 8 Properties WITHOUT Unique Constraint

For each property below, create with **"Require unique values" UNCHECKED**:

#### Analytics Properties (Group: Analytics Information)

1. **Open Rate**
   - Internal name: `open_rate`
   - Field type: Number
   - Description: Email open rate percentage
   - Unique: ❌ NO

2. **Click Rate**
   - Internal name: `click_rate`
   - Field type: Number
   - Description: Email click rate percentage
   - Unique: ❌ NO

3. **Bounce Rate**
   - Internal name: `bounce_rate`
   - Field type: Number
   - Description: Email bounce rate percentage
   - Unique: ❌ NO

4. **Engagement Score**
   - Internal name: `engagement_score`
   - Field type: Number
   - Description: Overall engagement score
   - Unique: ❌ NO

5. **Email Engagement Score**
   - Internal name: `email_engagement_score`
   - Field type: Number
   - Description: Email-specific engagement score
   - Unique: ❌ NO

6. **Total Emails Opened**
   - Internal name: `total_emails_opened`
   - Field type: Number
   - Description: Total number of emails opened
   - Unique: ❌ NO

7. **Total Emails Clicked**
   - Internal name: `total_emails_clicked`
   - Field type: Number
   - Description: Total number of emails clicked
   - Unique: ❌ NO

#### Company Information Properties (Group: Company Information)

8. **Category Score**
   - Internal name: `category_score`
   - Field type: Number
   - Description: Business category confidence score
   - Unique: ❌ NO

9. **Assigned Category**
   - Internal name: `assigned_category`
   - Field type: Single-line text
   - Description: Assigned business category
   - Unique: ❌ NO

## Verification

After completing all steps, run:
```bash
npx tsx verify-property-constraints.ts
```

Should show:
- ✅ lead_id is unique
- ✅ All 9 other properties are NOT unique
- ✅ 0 properties need fixing

## Next Steps

Once verification passes:
1. Uncomment the 9 fields in `sync-businesses-to-hubspot.ts`
2. Run test sync: `npx tsx sync-businesses-to-hubspot.ts --test --limit=10`
3. Run full sync: `npx tsx sync-businesses-to-hubspot.ts`
