# Gmail App Password Setup Guide

**Account:** jayson@fyic.com.au
**Purpose:** Allow Claude Code to send system emails, alerts, and notifications

---

## Quick Setup (5 minutes)

### Step 1: Enable 2-Factor Authentication (if not already)

1. Go to: https://myaccount.google.com/security
2. Under "How you sign in to Google"
3. Click "2-Step Verification"
4. Follow prompts to enable

**Note:** If already enabled, proceed to Step 2.

---

### Step 2: Generate App Password

1. **Go directly to:** https://myaccount.google.com/apppasswords

   **OR navigate:**
   - Google Account → Security → 2-Step Verification → App passwords (at bottom)

2. **You may need to sign in again**

3. **Create app password:**
   - Select app: **"Mail"**
   - Select device: **"Other (Custom name)"**
   - Enter name: **"Claude Code - BOO Migration System"**
   - Click **"Generate"**

4. **COPY THE 16-CHARACTER PASSWORD**
   - Format: `abcd efgh ijkl mnop` (4 groups of 4 letters)
   - This will only be shown ONCE
   - Save it immediately

---

### Step 3: Add to Credentials File

Open: `C:\Users\jayso\master-ops\MASTER-CREDENTIALS-COMPLETE.env`

Update line 145:
```bash
# Before:
GMAIL_APP_PASSWORD=<GENERATE NOW - See instructions below>

# After:
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Replace `abcd efgh ijkl mnop` with your actual 16-character password**

---

### Step 4: Share with Claude Code

Once you've added the password to the file, just paste the complete credentials file in the chat or let me know it's ready, and I'll:

✅ Configure email sending for all systems
✅ Set up error alerts
✅ Enable daily sync reports
✅ Configure system notifications

---

## What This Enables

With Gmail configured, I can send:

- **Critical Error Alerts** - Immediate notification when syncs fail
- **Daily Summary Reports** - Overview of all sync activities
- **Product Match Reports** - CSV exports of matching results
- **System Health Checks** - Weekly status updates
- **Approval Notifications** - New products awaiting review

---

## Security Notes

✅ **App passwords are MORE secure** than your regular Gmail password
✅ Can be revoked anytime without affecting your Gmail access
✅ Only works for this specific application
✅ Your main Gmail password stays private

**To revoke later:**
- Go back to: https://myaccount.google.com/apppasswords
- Click the trash icon next to "Claude Code - BOO Migration System"

---

## Troubleshooting

**Problem:** "App passwords" option not available
- **Solution:** Enable 2-Factor Authentication first (Step 1)

**Problem:** Can't find App passwords section
- **Solution:** Use direct link: https://myaccount.google.com/apppasswords

**Problem:** Password doesn't work
- **Solution:** Make sure to remove spaces when entering (or keep as 4 groups of 4)

---

**Ready?** Once you have the app password, paste it in the credentials file and we're good to go! 🚀
