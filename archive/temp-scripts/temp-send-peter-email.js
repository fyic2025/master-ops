/**
 * Send Italy Order Update Email to Peter
 */

const { createClient } = require('@supabase/supabase-js');
const credsPath = require('path').join(__dirname, 'creds.js');
const creds = require(credsPath);

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

async function sendEmail() {
  // Get Gmail OAuth creds
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const clientId = await creds.get('teelixir', 'gmail_client_id');
  const clientSecret = await creds.get('teelixir', 'gmail_client_secret');
  const refreshToken = await creds.get('teelixir', 'gmail_refresh_token');

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Gmail OAuth credentials');
    process.exit(1);
  }

  // Refresh access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Failed to get access token:', error);
    process.exit(1);
  }

  const { access_token } = await tokenResponse.json();

  // Build email
  const to = 'peter@teelixir.com';
  const subject = 'Italy Order Adjusted & Ready - SO-00002471';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #2c5530; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .order-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .highlight { color: #2c5530; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #2c5530; color: white; }
    .total { font-size: 1.2em; font-weight: bold; color: #2c5530; }
    .action { background: #ff6b35; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block; margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Italy Order Ready for Fulfillment</h1>
  </div>

  <div class="content">
    <p>Hi Peter,</p>

    <p>The Italy order for Adhara Retreat has been adjusted and is ready to go.</p>

    <div class="order-box">
      <h2>New Order: <span class="highlight">SO-00002471</span></h2>
      <p><strong>Customer:</strong> Adhara Retreat Tuscany Italy (ARITALY)</p>
      <p><strong>Delivery:</strong> Localita Chiassa Superiore 254, 52100 Arezzo, Tuscany, Italy</p>
      <p class="total">Total: $312.84 AUD</p>
    </div>

    <h3>Adjustments Made:</h3>
    <ul>
      <li><strong>Removed:</strong> PP-50 (Pine Pollen 50g) - out of stock</li>
      <li><strong>Removed:</strong> SCH-250 (Schizandra 250g) - out of stock</li>
      <li><strong>Changed:</strong> PLIO-100 (Lions Mane 100g) from 2 → 1 unit (1 unit short)</li>
    </ul>

    <h3>Final Order Lines (8 items):</h3>
    <table>
      <tr><th>Qty</th><th>Product</th><th>Price</th><th>Total</th></tr>
      <tr><td>1</td><td>PEA-100 Pearl Beauty Tonic 100g</td><td>$31.56</td><td>$31.56</td></tr>
      <tr><td>2</td><td>MES-50 Organic Meshima 50g</td><td>$18.15</td><td>$36.29</td></tr>
      <tr><td>2</td><td>IMM-250 Mushroom Immunity 250g</td><td>$48.30</td><td>$96.60</td></tr>
      <tr><td>1</td><td>TT-250 Turkey Tail 250g</td><td>$42.00</td><td>$42.00</td></tr>
      <tr><td>1</td><td>COR-250 Cordyceps 250g</td><td>$44.10</td><td>$44.10</td></tr>
      <tr><td>1</td><td>REDP-30 Red Pine Needle Oil 30ml</td><td>$20.91</td><td>$20.91</td></tr>
      <tr><td>1</td><td>MATC-100 Japanese Matcha 100g</td><td>$26.80</td><td>$26.80</td></tr>
      <tr><td>1</td><td>PLIO-100 Lions Mane 100g (20% off)</td><td>$14.58</td><td>$14.58</td></tr>
    </table>

    <p class="total">Order Total: $312.84</p>

    <div class="action">⚠️ Action Required</div>
    <p>Please <strong>delete the old order SO-00002264</strong> in Unleashed manually, as the API doesn't support deletion.</p>

    <p>The new order SO-00002471 is ready to be fulfilled whenever you're ready.</p>

    <div class="footer">
      <p>Regards,<br><strong>Jayson</strong></p>
      <p style="font-size: 0.8em; color: #999;">This task has been updated in the dashboard at ops.growthcohq.com</p>
    </div>
  </div>
</body>
</html>
  `;

  // Build MIME message
  const fromEmail = 'colette@teelixir.com';
  const fromName = 'Teelixir Operations';

  const mimeMessage = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html
  ].join('\r\n');

  // Base64url encode
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send via Gmail API
  const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!sendResponse.ok) {
    const error = await sendResponse.text();
    console.error('Failed to send email:', error);
    process.exit(1);
  }

  const result = await sendResponse.json();
  console.log('✅ Email sent to peter@teelixir.com');
  console.log('   Message ID:', result.id);
  console.log('   Subject:', subject);
}

sendEmail().catch(console.error);
