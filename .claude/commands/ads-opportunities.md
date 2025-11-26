# Review Google Ads Opportunities

Review and act on pending optimization opportunities.

## Steps

1. **Fetch pending opportunities**:
   ```sql
   SELECT
     o.id,
     a.business,
     o.opportunity_type,
     o.priority,
     o.title,
     o.description,
     o.rationale,
     o.estimated_impact,
     o.action_type,
     o.created_at
   FROM google_ads_opportunities o
   JOIN google_ads_accounts a ON a.id = o.account_id
   WHERE o.status = 'pending'
     AND (o.expires_at IS NULL OR o.expires_at > NOW())
   ORDER BY
     CASE o.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
     o.created_at DESC;
   ```

2. **Present each opportunity**:
   - Priority and type
   - What was discovered
   - Why it matters (rationale)
   - Expected impact
   - Required action

3. **Ask for decision**:
   - Approve: Mark as 'approved' and execute if automated
   - Reject: Mark as 'rejected' with reason
   - Defer: Leave as 'pending'

4. **Execute approved actions** (within guardrails):
   - Log change in `google_ads_change_log`
   - Update opportunity status to 'implemented'

## Example Output

```
## Pending Opportunities (3)

### 1. [HIGH] BOO - Budget Increase Opportunity
Performance Max campaign "Shopping - All Products" has been budget-capped for 5 days with 4.8x ROAS.

**Impact:** +$200/day revenue estimated
**Action:** Increase daily budget from $100 to $150

[ ] Approve  [ ] Reject  [ ] Defer

### 2. [MEDIUM] Teelixir - Negative Keywords
3 search terms spending $45/week with 0 conversions:
- "mushroom identification guide"
- "psychedelic mushrooms"
- "mushroom growing kit free"

**Action:** Add as exact match negatives

[ ] Approve  [ ] Reject  [ ] Defer
```
