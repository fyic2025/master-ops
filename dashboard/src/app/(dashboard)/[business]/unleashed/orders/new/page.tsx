'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  User,
  Package,
  DollarSign,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface Customer {
  guid: string;
  customer_code: string;
  customer_name: string;
  email: string;
  sell_price_tier: string;
}

interface Product {
  guid: string;
  product_code: string;
  product_description: string;
  default_sell_price: number;
  available_qty: number;
  unit_of_measure: string;
}

interface OrderLine {
  product_guid: string;
  product_code: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  available_qty: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

export default function NewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const business = params.business as string;

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-search', business, customerSearch],
    queryFn: async () => {
      const res = await fetch(`/api/unleashed/customers?store=${business}&search=${customerSearch}&limit=20`);
      return res.json();
    },
    enabled: customerSearch.length >= 2 && !selectedCustomer,
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products-search', business, productSearch],
    queryFn: async () => {
      const res = await fetch(`/api/unleashed/products?store=${business}&search=${productSearch}&limit=20`);
      return res.json();
    },
    enabled: productSearch.length >= 2,
  });

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/unleashed/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: business,
          customer_guid: selectedCustomer?.guid,
          lines: orderLines,
          notes,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        router.push(`/${business}/unleashed/orders?created=${data.order_number}`);
      }
    },
  });

  const customers = customersData?.customers || [];
  const products = productsData?.products || [];

  const addProduct = (product: Product) => {
    const existing = orderLines.find(l => l.product_guid === product.guid);
    if (existing) {
      setOrderLines(orderLines.map(l =>
        l.product_guid === product.guid
          ? { ...l, quantity: l.quantity + 1 }
          : l
      ));
    } else {
      setOrderLines([...orderLines, {
        product_guid: product.guid,
        product_code: product.product_code,
        product_description: product.product_description,
        quantity: 1,
        unit_price: product.default_sell_price,
        available_qty: product.available_qty,
      }]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateQuantity = (productGuid: string, delta: number) => {
    setOrderLines(orderLines.map(l =>
      l.product_guid === productGuid
        ? { ...l, quantity: Math.max(1, l.quantity + delta) }
        : l
    ).filter(l => l.quantity > 0));
  };

  const updatePrice = (productGuid: string, price: number) => {
    setOrderLines(orderLines.map(l =>
      l.product_guid === productGuid
        ? { ...l, unit_price: price }
        : l
    ));
  };

  const removeLine = (productGuid: string) => {
    setOrderLines(orderLines.filter(l => l.product_guid !== productGuid));
  };

  const subTotal = orderLines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
  const taxTotal = subTotal * 0.1;
  const total = subTotal + taxTotal;

  const canSubmit = selectedCustomer && orderLines.length > 0 && !createOrder.isPending;

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Unleashed is only available for Teelixir</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${business}/unleashed/orders`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-blue-400" />
          New Sales Order
        </h1>
        <p className="text-gray-400 mt-1">Create a new wholesale order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Customer
            </h2>

            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div>
                  <p className="text-white font-medium">{selectedCustomer.customer_name}</p>
                  <p className="text-sm text-gray-400">{selectedCustomer.customer_code}</p>
                  {selectedCustomer.sell_price_tier && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                      {selectedCustomer.sell_price_tier}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search customers by name or code..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />

                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {customers.map((customer: Customer) => (
                      <button
                        key={customer.guid}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 border-b border-gray-700 last:border-0"
                      >
                        <p className="text-white font-medium">{customer.customer_name}</p>
                        <p className="text-sm text-gray-400">{customer.customer_code}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Products
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search products by SKU or name..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />

              {showProductDropdown && products.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {products.map((product: Product) => (
                    <button
                      key={product.guid}
                      onClick={() => addProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 border-b border-gray-700 last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{product.product_code}</p>
                          <p className="text-sm text-gray-400">{product.product_description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">{formatCurrency(product.default_sell_price)}</p>
                          <p className="text-xs text-gray-500">{product.available_qty} available</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order Lines */}
            {orderLines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No products added yet</p>
                <p className="text-sm">Search and add products above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderLines.map((line) => (
                  <div
                    key={line.product_guid}
                    className="flex items-center gap-4 bg-gray-800 rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{line.product_code}</p>
                      <p className="text-sm text-gray-400">{line.product_description}</p>
                      {line.quantity > line.available_qty && (
                        <p className="text-xs text-orange-400 mt-1">
                          Low stock: only {line.available_qty} available
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(line.product_guid, -1)}
                        className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-white font-medium">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(line.product_guid, 1)}
                        className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updatePrice(line.product_guid, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-right text-white"
                        step="0.01"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <p className="text-white font-medium">
                        {formatCurrency(line.quantity * line.unit_price)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeLine(line.product_guid)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this order..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Order Summary
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Items ({orderLines.length})</span>
                <span>{orderLines.reduce((sum, l) => sum + l.quantity, 0)} units</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>GST (10%)</span>
                <span>{formatCurrency(taxTotal)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-emerald-400">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => createOrder.mutate()}
              disabled={!canSubmit}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Create Order
                </>
              )}
            </button>

            {createOrder.isError && (
              <p className="mt-3 text-red-400 text-sm text-center">
                Failed to create order. Please try again.
              </p>
            )}

            {!selectedCustomer && (
              <p className="mt-3 text-yellow-400 text-sm text-center">
                Select a customer to continue
              </p>
            )}

            {selectedCustomer && orderLines.length === 0 && (
              <p className="mt-3 text-yellow-400 text-sm text-center">
                Add at least one product
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
