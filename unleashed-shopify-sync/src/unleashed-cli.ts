#!/usr/bin/env node
/**
 * Unleashed CLI
 *
 * Command-line interface for managing Unleashed sales orders
 * Now with Supabase storage for edit-then-sync workflow
 *
 * Usage:
 *   npx tsx src/unleashed-cli.ts <command> [options]
 *
 * Commands:
 *   get <order>              Get order details
 *   list                     List recent orders
 *   status <order> <status>  Update order status
 *   add-line <order>         Add line item to order
 *   remove-line <order>      Remove line item from order
 *   update-qty <order>       Update line quantity
 *   create                   Create new order
 *   customer <code>          Get customer details
 *   product <code>           Get product details
 *   search-products <query>  Search products
 *
 * Store Commands (Supabase):
 *   pull <order>             Pull order from Unleashed to Supabase
 *   edit <order>             Show stored order for editing
 *   edit-remove <order> <product>    Remove line in Supabase
 *   edit-qty <order> <product> <qty> Update qty in Supabase
 *   push <order>             Push edited order to Unleashed (delete+create)
 */

import { UnleashedClient, printOrder, formatCurrency, parseUnleashedDate, formatDate } from './unleashed-api.js'
import { OrderStore } from './order-store.js'

const STORE = process.env.UNLEASHED_STORE || 'teelixir'

function usage(): void {
  console.log(`
Unleashed CLI - Manage Sales Orders

Usage:
  npx tsx src/unleashed-cli.ts <command> [options]

Commands:
  get <order-number>                    Get order details (e.g., SO-00002264)
  list [--status=X] [--days=N]          List orders (default: last 30 days)
  status <order> <status>               Update status (Open|Parked|Placed|Completed)
  add-line <order> <product> <qty> <price> [comment]   Add line item
  remove-line <order> <product>         Remove line by product code
  update-qty <order> <product> <qty>    Update line quantity
  create --customer=X --product=X:qty:price [--product=Y:qty:price ...]
  customer <code>                       Get customer by code
  search-customer <name>                Search customers
  product <code>                        Get product by code
  search-products <query>               Search products
  stock <product-code>                  Check stock levels

Store Commands (edit in Supabase, push to Unleashed):
  pull <order>                          Pull order from Unleashed → Supabase
  edit <order>                          Show order from Supabase
  edit-remove <order> <product>         Remove line in Supabase
  edit-qty <order> <product> <qty>      Update qty in Supabase
  edit-notes <order> <notes>            Update order notes in Supabase
  push <order>                          Push to Unleashed (delete old + create new)

Options:
  --store=<name>                        Store to use (teelixir|elevate), default: teelixir
  --json                                Output raw JSON

Environment:
  UNLEASHED_STORE                       Default store (teelixir|elevate)
  SUPABASE_SERVICE_KEY                  Supabase service key (for store commands)

Examples:
  # Direct Unleashed operations:
  npx tsx src/unleashed-cli.ts get SO-00002264
  npx tsx src/unleashed-cli.ts list --status=Parked --days=7

  # Edit workflow (stores in Supabase, then syncs):
  npm run u pull SO-00002264              # Pull to Supabase
  npm run u edit-remove SO-00002264 PP-50 # Remove line locally
  npm run u edit-qty SO-00002264 PLIO-100 1  # Change qty locally
  npm run u push SO-00002264              # Push changes to Unleashed
`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage()
    process.exit(0)
  }

  // Parse global options
  let store = STORE
  let jsonOutput = false
  const filteredArgs: string[] = []

  for (const arg of args) {
    if (arg.startsWith('--store=')) {
      store = arg.split('=')[1]
    } else if (arg === '--json') {
      jsonOutput = true
    } else {
      filteredArgs.push(arg)
    }
  }

  const command = filteredArgs[0]
  const client = UnleashedClient.fromStore(store)

  try {
    switch (command) {
      case 'get': {
        const orderNumber = filteredArgs[1]
        if (!orderNumber) {
          console.error('Error: Order number required')
          process.exit(1)
        }
        const order = await client.getSalesOrder(orderNumber)
        if (!order) {
          console.error(`Order not found: ${orderNumber}`)
          process.exit(1)
        }
        if (jsonOutput) {
          console.log(JSON.stringify(order, null, 2))
        } else {
          printOrder(order)
        }
        break
      }

      case 'list': {
        const options: { startDate?: Date; endDate?: Date; orderStatus?: string } = {}
        let days = 30

        for (const arg of filteredArgs.slice(1)) {
          if (arg.startsWith('--status=')) {
            options.orderStatus = arg.split('=')[1]
          } else if (arg.startsWith('--days=')) {
            days = parseInt(arg.split('=')[1])
          }
        }

        options.endDate = new Date()
        options.startDate = new Date()
        options.startDate.setDate(options.startDate.getDate() - days)

        const response = await client.listSalesOrders(options)

        if (jsonOutput) {
          console.log(JSON.stringify(response, null, 2))
        } else {
          console.log(`\nFound ${response.Pagination?.NumberOfItems || response.Items.length} orders:\n`)
          console.log('Order Number     Status      Customer                          Total')
          console.log('-'.repeat(75))
          for (const order of response.Items) {
            const customerName = (order.Customer.CustomerName || '').slice(0, 30).padEnd(30)
            const status = (order.OrderStatus || '').padEnd(10)
            console.log(
              `${order.OrderNumber?.padEnd(15)} ${status} ${customerName} ${formatCurrency(order.Total || 0)}`
            )
          }
        }
        break
      }

      case 'status': {
        const orderNumber = filteredArgs[1]
        const status = filteredArgs[2] as 'Open' | 'Parked' | 'Placed' | 'Completed' | 'Deleted'

        if (!orderNumber || !status) {
          console.error('Error: Order number and status required')
          console.error('Usage: status <order> <Open|Parked|Placed|Completed>')
          process.exit(1)
        }

        const validStatuses = ['Open', 'Parked', 'Placed', 'Completed', 'Deleted']
        if (!validStatuses.includes(status)) {
          console.error(`Error: Invalid status. Must be one of: ${validStatuses.join(', ')}`)
          process.exit(1)
        }

        console.log(`Updating ${orderNumber} status to ${status}...`)
        const updated = await client.updateOrderStatus(orderNumber, status)
        console.log(`✅ Order ${updated.OrderNumber} status updated to ${updated.OrderStatus}`)
        break
      }

      case 'add-line': {
        const orderNumber = filteredArgs[1]
        const productCode = filteredArgs[2]
        const quantity = parseInt(filteredArgs[3])
        const unitPrice = parseFloat(filteredArgs[4])
        const comments = filteredArgs[5]

        if (!orderNumber || !productCode || isNaN(quantity) || isNaN(unitPrice)) {
          console.error('Error: Order, product code, quantity, and price required')
          console.error('Usage: add-line <order> <product> <qty> <price> [comment]')
          process.exit(1)
        }

        console.log(`Adding ${quantity}x ${productCode} @ ${formatCurrency(unitPrice)} to ${orderNumber}...`)
        const updated = await client.addOrderLine(orderNumber, {
          productCode,
          quantity,
          unitPrice,
          comments,
        })
        console.log(`✅ Line added. New total: ${formatCurrency(updated.Total || 0)}`)
        break
      }

      case 'remove-line': {
        const orderNumber = filteredArgs[1]
        const productCode = filteredArgs[2]

        if (!orderNumber || !productCode) {
          console.error('Error: Order and product code required')
          console.error('Usage: remove-line <order> <product>')
          process.exit(1)
        }

        console.log(`Removing ${productCode} from ${orderNumber}...`)
        const updated = await client.removeOrderLine(orderNumber, productCode)
        console.log(`✅ Line removed. New total: ${formatCurrency(updated.Total || 0)}`)
        break
      }

      case 'update-qty': {
        const orderNumber = filteredArgs[1]
        const productCode = filteredArgs[2]
        const quantity = parseInt(filteredArgs[3])

        if (!orderNumber || !productCode || isNaN(quantity)) {
          console.error('Error: Order, product code, and quantity required')
          console.error('Usage: update-qty <order> <product> <qty>')
          process.exit(1)
        }

        console.log(`Updating ${productCode} quantity to ${quantity} in ${orderNumber}...`)
        const updated = await client.updateLineQuantity(orderNumber, productCode, quantity)
        console.log(`✅ Quantity updated. New total: ${formatCurrency(updated.Total || 0)}`)
        break
      }

      case 'customer': {
        const code = filteredArgs[1]
        if (!code) {
          console.error('Error: Customer code required')
          process.exit(1)
        }
        const customer = await client.getCustomer(code)
        if (!customer) {
          console.error(`Customer not found: ${code}`)
          process.exit(1)
        }
        if (jsonOutput) {
          console.log(JSON.stringify(customer, null, 2))
        } else {
          console.log(`\nCustomer: ${customer.CustomerName}`)
          console.log(`Code:     ${customer.CustomerCode}`)
          console.log(`Email:    ${customer.Email || 'N/A'}`)
          console.log(`Contact:  ${customer.ContactName || 'N/A'}`)
          if (customer.Address1) {
            console.log(`Address:  ${customer.Address1}`)
            if (customer.City) console.log(`          ${customer.City}, ${customer.Region} ${customer.PostalCode}`)
            if (customer.Country) console.log(`          ${customer.Country}`)
          }
        }
        break
      }

      case 'search-customer': {
        const name = filteredArgs[1]
        if (!name) {
          console.error('Error: Search name required')
          process.exit(1)
        }
        const customers = await client.searchCustomers(name)
        if (jsonOutput) {
          console.log(JSON.stringify(customers, null, 2))
        } else {
          console.log(`\nFound ${customers.length} customers:\n`)
          for (const c of customers) {
            console.log(`  ${c.CustomerCode.padEnd(20)} ${c.CustomerName}`)
          }
        }
        break
      }

      case 'product': {
        const code = filteredArgs[1]
        if (!code) {
          console.error('Error: Product code required')
          process.exit(1)
        }
        const product = await client.getProduct(code)
        if (!product) {
          console.error(`Product not found: ${code}`)
          process.exit(1)
        }
        if (jsonOutput) {
          console.log(JSON.stringify(product, null, 2))
        } else {
          console.log(`\nProduct: ${product.ProductDescription}`)
          console.log(`Code:    ${product.ProductCode}`)
          console.log(`Barcode: ${product.Barcode || 'N/A'}`)
          console.log(`Price:   ${formatCurrency(product.DefaultSellPrice || 0)}`)
          console.log(`Cost:    ${formatCurrency(product.LastCost || 0)}`)
        }
        break
      }

      case 'search-products': {
        const query = filteredArgs[1]
        if (!query) {
          console.error('Error: Search query required')
          process.exit(1)
        }
        const products = await client.searchProducts(query)
        if (jsonOutput) {
          console.log(JSON.stringify(products, null, 2))
        } else {
          console.log(`\nFound ${products.length} products:\n`)
          for (const p of products) {
            console.log(`  ${p.ProductCode.padEnd(15)} ${p.ProductDescription.slice(0, 50)}`)
          }
        }
        break
      }

      case 'stock': {
        const productCode = filteredArgs[1]
        if (!productCode) {
          console.error('Error: Product code required')
          process.exit(1)
        }
        const stock = await client.getStockOnHand(productCode)
        if (jsonOutput) {
          console.log(JSON.stringify(stock, null, 2))
        } else {
          console.log(`\nStock for ${productCode}:\n`)
          for (const s of stock) {
            console.log(`  ${s.WarehouseName}: ${s.AvailableQty} available (${s.QtyOnHand} on hand, ${s.AllocatedQty} allocated)`)
          }
        }
        break
      }

      // ============================================
      // Store Commands (Supabase edit workflow)
      // ============================================

      case 'pull': {
        const orderNumber = filteredArgs[1]
        if (!orderNumber) {
          console.error('Error: Order number required')
          console.error('Usage: pull <order>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        const pulled = await orderStore.pullOrder(orderNumber)
        if (!pulled) {
          console.error(`Failed to pull order: ${orderNumber}`)
          process.exit(1)
        }
        console.log(`\nOrder stored in Supabase. Use 'edit ${orderNumber}' to view.`)
        break
      }

      case 'edit': {
        const orderNumber = filteredArgs[1]
        if (!orderNumber) {
          console.error('Error: Order number required')
          console.error('Usage: edit <order>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        const stored = await orderStore.getOrder(orderNumber)
        if (!stored) {
          console.error(`Order not found in Supabase: ${orderNumber}`)
          console.error(`Use 'pull ${orderNumber}' to fetch from Unleashed first.`)
          process.exit(1)
        }
        const { order, lines } = stored
        if (jsonOutput) {
          console.log(JSON.stringify({ order, lines }, null, 2))
        } else {
          console.log(`\n${'='.repeat(60)}`)
          console.log(`ORDER: ${order.order_number}`)
          console.log(`${'='.repeat(60)}`)
          console.log(`Status:    ${order.order_status} (sync: ${order.sync_status})`)
          console.log(`Customer:  ${order.customer_name} (${order.customer_code})`)
          console.log(`Date:      ${order.order_date?.slice(0, 10)}`)
          if (order.comments) {
            console.log(`Comments:  ${order.comments}`)
          }
          console.log(`\nLines:`)
          console.log('-'.repeat(60))
          for (const line of lines) {
            const desc = (line.product_description || '').slice(0, 35).padEnd(35)
            console.log(`  ${line.product_code.padEnd(12)} ${desc} ${String(line.order_quantity).padStart(3)} x ${formatCurrency(line.unit_price).padStart(10)} = ${formatCurrency(line.line_total || 0).padStart(10)}`)
          }
          console.log('-'.repeat(60))
          console.log(`${''.padEnd(52)} Total: ${formatCurrency(order.total).padStart(10)}`)
          console.log(`\nEdit commands:`)
          console.log(`  edit-remove ${order.order_number} <product-code>`)
          console.log(`  edit-qty ${order.order_number} <product-code> <qty>`)
          console.log(`  push ${order.order_number}`)
        }
        break
      }

      case 'edit-remove': {
        const orderNumber = filteredArgs[1]
        const productCode = filteredArgs[2]
        if (!orderNumber || !productCode) {
          console.error('Error: Order number and product code required')
          console.error('Usage: edit-remove <order> <product>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        await orderStore.removeLine(orderNumber, productCode)
        console.log(`✅ Removed ${productCode} from ${orderNumber} (in Supabase)`)
        console.log(`   Use 'push ${orderNumber}' to sync to Unleashed`)
        break
      }

      case 'edit-qty': {
        const orderNumber = filteredArgs[1]
        const productCode = filteredArgs[2]
        const quantity = parseInt(filteredArgs[3])
        if (!orderNumber || !productCode || isNaN(quantity)) {
          console.error('Error: Order number, product code, and quantity required')
          console.error('Usage: edit-qty <order> <product> <qty>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        await orderStore.updateLineQty(orderNumber, productCode, quantity)
        console.log(`✅ Updated ${productCode} qty to ${quantity} in ${orderNumber} (in Supabase)`)
        console.log(`   Use 'push ${orderNumber}' to sync to Unleashed`)
        break
      }

      case 'edit-notes': {
        const orderNumber = filteredArgs[1]
        const notes = filteredArgs.slice(2).join(' ')
        if (!orderNumber || !notes) {
          console.error('Error: Order number and notes required')
          console.error('Usage: edit-notes <order> <notes text>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        await orderStore.updateOrder(orderNumber, { comments: notes })
        console.log(`✅ Updated notes for ${orderNumber} (in Supabase)`)
        console.log(`   Use 'push ${orderNumber}' to sync to Unleashed`)
        break
      }

      case 'push': {
        const orderNumber = filteredArgs[1]
        if (!orderNumber) {
          console.error('Error: Order number required')
          console.error('Usage: push <order>')
          process.exit(1)
        }
        const orderStore = new OrderStore(store)
        console.log(`\nPushing ${orderNumber} to Unleashed...`)
        console.log(`(This will delete the old order and create a new one)\n`)
        const created = await orderStore.pushOrder(orderNumber)
        console.log(`\nNew order number: ${created.OrderNumber}`)
        console.log(`Total: ${formatCurrency(created.Total || 0)}`)
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        usage()
        process.exit(1)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(1)
  }
}

main()
