# Claude Voice Task Creation API

This document provides the exact API format for Claude (voice/web) to create tasks directly in Supabase.

## Endpoint

```
POST https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/tasks
```

## Headers

```
apikey: SERVICE_ROLE_KEY
Authorization: Bearer SERVICE_ROLE_KEY
Content-Type: application/json
Prefer: return=representation
```

## Request Body Schema

```json
{
  "title": "string (required) - Brief task title",
  "description": "string (required) - Detailed description",
  "business": "string (required) - teelixir|boo|elevate|rhf|overall",
  "category": "string (optional) - Task category",
  "priority": "integer (1-4) - 1=critical, 2=high, 3=normal, 4=low",
  "status": "string - Always 'pending' for new tasks",
  "instructions": "string (optional) - Specific execution instructions",
  "context": "string (optional) - Additional context",
  "skills": "array (optional) - Required skills e.g. ['shopify-expert']",
  "created_by": "string - Always 'claude_voice' for voice-created tasks"
}
```

## Complete Curl Command Template

```bash
curl -X POST "https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/tasks" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Task title here",
    "description": "Detailed description of what needs to be done",
    "business": "teelixir",
    "category": "development",
    "priority": 3,
    "status": "pending",
    "instructions": "Step by step instructions",
    "context": "Any relevant context",
    "created_by": "claude_voice"
  }'
```

## Business Values

| Value | Description |
|-------|-------------|
| `teelixir` | Teelixir Shopify store |
| `boo` | Buy Organics Online BigCommerce store |
| `elevate` | Elevate Wholesale Shopify store |
| `rhf` | Red Hill Fresh WooCommerce store |
| `overall` | Cross-business or infrastructure tasks |

## Priority Values

| Value | Meaning | Use For |
|-------|---------|---------|
| `1` | Critical | Urgent production issues |
| `2` | High | Important, needs attention soon |
| `3` | Normal | Standard priority (default) |
| `4` | Low | Nice to have, when time permits |

## Category Examples

- `development` - Code changes, new features
- `bug-fix` - Fixing issues
- `content` - Copy, descriptions, marketing
- `seo` - Search optimization tasks
- `analytics` - Reporting, data analysis
- `automation` - Workflows, integrations
- `maintenance` - Cleanup, updates

## Example Tasks

### High Priority Feature Request
```bash
curl -X POST "https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/tasks" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add bulk discount feature to Teelixir",
    "description": "Implement quantity-based discounts for wholesale customers. When customers order 10+ of same SKU, apply 15% discount.",
    "business": "teelixir",
    "category": "development",
    "priority": 2,
    "status": "pending",
    "instructions": "1. Check existing discount infrastructure\n2. Add quantity threshold logic\n3. Update cart calculations\n4. Test with sample orders",
    "skills": ["shopify-expert"],
    "created_by": "claude_voice"
  }'
```

### Content Task
```bash
curl -X POST "https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/tasks" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rewrite Lions Mane product description",
    "description": "Current description is too technical. Need more benefit-focused, customer-friendly copy.",
    "business": "teelixir",
    "category": "content",
    "priority": 3,
    "status": "pending",
    "instructions": "Use product-description-generator skill. Focus on cognitive benefits, mention adaptogenic properties.",
    "skills": ["product-description-generator", "brand-asset-manager"],
    "created_by": "claude_voice"
  }'
```

### Bug Fix
```bash
curl -X POST "https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/tasks" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix GSC sync error for BOO",
    "description": "GSC sync failing with 401 error since yesterday. Check refresh token and connection.",
    "business": "boo",
    "category": "bug-fix",
    "priority": 2,
    "status": "pending",
    "created_by": "claude_voice"
  }'
```

## Validation Rules

1. **Required fields**: `title`, `description`, `business`
2. **created_by**: Must be `claude_voice` for voice-created tasks
3. **status**: Should always be `pending` for new tasks
4. **priority**: Default to `3` if not specified
5. **business**: Must be one of the valid values

## Response

Success returns the created task with ID:

```json
{
  "id": "uuid-here",
  "title": "...",
  "status": "pending",
  "created_at": "2024-12-05T...",
  ...
}
```

## Safeguards

- All `claude_voice` tasks are logged
- Tasks require human review before execution (status=pending)
- No direct execution from this API
- Service role key should only be used by authorized Claude instances
