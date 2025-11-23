# BigCommerce Theme Deployment Guide

Complete guide for deploying the Cornerstone-BOO-Cust theme to BigCommerce.

## 🚀 Quick Start

### First Time Setup

1. **Install dependencies:**
   ```bash
   # Run the setup script (Windows)
   setup-stencil.bat

   # Or manually:
   npm install
   npm install -g @bigcommerce/stencil-cli
   ```

2. **Initialize Stencil CLI** (if not done):
   ```bash
   npx @bigcommerce/stencil-cli init
   ```

   Enter your store details:
   - Store URL: `https://store-hhhi.mybigcommerce.com`
   - Access Token: (from existing `.stencil` file)
   - Port: `3000`

### Deployment Commands

```bash
# Validate theme (recommended first step)
node deploy.js --validate

# Deploy to preview/staging
node deploy.js --preview

# Deploy to production (with 5-second confirmation)
node deploy.js --production
```

---

## 📋 Deployment Workflow

### Step 1: Pre-Deployment Validation

**Always run validation first:**
```bash
node deploy.js --validate
```

**What it checks:**
- ✅ Theme builds without errors
- ✅ JavaScript syntax is valid
- ✅ No `!important` declarations in CSS
- ✅ All automated tests pass

**Expected output:**
```
✅ Build Test: PASSED
✅ JS Syntax: PASSED
✅ Important Count: PASSED (0 !important declarations)

✅ All validation tests passed! ✨
```

---

### Step 2: Preview Deployment (Staging)

**Deploy to staging environment:**
```bash
node deploy.js --preview
```

**What happens:**
1. Runs validation tests
2. Builds theme (`npm run build`)
3. Creates bundle (`stencil bundle`)
4. Uploads to BigCommerce preview URL
5. Provides testing checklist

**After deployment:**
- Visit preview URL in browser
- Complete [VISUAL-TESTING-GUIDE.md](./VISUAL-TESTING-GUIDE.md) (~30-45 min)
- Test critical features:
  - Navigation menu styling
  - Brands page autocomplete
  - Infinite scroll on categories
  - Checkout flow
  - Mobile responsiveness

---

### Step 3: Production Deployment

**⚠️ Only after successful preview testing!**

```bash
node deploy.js --production
```

**What happens:**
1. Shows 5-second confirmation warning
2. Creates backup of current live theme
3. Runs validation tests
4. Builds and bundles theme
5. Uploads to production
6. Activates theme on live store

**Safety features:**
- Automatic backup before deployment
- 5-second cancellation window
- Backup saved to `./backups/backup-YYYY-MM-DD/`

---

## 🛠️ Advanced Usage

### Build Only (No Upload)

```bash
node deploy.js --build
```

Creates the theme bundle without uploading.

### Skip Validation

```bash
node deploy.js --preview --skip-validation
```

**⚠️ Not recommended** - Use only if you already ran validation separately.

### Manual Stencil Commands

```bash
# Start local development server
npx @bigcommerce/stencil-cli start

# Create bundle manually
npx @bigcommerce/stencil-cli bundle

# Upload manually
npx @bigcommerce/stencil-cli push

# Upload and activate
npx @bigcommerce/stencil-cli push --activate
```

---

## 🔧 Troubleshooting

### Error: "Stencil CLI not found"

**Solution 1:** Install globally
```bash
npm install -g @bigcommerce/stencil-cli
```

**Solution 2:** Use npx (automatic)
```bash
npx @bigcommerce/stencil-cli --version
```

The deployment script uses `npx` by default, so global installation is optional.

---

### Error: ".stencil configuration file not found"

**Solution:** Initialize Stencil CLI
```bash
npx @bigcommerce/stencil-cli init
```

Or copy the existing `.stencil` file if you have one backed up.

**File contents should look like:**
```json
{
  "normalStoreUrl": "https://store-hhhi.mybigcommerce.com",
  "accessToken": "your-access-token",
  "port": 3000,
  "apiVersion": "v3"
}
```

---

### Error: "Build failed"

**Solution:** Check npm dependencies
```bash
npm install
npm run build
```

Look for specific errors in the webpack output.

---

### Error: "Upload failed"

**Possible causes:**
1. Invalid access token in `.stencil`
2. Network connectivity issues
3. Store API permissions

**Solutions:**
- Verify `.stencil` credentials
- Check BigCommerce store API settings
- Ensure you have theme upload permissions

---

## 📊 Deployment Checklist

### Before Every Deployment

- [ ] All code changes committed to git
- [ ] Validation tests pass (`node deploy.js --validate`)
- [ ] Build completes without errors
- [ ] No console errors in development

### Before Production Deployment

- [ ] Preview deployment tested successfully
- [ ] Visual testing guide completed (VISUAL-TESTING-GUIDE.md)
- [ ] All critical features verified:
  - [ ] Navigation menu
  - [ ] Brands page autocomplete
  - [ ] Infinite scroll
  - [ ] Checkout flow
  - [ ] Mobile responsiveness
- [ ] Team notified of deployment
- [ ] Backup created (automatic with deploy script)

### After Production Deployment

- [ ] Visit live store and verify homepage
- [ ] Test checkout process
- [ ] Check mobile view
- [ ] Monitor for customer reports (first hour)
- [ ] Run Lighthouse audit
- [ ] Document any issues

---

## 🔄 Rollback Procedure

If something goes wrong in production:

### Option 1: Revert via BigCommerce Admin

1. Login to BigCommerce admin
2. Go to **Storefront** → **My Themes**
3. Find the previous theme version
4. Click **Activate**

### Option 2: Restore from Backup

```bash
# Navigate to backup directory
cd backups/backup-YYYY-MM-DD

# Initialize if needed
npx @bigcommerce/stencil-cli init

# Upload backup theme
npx @bigcommerce/stencil-cli push --activate
```

---

## 📁 File Structure

```
buy-organics-online/theme/
├── deploy.js                    # Deployment automation script
├── setup-stencil.bat           # Windows setup script
├── DEPLOYMENT-README.md        # This file
├── VISUAL-TESTING-GUIDE.md     # Testing checklist
├── VALIDATION-REPORT.md        # Automated validation results
├── .stencil                    # Store credentials (DO NOT COMMIT)
├── config.json                 # Theme configuration
├── package.json                # Dependencies
├── assets/                     # CSS, JS, images
├── templates/                  # Handlebars templates
└── backups/                    # Automatic backups
    └── backup-YYYY-MM-DD/      # Timestamped backups
```

---

## 🔒 Security Notes

### Files to NEVER Commit

- `.stencil` - Contains access tokens
- `secrets.stencil.json` - Contains API credentials
- `*.zip` - Theme bundles

These are already in `.gitignore`:
```
**/.stencil
**/secrets.stencil.json
*.zip
```

### Access Token Management

- Access tokens are sensitive credentials
- Never share or commit them
- Rotate tokens if compromised
- Use separate tokens for staging/production

---

## 📞 Support

### BigCommerce Resources

- [Stencil CLI Documentation](https://developer.bigcommerce.com/stencil-docs/installing-stencil-cli/installing-stencil)
- [Theme Development Guide](https://developer.bigcommerce.com/stencil-docs)
- [API Reference](https://developer.bigcommerce.com/api-reference)

### Project Documentation

- [STAGE-2-FINAL-REPORT.md](./STAGE-2-FINAL-REPORT.md) - All modifications
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md) - Automated tests
- [VISUAL-TESTING-GUIDE.md](./VISUAL-TESTING-GUIDE.md) - Manual testing

---

## 🎯 Next Steps

1. **First deployment?** Run setup:
   ```bash
   setup-stencil.bat
   ```

2. **Ready to deploy?** Start with validation:
   ```bash
   node deploy.js --validate
   ```

3. **Tests passed?** Deploy to preview:
   ```bash
   node deploy.js --preview
   ```

4. **Preview tested?** Deploy to production:
   ```bash
   node deploy.js --production
   ```

---

**Last Updated:** November 22, 2025
**Theme Version:** 4.9.0
**Status:** Ready for Deployment
