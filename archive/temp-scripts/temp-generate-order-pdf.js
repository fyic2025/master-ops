/**
 * Generate Order PDF and Send to Peter
 */

const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const creds = require('./creds.js');

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const orderData = {
  order_number: 'SO-00002471',
  date: '2025-12-05',
  customer: {
    name: 'Adhara Retreat Tuscany Italy',
    code: 'ARITALY',
    contact: 'Valentine',
    email: 'adhararetreats@gmail.com'
  },
  delivery: {
    name: 'Adhara Retreat',
    address: 'Localita Chiassa Superiore 254',
    city: 'Arezzo',
    region: 'Tuscany',
    postcode: '52100',
    country: 'Italy'
  },
  lines: [
    { qty: 1, code: 'PEA-100', name: 'Teelixir Pearl Beauty Tonic 100g', price: 31.56, total: 31.56 },
    { qty: 2, code: 'MES-50', name: 'Organic Meshima 50g', price: 18.15, total: 36.29 },
    { qty: 2, code: 'IMM-250', name: 'Teelixir Organic Mushroom Immunity 250g', price: 48.30, total: 96.60, note: 'add free empty 50g immunity jar' },
    { qty: 1, code: 'TT-250', name: 'Teelixir Organic Turkey Tail Mushroom 250g', price: 42.00, total: 42.00, note: 'add free empty jar of turkey tail 50g' },
    { qty: 1, code: 'COR-250', name: 'Teelixir Organic Cordyceps Mushroom 250g', price: 44.10, total: 44.10, note: 'add free empty jar of 50g cordyceps' },
    { qty: 1, code: 'REDP-30', name: 'Teelixir Red Pine Needle Oil (Liquid) 30ml', price: 20.91, total: 20.91 },
    { qty: 1, code: 'MATC-100', name: 'Teelixir Organic Japanese Matcha 100g', price: 26.80, total: 26.80 },
    { qty: 1, code: 'PLIO-100', name: 'Teelixir Organic Pure Lions Mane 100g', price: 18.23, total: 14.58, discount: '20%' },
  ],
  subtotal: 312.84,
  tax: 0,
  total: 312.84,
  notes: 'Adjusted order: Removed PP-50 (Pine Pollen 50g - out of stock), Removed SCH-250 (Schizandra 250g - out of stock), Changed PLIO-100 (Lions Mane 100g) from 2 to 1 (1 unit short)'
};

async function generatePDF() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#2c5530').text('TEELIXIR', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text('Premium Adaptogens & Medicinal Mushrooms', { align: 'center' });
    doc.moveDown(2);

    // Order Title
    doc.fontSize(18).fillColor('#000').text('Sales Order', { align: 'center' });
    doc.fontSize(14).fillColor('#2c5530').text(orderData.order_number, { align: 'center' });
    doc.moveDown();

    // Order Info Box
    doc.fontSize(10).fillColor('#000');
    doc.text(`Order Date: ${orderData.date}`);
    doc.text(`Status: Parked (Ready for Fulfillment)`);
    doc.moveDown();

    // Customer & Delivery in two columns
    const leftX = 50;
    const rightX = 300;
    let y = doc.y;

    doc.fontSize(11).fillColor('#2c5530').text('BILL TO:', leftX, y);
    doc.fontSize(10).fillColor('#000');
    doc.text(orderData.customer.name, leftX, doc.y);
    doc.text(`Code: ${orderData.customer.code}`);
    doc.text(`Contact: ${orderData.customer.contact}`);
    doc.text(`Email: ${orderData.customer.email}`);

    doc.fontSize(11).fillColor('#2c5530').text('SHIP TO:', rightX, y);
    doc.fontSize(10).fillColor('#000');
    doc.text(orderData.delivery.name, rightX, doc.y);
    doc.text(orderData.delivery.address, rightX);
    doc.text(`${orderData.delivery.city}, ${orderData.delivery.region} ${orderData.delivery.postcode}`, rightX);
    doc.text(orderData.delivery.country, rightX);

    doc.moveDown(2);

    // Line Items Table
    const tableTop = doc.y + 10;
    const colWidths = { qty: 40, code: 80, desc: 200, price: 70, total: 70 };

    // Table Header
    doc.fillColor('#2c5530').rect(50, tableTop, 500, 20).fill();
    doc.fillColor('#fff').fontSize(9);
    doc.text('QTY', 55, tableTop + 5);
    doc.text('CODE', 95, tableTop + 5);
    doc.text('DESCRIPTION', 175, tableTop + 5);
    doc.text('PRICE', 380, tableTop + 5);
    doc.text('TOTAL', 450, tableTop + 5);

    // Table Rows
    let rowY = tableTop + 25;
    doc.fillColor('#000').fontSize(9);

    orderData.lines.forEach((line, i) => {
      const bg = i % 2 === 0 ? '#f9f9f9' : '#fff';
      doc.fillColor(bg).rect(50, rowY - 3, 500, line.note ? 28 : 18).fill();

      doc.fillColor('#000');
      doc.text(String(line.qty), 55, rowY);
      doc.text(line.code, 95, rowY);
      doc.text(line.name.substring(0, 40), 175, rowY);
      doc.text(`$${line.price.toFixed(2)}${line.discount ? ` (${line.discount})` : ''}`, 375, rowY);
      doc.text(`$${line.total.toFixed(2)}`, 450, rowY);

      if (line.note) {
        doc.fontSize(8).fillColor('#666');
        doc.text(`Note: ${line.note}`, 175, rowY + 12);
        doc.fontSize(9).fillColor('#000');
        rowY += 28;
      } else {
        rowY += 18;
      }
    });

    // Totals
    rowY += 10;
    doc.moveTo(350, rowY).lineTo(520, rowY).stroke();
    rowY += 10;

    doc.fontSize(10);
    doc.text('Subtotal:', 380, rowY);
    doc.text(`$${orderData.subtotal.toFixed(2)}`, 450, rowY);
    rowY += 15;

    doc.text('Tax:', 380, rowY);
    doc.text(`$${orderData.tax.toFixed(2)}`, 450, rowY);
    rowY += 15;

    doc.fontSize(12).fillColor('#2c5530');
    doc.text('TOTAL:', 380, rowY);
    doc.text(`$${orderData.total.toFixed(2)} AUD`, 445, rowY);

    // Notes Section
    if (orderData.notes) {
      rowY += 40;
      doc.fontSize(10).fillColor('#2c5530').text('ORDER NOTES:', 50, rowY);
      doc.fontSize(9).fillColor('#666').text(orderData.notes, 50, rowY + 15, { width: 500 });
    }

    // Footer
    doc.fontSize(8).fillColor('#999');
    doc.text('Teelixir Pty Ltd | 1/1 Capital Place, Carrum Downs VIC 3201 | teelixir.com', 50, 750, { align: 'center' });

    doc.end();
  });
}

async function uploadAndSendEmail(pdfBuffer) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Upload to Supabase Storage
  const fileName = `orders/SO-00002471-Italy-Order.pdf`;

  // Check if storage bucket exists, create if not
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets.find(b => b.name === 'documents')) {
    await supabase.storage.createBucket('documents', { public: true });
  }

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    // Continue anyway - we can still send the email with attachment
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
  const pdfUrl = urlData?.publicUrl;
  console.log('PDF URL:', pdfUrl);

  // Update task with PDF URL
  await supabase
    .from('tasks')
    .update({
      metadata: {
        order_number: 'SO-00002471',
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString()
      }
    })
    .eq('id', 18);

  // Get Gmail OAuth creds
  const clientId = await creds.get('teelixir', 'gmail_client_id');
  const clientSecret = await creds.get('teelixir', 'gmail_client_secret');
  const refreshToken = await creds.get('teelixir', 'gmail_refresh_token');

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

  const { access_token } = await tokenResponse.json();

  // Build email with PDF attachment
  const to = 'peter@teelixir.com';
  const subject = 'Italy Order PDF - SO-00002471 (Ready to Forward)';
  const boundary = `boundary_${Date.now()}`;

  const htmlBody = `
<p>Hi Peter,</p>

<p>Attached is the PDF for the adjusted Italy order <strong>SO-00002471</strong>.</p>

<p>You can forward this directly to Valentine at Adhara Retreat if needed.</p>

<p><strong>Order Summary:</strong></p>
<ul>
  <li>Customer: Adhara Retreat Tuscany Italy</li>
  <li>Total: $312.84 AUD</li>
  <li>8 line items</li>
</ul>

<p><strong>Adjustments made:</strong></p>
<ul>
  <li>Removed PP-50 (Pine Pollen 50g) - out of stock</li>
  <li>Removed SCH-250 (Schizandra 250g) - out of stock</li>
  <li>Changed PLIO-100 (Lions Mane 100g) from 2 to 1 unit</li>
</ul>

<p>The PDF is also available in the dashboard: <a href="${pdfUrl}">${pdfUrl}</a></p>

<p>Regards,<br>Jayson</p>
`;

  const mimeMessage = [
    `From: Teelixir Operations <colette@teelixir.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
    `--${boundary}`,
    'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="SO-00002471-Italy-Order.pdf"`,
    '',
    pdfBuffer.toString('base64'),
    `--${boundary}--`
  ].join('\r\n');

  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

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
  console.log('✅ Email with PDF sent to peter@teelixir.com');
  console.log('   Message ID:', result.id);

  return pdfUrl;
}

async function main() {
  console.log('Generating PDF...');
  const pdfBuffer = await generatePDF();
  console.log('PDF generated:', pdfBuffer.length, 'bytes');

  // Save locally for reference
  fs.writeFileSync('c:/Users/jayso/master-ops/temp/SO-00002471-Italy-Order.pdf', pdfBuffer);
  console.log('PDF saved locally');

  console.log('Uploading and sending email...');
  const url = await uploadAndSendEmail(pdfBuffer);
  console.log('Done! PDF URL:', url);
}

main().catch(console.error);
