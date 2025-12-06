import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Generate invoice HTML for PDF
function generateInvoiceHTML(invoice: any): string {
  const lines = invoice.invoice_lines || [];

  const lineItemsHTML = lines.map((line: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${line.product_code}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${line.product_description || ''}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${line.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(line.unit_price || 0)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency((line.quantity || 0) * (line.unit_price || 0))}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @page { margin: 40px; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      margin: 0;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #059669;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      margin: 0;
      font-size: 32px;
      color: #1f2937;
    }
    .invoice-number {
      font-size: 16px;
      color: #6b7280;
      margin-top: 4px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .detail-section h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
    }
    .detail-section p {
      margin: 4px 0;
      color: #374151;
    }
    .detail-section .name {
      font-weight: 600;
      font-size: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    thead th:nth-child(3),
    thead th:nth-child(4),
    thead th:nth-child(5) {
      text-align: right;
    }
    thead th:nth-child(3) {
      text-align: center;
    }
    .totals {
      width: 300px;
      margin-left: auto;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: 700;
      border-bottom: none;
      padding-top: 12px;
      color: #059669;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .footer p {
      margin: 4px 0;
    }
    .payment-details {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .payment-details h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #6b7280;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TEELIXIR</div>
    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
  </div>

  <div class="details-grid">
    <div class="detail-section">
      <h3>Bill To</h3>
      <p class="name">${invoice.customer_name}</p>
      <p>Customer Code: ${invoice.customer_code}</p>
    </div>
    <div class="detail-section" style="text-align: right;">
      <h3>Invoice Details</h3>
      <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoice_date)}</p>
      <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
      ${invoice.sales_order_number ? `<p><strong>Order:</strong> ${invoice.sales_order_number}</p>` : ''}
      <p><strong>Status:</strong> ${invoice.bc_status || 'Unpaid'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML || `
        <tr>
          <td colspan="5" style="padding: 20px; text-align: center; color: #6b7280;">
            No line items
          </td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.sub_total || 0)}</span>
    </div>
    <div class="totals-row">
      <span>GST (10%)</span>
      <span>${formatCurrency(invoice.tax_total || 0)}</span>
    </div>
    <div class="totals-row total">
      <span>Total AUD</span>
      <span>${formatCurrency(invoice.total || 0)}</span>
    </div>
  </div>

  <div class="payment-details">
    <h3>Payment Details</h3>
    <p><strong>Bank:</strong> Commonwealth Bank</p>
    <p><strong>Account Name:</strong> Teelixir Pty Ltd</p>
    <p><strong>BSB:</strong> 063-000</p>
    <p><strong>Account Number:</strong> Please contact for details</p>
    <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
  </div>

  <div class="footer">
    <p><strong>Teelixir Pty Ltd</strong></p>
    <p>ABN: 95 614 127 824</p>
    <p>Email: wholesale@teelixir.com</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';

    // Fetch invoice by id or invoice_number
    let invoice;

    // Try UUID first
    const { data: byId } = await supabase
      .from('ul_invoices')
      .select('*')
      .eq('id', id)
      .eq('store', store)
      .single();

    if (byId) {
      invoice = byId;
    } else {
      // Try by invoice_number
      const { data: byNumber } = await supabase
        .from('ul_invoices')
        .select('*')
        .eq('invoice_number', id)
        .eq('store', store)
        .single();

      invoice = byNumber;
    }

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Generate HTML
    const html = generateInvoiceHTML(invoice);

    // Return HTML for browser printing/PDF generation
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="Invoice-${invoice.invoice_number}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
