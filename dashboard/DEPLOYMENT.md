# Dashboard Deployment Guide

## Production URL
https://ops.growthcohq.com

## DigitalOcean App Platform

### App ID
`1a0eed70-aef6-415e-953f-d2b7f0c7c832`

### Deployment Commands
```bash
# Check status
doctl apps list-deployments 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --format ID,Phase,Progress

# View logs
doctl apps logs 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --type run

# Update from spec
doctl apps update 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --spec .do/app.yaml
```

---

## Environment Variables

### Required for NextAuth v5

| Variable | Scope | Description |
|----------|-------|-------------|
| `AUTH_SECRET` | RUN_AND_BUILD_TIME | Random 32-char base64 string. Generate: `openssl rand -base64 32` |
| `AUTH_URL` | RUN_AND_BUILD_TIME | Full production URL: `https://ops.growthcohq.com` |
| `NEXTAUTH_URL` | RUN_AND_BUILD_TIME | Same as AUTH_URL (for v4 compatibility) |
| `AUTH_TRUST_HOST` | RUN_AND_BUILD_TIME | Must be `"true"` when behind proxy/CDN |

### Google OAuth

| Variable | Scope | Description |
|----------|-------|-------------|
| `GOOGLE_AUTH_CLIENT_ID` | RUN_AND_BUILD_TIME | From Google Cloud Console |
| `GOOGLE_AUTH_CLIENT_SECRET` | RUN_AND_BUILD_TIME | From Google Cloud Console (mark as SECRET) |

### Supabase

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | RUN_AND_BUILD_TIME | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RUN_AND_BUILD_TIME | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | RUN_TIME | Supabase service role key (mark as SECRET) |
| `SUPABASE_URL` | RUN_TIME | Same as NEXT_PUBLIC_SUPABASE_URL |

---

## Google OAuth Setup

### Google Cloud Console Configuration

**Project:** Growth Co HQ (or your project)

**OAuth Client ID:** `204183633386-l8r30d5tgd4luc5pd9vhreeibq7c6287.apps.googleusercontent.com`

### Authorized JavaScript Origins
```
https://ops.growthcohq.com
http://localhost:3000
```

### Authorized Redirect URIs
```
https://ops.growthcohq.com/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
https://master-ops-dashboard-h5j6d.ondigitalocean.app/api/auth/callback/google
```

---

## Common Issues & Solutions

### Issue: `?error=Configuration`
**Cause:** Missing or invalid OAuth credentials
**Solution:**
1. Verify `GOOGLE_AUTH_CLIENT_ID` and `GOOGLE_AUTH_CLIENT_SECRET` are set
2. Ensure no duplicate env vars (check both app-level and service-level)
3. Regenerate `AUTH_SECRET` if corrupted

### Issue: `UntrustedHost` error in logs
**Cause:** NextAuth v5 requires explicit host trust behind proxies
**Solution:** Set `AUTH_TRUST_HOST=true` with scope `RUN_AND_BUILD_TIME`

### Issue: `MissingSecret` error in logs
**Cause:** AUTH_SECRET not being read at runtime
**Solution:**
1. Set AUTH_SECRET scope to `RUN_AND_BUILD_TIME`
2. Regenerate: `openssl rand -base64 32`

### Issue: `redirect_uri_mismatch` from Google
**Causes:**
1. Wrong OAuth Client ID configured in app
2. Redirect URI not added to Google Console
3. JavaScript origin missing from Google Console
4. Editing wrong OAuth client in Google Console

**Solution:**
1. Check error URL for `client_id=...` - match this to Google Console
2. Verify callback URL matches exactly: `https://ops.growthcohq.com/api/auth/callback/google`
3. Add JavaScript origin: `https://ops.growthcohq.com`
4. Wait 5 minutes for Google to propagate changes

### Issue: Duplicate environment variables
**Cause:** Variables defined at both app-level AND service-level in DO spec
**Solution:** Only define env vars at service level (under `services.envs`)

### Issue: Login redirects to /home even when not logged in
**Cause:** Middleware checking `req.auth` instead of `req.auth?.user`
**Solution:** In middleware.ts, use `const isLoggedIn = !!req.auth?.user`

---

## Verification Commands

```bash
# Check providers endpoint (should show google with correct callback URL)
curl -s "https://ops.growthcohq.com/api/auth/providers"

# Check CSRF endpoint (should return token)
curl -s "https://ops.growthcohq.com/api/auth/csrf"

# Check for errors in signin flow
curl -sI "https://ops.growthcohq.com/api/auth/signin/google"
```

---

## App Spec Template

See `.do/app.yaml` for the full spec. Key points:
- All env vars should be at service level only (under `services[0].envs`)
- Use `RUN_AND_BUILD_TIME` scope for auth-related vars
- Mark secrets with `type: SECRET`

---

## Allowed Users

Edit `src/lib/user-permissions.ts` to add/remove users:
- Admin users have full access
- Operations users have limited page access

Current admins:
- jayson@teelixir.com
- jayson@fyic.com.au
- peter@teelixir.com
- ops@growthcohq.com
