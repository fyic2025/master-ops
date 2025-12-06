# SECURITY CLEANUP GUIDE

**Date:** 2025-11-24
**Purpose:** Remove hardcoded credentials from source code
**Status:** Ready to execute

---

## 🚨 CRITICAL SECURITY ISSUES FOUND

During analysis of the codebase, **35+ hardcoded credentials** were discovered in source files:

- ✅ Supabase service role keys (2 projects)
- ✅ BigCommerce API tokens (2 sets)
- ✅ FTP passwords (Oborne/CH2)
- ✅ Database passwords
- ✅ Xero OAuth secrets (2 businesses)
- ✅ Shopify admin tokens
- ✅ Unleashed API keys
- ✅ Klaviyo API keys (3 businesses)
- ✅ HubSpot access tokens
- ✅ n8n API keys
- ✅ Smartlead API keys

**Risk Level:** HIGH - These credentials are exposed in git history and source code

---

## 🛠️ CLEANUP PROCESS

### Step 1: Backup Current Code

```bash
# Create a backup of fyic-portal
cd C:\Users\jayso
cp -r fyic-portal fyic-portal-backup-$(date +%Y%m%d)
```

### Step 2: Run Security Cleanup (Dry Run)

Test what would be changed WITHOUT modifying files:

```bash
cd C:\Users\jayso\master-ops\buy-organics-online
node security-cleanup.js --dry-run --path=../../fyic-portal
```

This will show you:
- Which files would be modified
- How many replacements would be made
- What credentials would be replaced

### Step 3: Review Changes

Review the dry-run output carefully. Ensure:
- Only credential values are being replaced
- Environment variable names are correct
- No false positives (legitimate code being changed)

### Step 4: Run Security Cleanup (Live)

Once satisfied with dry-run results, execute cleanup:

```bash
cd C:\Users\jayso\master-ops\buy-organics-online
node security-cleanup.js --path=../../fyic-portal
```

This will:
- Create `.backup` files for all modified files
- Replace credentials with `process.env.VARIABLE_NAME`
- Show summary of changes

### Step 5: Create .env File

Copy the master credentials file to create your application .env:

```bash
cd C:\Users\jayso\fyic-portal
cp ../master-ops/MASTER-CREDENTIALS-COMPLETE.env .env
```

### Step 6: Update .gitignore

Add security rules to prevent future credential leaks:

```bash
cd C:\Users\jayso\fyic-portal

# Append gitignore rules
cat ../master-ops/buy-organics-online/.gitignore-additions.txt >> .gitignore

# Verify .env is ignored
git check-ignore .env
# Should output: .env
```

### Step 7: Test Application

Start the application and verify it works with environment variables:

```bash
cd C:\Users\jayso\fyic-portal

# Load environment variables
source .env  # or use dotenv package

# Run application
npm start

# Test critical endpoints
# - Supabase connection
# - BigCommerce API
# - Supplier feeds
```

### Step 8: Verify Changes

Check a few modified files manually:

```bash
# Before (in .backup file)
grep "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/config/*.ts.backup

# After (in current file)
grep "process.env.BOO_SUPABASE_SERVICE_ROLE_KEY" src/config/*.ts
```

### Step 9: Commit Cleaned Code

```bash
cd C:\Users\jayso\fyic-portal

git add .
git commit -m "Security: Remove hardcoded credentials, use environment variables

- Replaced 35+ hardcoded credentials with env vars
- Added .env to .gitignore
- Created .env.template for documentation

🔒 Security cleanup completed"
```

### Step 10: Delete Backup Files

Once verified everything works:

```bash
cd C:\Users\jayso\fyic-portal
find . -name "*.backup" -delete
```

---

## 🔑 CREDENTIAL ROTATION

**IMPORTANT:** Some credentials were exposed in git history and should be rotated:

### High Priority (Rotate Immediately)

1. **Supabase Service Role Keys**
   - BOO: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/settings/api
   - Elevate: https://supabase.com/dashboard/project/xioudaqfmkdpkgujxehv/settings/api
   - Action: Generate new service role key, update .env

2. **BigCommerce API Tokens**
   - Dashboard: https://store-hhhi.mybigcommerce.com/manage/settings/api
   - Action: Revoke old tokens, create new API account

3. **Xero OAuth Secrets**
   - Elevate: https://developer.xero.com/app/manage/
   - Teelixir: https://developer.xero.com/app/manage/
   - Action: Regenerate client secrets

### Medium Priority (Rotate Soon)

4. **Shopify Admin Token**
   - Elevate: https://elevatewholesale.myshopify.com/admin/settings/apps/development
   - Action: Create new private app, delete old

5. **HubSpot Access Token**
   - Dashboard: https://app.hubspot.com/private-apps/
   - Action: Regenerate access token

6. **n8n API Key**
   - Dashboard: https://automation.growthcohq.com/settings/api
   - Action: Generate new API key

### Low Priority (Monitor)

7. **Klaviyo API Keys** (read-only impact)
8. **Smartlead API Key** (limited scope)
9. **Unleashed API Key** (rarely changes)

---

## 📋 VERIFICATION CHECKLIST

After cleanup, verify:

- [ ] Application starts without errors
- [ ] Supabase connections work
- [ ] BigCommerce API calls succeed
- [ ] Supplier feeds download correctly
- [ ] No hardcoded credentials in source files
- [ ] .env file exists and has all variables
- [ ] .env is in .gitignore
- [ ] .backup files deleted
- [ ] Changes committed to git
- [ ] High-priority credentials rotated

---

## 🔍 FIND REMAINING CREDENTIALS

After automated cleanup, manually search for any remaining credentials:

```bash
cd C:\Users\jayso\fyic-portal

# Search for common patterns
grep -r "password\s*=\s*['\"]" src/
grep -r "api.*key\s*=\s*['\"]" src/
grep -r "secret\s*=\s*['\"]" src/
grep -r "token\s*=\s*['\"]" src/

# Search for long base64 strings (JWT tokens)
grep -r "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" src/

# Search for AWS keys
grep -r "AKIA[0-9A-Z]{16}" src/
```

---

## 🚀 AUTOMATION FOR NEW CODE

To prevent future credential leaks, set up pre-commit hooks:

### Option 1: git-secrets (Recommended)

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Configure for repository
cd C:\Users\jayso\fyic-portal
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'  # JWT tokens
git secrets --add '[a-f0-9]{32,}'  # Long hex strings
git secrets --add 'pk_[a-z0-9]{30,}'  # Klaviyo keys
```

### Option 2: pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing credentials

if git diff --cached | grep -E "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*|AKIA[0-9A-Z]{16}|pk_[a-z0-9]{30,}"; then
  echo "❌ ERROR: Possible credentials detected in commit!"
  echo "   Please use environment variables instead."
  exit 1
fi

echo "✅ No credentials detected"
exit 0
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## 📊 EXPECTED RESULTS

After running security-cleanup.js, you should see:

```
========================================
CLEANUP SUMMARY
========================================

Files scanned:   127
Files modified:  23
Replacements:    35+
Errors:          0

✅ Cleanup complete! Backup files created with .backup extension

Next steps:
  1. Review modified files
  2. Add .env file to .gitignore
  3. Create .env file from MASTER-CREDENTIALS-COMPLETE.env
  4. Test application with new environment variables
  5. Delete .backup files once verified
  6. Commit cleaned code to git
```

---

## ❓ TROUBLESHOOTING

### Issue: Application fails to start after cleanup

**Solution:** Check .env file exists and has all required variables

```bash
cd C:\Users\jayso\fyic-portal
ls -la .env
# Should show .env file

# Check if all variables are set
source .env
echo $BOO_SUPABASE_URL
# Should show: https://usibnysqelovfuctmkqw.supabase.co
```

### Issue: "process.env.X is undefined"

**Solution:** Ensure environment variables are loaded before app starts

```typescript
// Add to top of main file
import * as dotenv from 'dotenv';
dotenv.config();
```

### Issue: Some credentials not replaced

**Solution:** Check if pattern exists in REPLACEMENTS array

```bash
# Search for unreplaced credential
grep -r "your-credential-value" src/

# Add to security-cleanup.js REPLACEMENTS array if found
```

---

## 🎯 SUCCESS CRITERIA

Security cleanup is complete when:

1. ✅ No hardcoded credentials in source files
2. ✅ All credentials in .env file
3. ✅ .env in .gitignore
4. ✅ Application runs successfully
5. ✅ High-priority credentials rotated
6. ✅ Pre-commit hooks installed
7. ✅ Team trained on security practices

---

**Last Updated:** 2025-11-24
**Next Review:** After migration complete
