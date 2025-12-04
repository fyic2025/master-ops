const data = require('./temp-orders.json');
if (!data.orders) {
  console.log('Error:', JSON.stringify(data));
  process.exit(1);
}
for (const order of data.orders) {
  console.log('Order #' + order.order_number);
  for (const item of order.line_items) {
    const price = parseFloat(item.price);
    const isFree = price === 0;
    const sku = item.sku || 'NO_SKU';
    const title = item.title.substring(0, 50);
    console.log(`  SKU: "${sku}" | ${title} | $${item.price}${isFree ? ' [FREE]' : ''}`);
  }
  console.log('');
}
