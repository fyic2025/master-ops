# n8n Authentication Tools - Quick Reference Card

**Keep this handy for daily n8n development! 🚀**

---

## 🔑 Test Workflow Credentials

```bash
# Test all credentials in a workflow
npx tsx test-workflow-credentials.ts wf-12345
npx tsx test-workflow-credentials.ts workflow.json

# Test specific credential
npx tsx test-workflow-credentials.ts --credential cred-12345 --type googleSheetsOAuth2Api
```

**When to use:** Before deploying any workflow to production

---

## 🔐 Generate Auth Code

```bash
# Bearer Token
npx tsx generate-auth-code.ts --type bearer --token-var ACCESS_TOKEN

# API Key
npx tsx generate-auth-code.ts --type apikey --key-var API_KEY

# Basic Auth
npx tsx generate-auth-code.ts --type basic --username-var USER --password-var PASS

# HMAC (Unleashed/similar)
npx tsx generate-auth-code.ts --type hmac \
  --api-id-var API_ID \
  --api-key-var API_KEY \
  --query-string "format=json"

# OAuth 2.0
npx tsx generate-auth-code.ts --type oauth \
  --client-id-var CLIENT_ID \
  --client-secret-var CLIENT_SECRET \
  --token-endpoint https://api.example.com/oauth/token
```

**When to use:** Creating new n8n Code nodes with authentication

---

## 🌐 Test OAuth 2.0

```bash
# Test Client Credentials
OAUTH_TOKEN_ENDPOINT=https://api.example.com/oauth/token \
OAUTH_CLIENT_ID=xxx \
OAUTH_CLIENT_SECRET=yyy \
npx tsx test-oauth.ts client

# Generate Authorization URL
npx tsx test-oauth.ts auth

# Test Refresh Token
OAUTH_REFRESH_TOKEN=zzz npx tsx test-oauth.ts refresh
```

**When to use:** Setting up OAuth integrations

---

## 🧪 Run Integration Tests

```bash
# Test HubSpot
HUBSPOT_ACCESS_TOKEN=xxx npx tsx run-integration-tests.ts --hubspot

# Test n8n
N8N_BASE_URL=https://n8n.example.com \
N8N_API_KEY=xxx \
npx tsx run-integration-tests.ts --n8n

# Test all
npx tsx run-integration-tests.ts --all
```

**When to use:** Before building workflows for an API

---

## 📋 Custom Integration Tests

```bash
# Run your custom test file
npx tsx example-integration-test.ts

# Or create your own
npx tsx my-custom-test.ts
```

**When to use:** Testing complex API integrations end-to-end

---

## 🔧 Common Workflows

### Workflow 1: New API Integration
```bash
1. npx tsx run-integration-tests.ts --example     # Test API works
2. npx tsx generate-auth-code.ts --type bearer    # Generate auth code
3. Paste code into n8n Code node                  # Build workflow
4. npx tsx test-workflow-credentials.ts wf-xxx    # Verify credentials
5. Deploy! ✅
```

### Workflow 2: Fix Failing Workflow
```bash
1. npx tsx test-workflow-credentials.ts wf-xxx    # Find broken credentials
2. Fix credentials in n8n UI
3. npx tsx test-workflow-credentials.ts wf-xxx    # Verify fix
4. Redeploy! ✅
```

### Workflow 3: OAuth Integration
```bash
1. npx tsx test-oauth.ts client                   # Test OAuth works
2. npx tsx generate-auth-code.ts --type oauth     # Generate code
3. Paste into n8n Code node                       # Build workflow
4. Test manually                                  # Verify
5. Deploy! ✅
```

---

## 📝 Environment Variables

### For Testing
```bash
# HubSpot
export HUBSPOT_ACCESS_TOKEN=xxx

# n8n
export N8N_BASE_URL=https://n8n.example.com
export N8N_API_KEY=xxx

# OAuth
export OAUTH_TOKEN_ENDPOINT=https://api.example.com/oauth/token
export OAUTH_CLIENT_ID=xxx
export OAUTH_CLIENT_SECRET=yyy

# Unleashed
export UNLEASHED_API_ID=xxx
export UNLEASHED_API_KEY=yyy
export UNLEASHED_BASE_URL=https://api.unleashedsoftware.com
```

### In n8n Code Nodes
```javascript
// Access environment variables
const token = $env.HUBSPOT_ACCESS_TOKEN
const apiKey = $env.API_KEY
const apiId = $env.UNLEASHED_API_ID

// Always check they exist
if (!token) {
  throw new Error('HUBSPOT_ACCESS_TOKEN not set')
}
```

---

## 🎯 Authentication Types Quick Reference

| Type | Use Case | Example |
|------|----------|---------|
| **Bearer** | Modern APIs, OAuth | HubSpot, Google |
| **API Key** | Simple auth | OpenAI, many SaaS |
| **Basic** | Legacy systems | HTTP Basic Auth |
| **HMAC** | High security | Unleashed, AWS |
| **OAuth 2.0** | User authorization | Google, Microsoft |

---

## 🚨 Common Issues

### Issue: "Missing environment variable"
**Fix:** Set the environment variable before running
```bash
export VAR_NAME=value
npx tsx command
```

### Issue: "Credential test failed: 401"
**Fix:** Check credential is valid and not expired
1. Log into service UI
2. Regenerate credential
3. Update in n8n
4. Re-test

### Issue: "OAuth token expired"
**Fix:** Use refresh token flow
```bash
npx tsx test-oauth.ts refresh
```

### Issue: "HMAC signature mismatch"
**Fix:** Check query string matches exactly
```bash
# Ensure query string is exactly as API expects
--query-string "format=json&page=1"
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `QUICK-REFERENCE.md` | This card (quick daily reference) |
| `AUTH-TOOLS-SUMMARY.md` | Complete summary of all tools |
| `AUTH-INTEGRATION-GUIDE.md` | Detailed auth integration guide |

---

## 💡 Pro Tips

1. **Always test credentials before deploying**
   ```bash
   npx tsx test-workflow-credentials.ts wf-xxx
   ```

2. **Use environment variables, never hardcode**
   ```javascript
   const token = $env.TOKEN  // ✅ Good
   const token = "sk-xxx"    // ❌ Bad
   ```

3. **Test OAuth flows before building workflows**
   ```bash
   npx tsx test-oauth.ts client
   ```

4. **Create integration tests for complex APIs**
   ```bash
   cp example-integration-test.ts my-api-test.ts
   # Customize and run
   ```

5. **Generate auth code instead of copy-paste**
   ```bash
   npx tsx generate-auth-code.ts --type bearer --token-var TOKEN
   # Copy output, paste in n8n
   ```

---

## 🎓 Learning Resources

### Beginner
1. Read `AUTH-INTEGRATION-GUIDE.md`
2. Try `npx tsx generate-auth-code.ts --type bearer`
3. Paste into n8n Code node
4. Test workflow

### Intermediate
1. Create custom integration test
2. Test OAuth flows
3. Build production workflows
4. Test credentials before deploy

### Advanced
1. Build CI/CD pipeline with tests
2. Create test suites for all APIs
3. Automate credential validation
4. Monitor OAuth token expiration

---

**🚀 Ready to build n8n workflows with confidence!**

Keep this card handy and refer to the detailed docs as needed:
- `AUTH-TOOLS-SUMMARY.md` for complete tool reference
- `AUTH-INTEGRATION-GUIDE.md` for deep integration examples

All tools support `--help` flag for more options.
