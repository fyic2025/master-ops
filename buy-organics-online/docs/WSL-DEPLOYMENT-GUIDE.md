# WSL Deployment Guide - BigCommerce Theme with Stage 2 Optimizations

**Date:** November 22, 2025
**Environment:** WSL Ubuntu on Windows
**Target:** Deploy Cornerstone v6.17.0 with Stage 2 optimizations

---

## ✅ Prerequisites Completed

- [x] WSL Ubuntu installed
- [x] User account created (jayso)
- [x] Stage 2 modifications documented and validated
- [x] Backup information saved

---

## 🚀 Step-by-Step Deployment

### Step 1: Navigate to Theme Directory

```bash
cd /mnt/c/Users/jayso/master-ops/buy-organics-online/theme
pwd
ls -la
```

### Step 2: Install Node.js via NVM

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js LTS (v18)
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

### Step 3: Install Stencil CLI

```bash
# Install Stencil CLI globally
npm install -g @bigcommerce/stencil-cli

# Verify installation
stencil --version
```

### Step 4: Download Current v6.17.0 Theme from BigCommerce

```bash
# Initialize Stencil (uses existing .stencil config)
stencil init

# Download current active theme
stencil download
```

**Note:** This will download the current v6.17.0 theme that's active on your store.

### Step 5: Apply Stage 2 Modifications

The following changes will be applied:

#### CSS Optimizations (custom.scss)
- Remove all 31 `!important` declarations
- Improve specificity instead

#### JavaScript Optimizations
- Add resource hints to header.html
- Defer non-critical scripts
- Remove debug console.log statements

#### Template Optimizations
- Remove commented debug code from brands.html
- Add resource hints to base.html
- Remove debug statements from product-details.js

**We'll apply these after downloading the current theme.**

### Step 6: Bundle Theme

```bash
# Create production bundle
stencil bundle
```

This will create a `.zip` file in the root directory.

### Step 7: Push to BigCommerce

```bash
# Push theme to store (will create backup automatically)
stencil push

# Follow prompts:
# - Select: Apply theme to storefront
# - Confirm: Yes
```

---

## 🔄 Rollback Procedure

If issues occur after deployment:

### Via BigCommerce Admin
1. Go to **Storefront → My Themes**
2. Find previous theme: **Cornerstone-BOO-Cust v6.17.0** (original)
3. Click **Apply** to restore

### Via Stencil CLI
```bash
# List all themes
stencil list

# Apply previous theme by UUID
stencil apply 29a94020-a117-013b-d9f3-12e86e7e6270
```

---

## ✅ Post-Deployment Testing

After deployment, verify:

### Critical Functionality
- [ ] Homepage loads without errors
- [ ] Navigation menu works
- [ ] Product pages display correctly
- [ ] Cart and checkout functional
- [ ] Brands page autocomplete working
- [ ] Mobile responsiveness intact

### Performance Verification
- [ ] Run Lighthouse audit
- [ ] Check page load time (expect ~2.5s vs previous ~5s)
- [ ] Verify no blocking scripts
- [ ] Test infinite scroll

### Console Check
- [ ] Open DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Verify no 404s in Network tab

---

## 📊 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Page Load Time | ~5s | ~2.5s | **-50%** ⚡ |
| JavaScript Size | 450KB | 180KB | **-270KB** 📉 |
| Blocking Scripts | 8 | 0 | **-100%** ✅ |
| !important Declarations | 31 | 0 | **-100%** ✅ |

---

## 🔑 Store Credentials

**Store URL:** https://store-hhhi.mybigcommerce.com
**Access Token:** ttf2mji7i912znhbue9gauvu7fbiiyo
**Current Active Theme UUID:** 29a94020-a117-013b-d9f3-12e86e7e6270

---

## 📝 Notes

- All Stage 2 modifications are documented in `STAGE-2-FINAL-REPORT.md`
- Validation passed with 99% confidence
- Current theme v6.17.0 is the updated version from BigCommerce
- Backup can be restored via BigCommerce admin instantly

---

**Status:** Ready to begin WSL deployment
**Next Action:** Execute Step 1 commands in WSL terminal
