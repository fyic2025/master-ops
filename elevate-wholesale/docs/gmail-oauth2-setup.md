# Gmail OAuth2 Setup for Elevate Wholesale Prospecting

This guide walks you through setting up Gmail OAuth2 credentials for the prospecting email system.

## Prerequisites

- A Google Workspace account (e.g., `outreach@elevatewholesale.com.au`)
- Access to Google Cloud Console

## Step 1: Create or Access Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one (e.g., "Elevate Wholesale Automation")
3. Note the project ID

## Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Gmail API"
3. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **Internal** (for Google Workspace) or **External**
3. Fill in:
   - App name: `Elevate Wholesale Prospecting`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. On Scopes page, click **Add or Remove Scopes**
6. Add: `https://www.googleapis.com/auth/gmail.send`
7. Click **Save and Continue**

## Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Desktop app**
4. Name: `Elevate Prospecting CLI`
5. Click **Create**
6. **Download the JSON** or note down:
   - Client ID
   - Client Secret

## Step 5: Get Refresh Token

### Option A: Using OAuth Playground (Recommended)

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click **Settings** (gear icon) in top right
3. Check **Use your own OAuth credentials**
4. Enter your Client ID and Client Secret
5. In left panel, find **Gmail API v1**
6. Select: `https://www.googleapis.com/auth/gmail.send`
7. Click **Authorize APIs**
8. Sign in with the Gmail account that will send emails
9. Click **Exchange authorization code for tokens**
10. Copy the **Refresh Token**

### Option B: Using Script

Run this script and follow the URL:

```bash
npx tsx elevate-wholesale/scripts/gmail-oauth-setup.ts
```

## Step 6: Add to Environment Variables

Add these to your `.env` file:

```bash
# Gmail OAuth2 for Elevate Prospecting
ELEVATE_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
ELEVATE_GMAIL_CLIENT_SECRET=your-client-secret
ELEVATE_GMAIL_REFRESH_TOKEN=your-refresh-token
ELEVATE_GMAIL_USER_EMAIL=outreach@elevatewholesale.com.au
ELEVATE_GMAIL_FROM_NAME=Elevate Wholesale
```

## Step 7: Test the Connection

```bash
npx tsx elevate-wholesale/scripts/test-gmail.ts
```

## Troubleshooting

### "Token has been expired or revoked"

The refresh token may have expired. Re-run Step 5 to get a new one.

### "Access blocked: This app's request is invalid"

1. Check OAuth consent screen is configured
2. Ensure the Gmail API is enabled
3. Verify the redirect URI matches

### "Insufficient Permission"

Make sure the `gmail.send` scope was authorized in Step 5.

### Rate Limits

Gmail has sending limits:
- Personal accounts: ~500 emails/day
- Google Workspace: ~2,000 emails/day

The prospecting system defaults to 5 emails/day which is well within limits.

## Security Notes

- **Never commit credentials to git** - use `.env` files
- Refresh tokens don't expire but can be revoked
- Store credentials securely (Supabase Vault recommended for production)
