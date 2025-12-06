import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

type SyncType = 'stock' | 'orders' | 'customers' | 'invoices' | 'purchasing' | 'reference' | 'full';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const UNLEASHED_API_URL = 'https://api.unleashedsoftware.com';

function getUnleashedCredentials(store: string) {
  if (store === 'teelixir') {
    return {
      apiId: process.env.TEELIXIR_UNLEASHED_API_ID!,
      apiKey: process.env.TEELIXIR_UNLEASHED_API_KEY!,
    };
  }
  return null;
}

function generateSignature(queryString: string, apiKey: string): string {
  return crypto.createHmac('sha256', apiKey).update(queryString).digest('base64');
}

async function fetchUnleashed(endpoint: string, apiId: string, apiKey: string, queryString = '') {
  const signature = generateSignature(queryString, apiKey);
  const url = queryString
    ? `${UNLEASHED_API_URL}/${endpoint}?${queryString}`
    : `${UNLEASHED_API_URL}/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'api-auth-id': apiId,
      'api-auth-signature': signature,
    },
  });

  if (!response.ok) {
    throw new Error(`Unleashed API error: ${response.status}`);
  }

  return response.json();
}

async function fetchAllPages(endpoint: string, apiId: string, apiKey: string) {
  const allItems: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const queryString = `pageSize=200&page=${page}`;
    const data = await fetchUnleashed(endpoint, apiId, apiKey, queryString);
    allItems.push(...(data.Items || []));

    const pagination = data.Pagination;
    hasMore = pagination && page < pagination.NumberOfPages;
    page++;
  }

  return allItems;
}

async function syncStock(store: string, apiId: string, apiKey: string, supabase: any) {
  const items = await fetchAllPages('StockOnHand', apiId, apiKey);
  let synced = 0, failed = 0;

  for (const item of items) {
    const record = {
      store,
      product_guid: item.Guid,
      product_code: item.ProductCode,
      product_description: item.ProductDescription,
      qty_on_hand: item.QtyOnHand,
      available_qty: item.AvailableQty,
      allocated_qty: item.AllocatedQty,
      avg_cost: item.AverageLandedPricePerUnit,
      warehouse_code: item.WarehouseCode,
      warehouse_guid: item.WarehouseGuid,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_stock_on_hand')
      .upsert(record, { onConflict: 'store,product_guid,warehouse_guid' });

    if (error) failed++; else synced++;
  }

  return { endpoint: 'StockOnHand', synced, failed };
}

async function syncOrders(store: string, apiId: string, apiKey: string, supabase: any) {
  const items = await fetchAllPages('SalesOrders', apiId, apiKey);
  let synced = 0, failed = 0;

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      order_number: item.OrderNumber,
      order_date: item.OrderDate,
      required_date: item.RequiredDate,
      order_status: item.OrderStatus,
      customer_code: item.Customer?.CustomerCode,
      customer_name: item.Customer?.CustomerName,
      customer_guid: item.Customer?.Guid,
      sub_total: item.SubTotal,
      tax_total: item.TaxTotal,
      total: item.Total,
      warehouse_code: item.Warehouse?.WarehouseCode,
      warehouse_guid: item.Warehouse?.Guid,
      sales_order_lines: item.SalesOrderLines,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_sales_orders')
      .upsert(record, { onConflict: 'store,guid' });

    if (error) failed++; else synced++;
  }

  return { endpoint: 'SalesOrders', synced, failed };
}

async function syncCustomers(store: string, apiId: string, apiKey: string, supabase: any) {
  const items = await fetchAllPages('Customers', apiId, apiKey);
  let synced = 0, failed = 0;

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      customer_code: item.CustomerCode,
      customer_name: item.CustomerName,
      customer_type: item.CustomerType,
      email: item.Email,
      phone: item.PhoneNumber,
      mobile: item.MobileNumber,
      fax: item.FaxNumber,
      website: item.Website,
      contact_first_name: item.ContactFirstName,
      contact_last_name: item.ContactLastName,
      sell_price_tier: item.SellPriceTier,
      sell_price_tier_guid: item.SellPriceTierGuid,
      currency_code: item.Currency?.CurrencyCode,
      payment_term: item.PaymentTerm,
      obsolete: item.Obsolete ?? false,
      notes: item.Notes,
      addresses: item.Addresses,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_customers')
      .upsert(record, { onConflict: 'store,guid' });

    if (error) failed++; else synced++;
  }

  return { endpoint: 'Customers', synced, failed };
}

async function syncInvoices(store: string, apiId: string, apiKey: string, supabase: any) {
  const items = await fetchAllPages('Invoices', apiId, apiKey);
  let synced = 0, failed = 0;

  for (const item of items) {
    const record = {
      store,
      guid: item.Guid,
      invoice_number: item.InvoiceNumber,
      invoice_date: item.InvoiceDate,
      due_date: item.DueDate,
      invoice_status: item.InvoiceStatus,
      customer_code: item.Customer?.CustomerCode,
      customer_name: item.Customer?.CustomerName,
      customer_guid: item.Customer?.Guid,
      sub_total: item.SubTotal,
      tax_total: item.TaxTotal,
      total: item.Total,
      bc_status: item.BCStatus,
      sales_order_number: item.SalesOrderNumber,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_invoices')
      .upsert(record, { onConflict: 'store,guid' });

    if (error) failed++; else synced++;
  }

  return { endpoint: 'Invoices', synced, failed };
}

async function syncPurchasing(store: string, apiId: string, apiKey: string, supabase: any) {
  const results: any[] = [];

  // Sync Suppliers
  const suppliers = await fetchAllPages('Suppliers', apiId, apiKey);
  let suppliersSynced = 0, suppliersFailed = 0;

  for (const item of suppliers) {
    const record = {
      store,
      guid: item.Guid,
      supplier_code: item.SupplierCode,
      supplier_name: item.SupplierName,
      email: item.Email,
      phone: item.PhoneNumber,
      fax: item.FaxNumber,
      website: item.Website,
      contact_first_name: item.ContactFirstName,
      contact_last_name: item.ContactLastName,
      currency_code: item.Currency?.CurrencyCode,
      payment_term: item.PaymentTerm,
      obsolete: item.Obsolete ?? false,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_suppliers')
      .upsert(record, { onConflict: 'store,guid' });

    if (error) suppliersFailed++; else suppliersSynced++;
  }
  results.push({ endpoint: 'Suppliers', synced: suppliersSynced, failed: suppliersFailed });

  // Sync Purchase Orders
  const purchaseOrders = await fetchAllPages('PurchaseOrders', apiId, apiKey);
  let poSynced = 0, poFailed = 0;

  for (const item of purchaseOrders) {
    const record = {
      store,
      guid: item.Guid,
      order_number: item.OrderNumber,
      order_date: item.OrderDate,
      required_date: item.RequiredDate,
      order_status: item.OrderStatus,
      supplier_code: item.Supplier?.SupplierCode,
      supplier_name: item.Supplier?.SupplierName,
      supplier_guid: item.Supplier?.Guid,
      sub_total: item.SubTotal,
      tax_total: item.TaxTotal,
      total: item.Total,
      warehouse_code: item.Warehouse?.WarehouseCode,
      warehouse_guid: item.Warehouse?.Guid,
      purchase_order_lines: item.PurchaseOrderLines,
      raw_data: item,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ul_purchase_orders')
      .upsert(record, { onConflict: 'store,guid' });

    if (error) poFailed++; else poSynced++;
  }
  results.push({ endpoint: 'PurchaseOrders', synced: poSynced, failed: poFailed });

  return results;
}

async function syncReference(store: string, apiId: string, apiKey: string, supabase: any) {
  const results: any[] = [];

  // ProductGroups
  try {
    const items = await fetchUnleashed('ProductGroups', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const { error } = await supabase
        .from('ul_product_groups')
        .upsert({
          store, guid: item.Guid, group_name: item.GroupName,
          parent_group_guid: item.ParentGuid,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'ProductGroups', synced, failed });
  } catch (e) { results.push({ endpoint: 'ProductGroups', error: (e as Error).message }); }

  // Currencies
  try {
    const items = await fetchUnleashed('Currencies', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const { error } = await supabase
        .from('ul_currencies')
        .upsert({
          store, guid: item.Guid, currency_code: item.CurrencyCode, description: item.Description,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'Currencies', synced, failed });
  } catch (e) { results.push({ endpoint: 'Currencies', error: (e as Error).message }); }

  // SellPriceTiers
  try {
    const items = await fetchUnleashed('SellPriceTiers', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const tierGuid = `tier-${item.Tier || item.Name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
      const { error } = await supabase
        .from('ul_sell_price_tiers')
        .upsert({
          store, guid: tierGuid, tier_name: item.Name || `Tier ${item.Tier}`,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'SellPriceTiers', synced, failed });
  } catch (e) { results.push({ endpoint: 'SellPriceTiers', error: (e as Error).message }); }

  // PaymentTerms
  try {
    const items = await fetchUnleashed('PaymentTerms', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const { error } = await supabase
        .from('ul_payment_terms')
        .upsert({
          store, guid: item.Guid, terms_name: item.PaymentTermDescription || item.Name || 'Unknown',
          due_days: item.Days, obsolete: item.Obsolete ?? false,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'PaymentTerms', synced, failed });
  } catch (e) { results.push({ endpoint: 'PaymentTerms', error: (e as Error).message }); }

  // UnitsOfMeasure
  try {
    const items = await fetchUnleashed('UnitOfMeasures', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const { error } = await supabase
        .from('ul_units_of_measure')
        .upsert({
          store, guid: item.Guid, name: item.Name, obsolete: item.Obsolete ?? false,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'UnitsOfMeasure', synced, failed });
  } catch (e) { results.push({ endpoint: 'UnitsOfMeasure', error: (e as Error).message }); }

  // DeliveryMethods
  try {
    const items = await fetchUnleashed('DeliveryMethods', apiId, apiKey);
    let synced = 0, failed = 0;
    for (const item of items.Items || []) {
      const { error } = await supabase
        .from('ul_delivery_methods')
        .upsert({
          store, guid: item.Guid, name: item.Name, obsolete: item.Obsolete ?? false,
          raw_data: item, synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'store,guid' });
      if (error) failed++; else synced++;
    }
    results.push({ endpoint: 'DeliveryMethods', synced, failed });
  } catch (e) { results.push({ endpoint: 'DeliveryMethods', error: (e as Error).message }); }

  return results;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const supabase = getSupabase();

  try {
    const body = await request.json().catch(() => ({}));
    const store = body.store || 'teelixir';
    const syncType: SyncType = body.type || 'stock';

    const credentials = getUnleashedCredentials(store);
    if (!credentials) {
      return NextResponse.json({ error: `Unknown store: ${store}` }, { status: 400 });
    }

    const { apiId, apiKey } = credentials;
    if (!apiId || !apiKey) {
      return NextResponse.json({ error: 'Missing Unleashed credentials' }, { status: 500 });
    }

    console.log(`Starting Unleashed sync: store=${store}, type=${syncType}`);

    const results: any[] = [];

    switch (syncType) {
      case 'stock':
        results.push(await syncStock(store, apiId, apiKey, supabase));
        break;
      case 'orders':
        results.push(await syncOrders(store, apiId, apiKey, supabase));
        break;
      case 'customers':
        results.push(await syncCustomers(store, apiId, apiKey, supabase));
        break;
      case 'invoices':
        results.push(await syncInvoices(store, apiId, apiKey, supabase));
        break;
      case 'purchasing':
        results.push(...await syncPurchasing(store, apiId, apiKey, supabase));
        break;
      case 'reference':
        results.push(...await syncReference(store, apiId, apiKey, supabase));
        break;
      case 'full':
        results.push(await syncStock(store, apiId, apiKey, supabase));
        results.push(await syncOrders(store, apiId, apiKey, supabase));
        results.push(await syncCustomers(store, apiId, apiKey, supabase));
        results.push(await syncInvoices(store, apiId, apiKey, supabase));
        results.push(...await syncPurchasing(store, apiId, apiKey, supabase));
        results.push(...await syncReference(store, apiId, apiKey, supabase));
        break;
    }

    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + (r.synced || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);

    // Log to sync runs table
    try {
      await supabase.from('ul_sync_runs').insert({
        store,
        sync_type: syncType,
        status: totalFailed > 0 ? 'partial' : 'completed',
        records_synced: totalSynced,
        records_failed: totalFailed,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        details: results,
      });
    } catch (logError) {
      console.error('Failed to log sync run:', logError);
    }

    return NextResponse.json({
      success: true,
      store,
      type: syncType,
      results,
      summary: { synced: totalSynced, failed: totalFailed },
      duration,
    });

  } catch (error: any) {
    console.error('Unleashed sync error:', error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    job: 'unleashed-sync',
    types: ['stock', 'orders', 'customers', 'invoices', 'purchasing', 'reference', 'full'],
    description: 'Syncs Unleashed data to Supabase',
  });
}
