'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { Package as PackageIcon, AlertTriangle, TrendingDown, DollarSign, Boxes, GitCompare } from 'lucide-react';

// Types
interface InventorySummary {
  total_products: number;
  total_variants: number;
  total_units: number;
  total_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  reorder_needed_count: number;
}

interface InventoryProduct {
  product_id: string;
  shopify_product_id: number;
  product_title: string;
  vendor: string;
  product_type: string;
  variant_count: number;
  total_inventory: number;
  inventory_value: number;
  min_variant_inventory: number;
  low_stock_variants: number;
  featured_image_url: string | null;
  last_synced_at: string | null;
}

interface InventoryVariant {
  id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  price: number;
  cost: number;
  total_inventory: number;
  low_stock_threshold: number;
  reorder_point: number;
  stock_status: 'out_of_stock' | 'low_stock' | 'reorder' | 'in_stock';
}

interface LowStockAlert {
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  total_inventory: number;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_quantity: number;
  inventory_value: number;
  alert_level: 'out_of_stock' | 'critical' | 'low' | 'ok';
}

interface RecentAdjustment {
  id: string;
  adjustment_type: string;
  quantity_change: number;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
  sku?: string;
  product_title?: string;
}

// Comparison types for Unleashed Shadow Mode
interface StockComparison {
  product_code: string;
  product_description: string;
  unleashed_qty: number;
  shopify_qty: number | null;
  difference: number;
  unleashed_cost: number | null;
  shopify_cost: number | null;
  cost_difference: number | null;
  match_status: 'match' | 'mismatch' | 'unleashed_only' | 'shopify_only';
  severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
}

interface ComparisonData {
  summary: {
    total_unleashed_products: number;
    total_shopify_products: number;
    matched_count: number;
    mismatch_count: number;
    unleashed_only_count: number;
    shopify_only_count: number;
    accuracy_percentage: number;
    total_quantity_variance: number;
  };
  comparisons: StockComparison[];
  syncStatus: {
    last_sync: string | null;
    sync_type: string | null;
    records_synced: number;
    status: string | null;
  };
  accuracyHistory: Array<{
    date: string;
    accuracy_percentage: number;
  }>;
}

interface InventoryData {
  summary: InventorySummary;
  products: InventoryProduct[];
  variants: InventoryVariant[];
  lowStockAlerts: LowStockAlert[];
  recentAdjustments: RecentAdjustment[];
  lastSynced: string | null;
}

type TabId = 'overview' | 'products' | 'levels' | 'adjustments' | 'comparison' | 'orders' | 'bundles';

const tabs: { id: TabId; name: string; icon: typeof PackageIcon }[] = [
  { id: 'overview', name: 'Overview', icon: ChartBarIcon },
  { id: 'products', name: 'Products', icon: PackageIcon },
  { id: 'levels', name: 'Stock Levels', icon: Boxes },
  { id: 'adjustments', name: 'Adjustments', icon: AdjustmentsHorizontalIcon },
  { id: 'comparison', name: 'Shadow Mode', icon: GitCompare },
  { id: 'orders', name: 'Purchase Orders', icon: TruckIcon },
  { id: 'bundles', name: 'Bundles', icon: CubeIcon },
];

async function fetchInventoryData(store: string, view: string): Promise<InventoryData> {
  const res = await fetch(`/api/inventory?store=${store}&view=${view}`);
  if (!res.ok) throw new Error('Failed to fetch inventory data');
  return res.json();
}

async function fetchComparisonData(store: string, filter: string): Promise<ComparisonData> {
  const res = await fetch(`/api/inventory/comparison?store=${store}&filter=${filter}`);
  if (!res.ok) throw new Error('Failed to fetch comparison data');
  return res.json();
}

const stockStatusConfig = {
  out_of_stock: { label: 'Out of Stock', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  low_stock: { label: 'Low Stock', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  reorder: { label: 'Reorder', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  in_stock: { label: 'In Stock', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
};

const alertLevelConfig = {
  out_of_stock: { label: 'Out of Stock', color: 'text-red-400', bg: 'bg-red-500', priority: 1 },
  critical: { label: 'Critical', color: 'text-orange-400', bg: 'bg-orange-500', priority: 2 },
  low: { label: 'Low', color: 'text-yellow-400', bg: 'bg-yellow-500', priority: 3 },
  ok: { label: 'OK', color: 'text-green-400', bg: 'bg-green-500', priority: 4 },
};

const comparisonSeverityConfig = {
  ok: { label: 'Match', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const matchStatusConfig = {
  match: { label: 'Match', color: 'text-green-400', bg: 'bg-green-500/10' },
  mismatch: { label: 'Mismatch', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  unleashed_only: { label: 'Unleashed Only', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  shopify_only: { label: 'Shopify Only', color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export default function InventoryPage() {
  const params = useParams();
  const business = params.business as string;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonFilter, setComparisonFilter] = useState<string>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', business, activeTab],
    queryFn: () => fetchInventoryData(business, activeTab),
    refetchInterval: 60000,
  });

  const { data: comparisonData, isLoading: comparisonLoading, refetch: refetchComparison } = useQuery({
    queryKey: ['inventory-comparison', business, comparisonFilter],
    queryFn: () => fetchComparisonData(business, comparisonFilter),
    enabled: activeTab === 'comparison',
    refetchInterval: 120000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-800 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <PackageIcon className="h-8 w-8 text-purple-400" />
              Inventory Management
            </h1>
            <p className="text-gray-400 mt-1">
              Unleashed replacement - powered by Shopify
            </p>
          </div>
        </header>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-8 text-center">
          <PackageIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Inventory System Ready</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            The inventory management system is set up and ready. Run the initial sync to populate
            data from Shopify.
          </p>
          <div className="flex flex-col items-center gap-4">
            <code className="bg-gray-800 px-4 py-2 rounded text-sm text-gray-300 font-mono">
              npx tsx teelixir/scripts/sync-shopify-inventory.ts
            </code>
            <p className="text-sm text-gray-500">
              This will sync all products, variants, and inventory levels from Shopify.
            </p>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CubeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Products & Variants</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Track all products and variants with SKU-level inventory. Synced automatically from Shopify.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Low Stock Alerts</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Automatic alerts when stock falls below thresholds. Never run out of popular products.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TruckIcon className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Purchase Orders</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Manage incoming stock with purchase orders. Track expected deliveries and receive goods.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <AdjustmentsHorizontalIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Stock Adjustments</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Record manual adjustments, write-offs, and corrections with full audit trail.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Boxes className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Bundle Management</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Define bundle products with components. Auto-calculate availability from component stock.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Stock Counts</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Perform physical inventory counts. Track variances and auto-apply corrections.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, products, variants, lowStockAlerts, recentAdjustments, lastSynced } = data;

  // Filter products/variants by search
  const filteredProducts = products.filter(p =>
    p.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVariants = variants.filter(v =>
    v.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.variant_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <PackageIcon className="h-8 w-8 text-purple-400" />
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1">
            Unleashed replacement - powered by Shopify
            {lastSynced && (
              <span className="ml-2 text-gray-500">
                 Last synced: {new Date(lastSynced).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">{summary.total_products}</div>
          <div className="text-sm text-gray-400">Products</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">{summary.total_variants}</div>
          <div className="text-sm text-gray-400">Variants</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">{summary.total_units.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Total Units</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-white">
            ${(summary.total_value / 1000).toFixed(0)}k
          </div>
          <div className="text-sm text-gray-400">Stock Value</div>
        </div>

        <div className={`rounded-lg p-4 border ${
          summary.out_of_stock_count > 0
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className={`text-3xl font-bold ${
            summary.out_of_stock_count > 0 ? 'text-red-400' : 'text-white'
          }`}>
            {summary.out_of_stock_count}
          </div>
          <div className="text-sm text-gray-400">Out of Stock</div>
        </div>

        <div className={`rounded-lg p-4 border ${
          summary.low_stock_count > 0
            ? 'bg-orange-500/10 border-orange-500/20'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className={`text-3xl font-bold ${
            summary.low_stock_count > 0 ? 'text-orange-400' : 'text-white'
          }`}>
            {summary.low_stock_count}
          </div>
          <div className="text-sm text-gray-400">Low Stock</div>
        </div>

        <div className={`rounded-lg p-4 border ${
          summary.reorder_needed_count > 0
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className={`text-3xl font-bold ${
            summary.reorder_needed_count > 0 ? 'text-yellow-400' : 'text-white'
          }`}>
            {summary.reorder_needed_count}
          </div>
          <div className="text-sm text-gray-400">Need Reorder</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Low Stock Alerts */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Low Stock Alerts
              </h2>
              {lowStockAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-500/50" />
                  <p>All stock levels are healthy</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockAlerts.map((alert) => {
                    const config = alertLevelConfig[alert.alert_level];
                    return (
                      <div
                        key={alert.variant_id}
                        className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${config.bg}`} />
                          <div>
                            <p className="text-white font-medium">{alert.product_title}</p>
                            <p className="text-sm text-gray-400">
                              {alert.sku} {alert.variant_title && `- ${alert.variant_title}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${config.color}`}>
                            {alert.total_inventory} units
                          </p>
                          <p className="text-xs text-gray-500">
                            Reorder: {alert.reorder_quantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-blue-400" />
                Recent Adjustments
              </h2>
              {recentAdjustments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent adjustments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAdjustments.map((adj) => (
                    <div key={adj.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 capitalize">
                          {adj.adjustment_type.replace('_', ' ')}
                        </span>
                        <span className={adj.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}>
                          {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                        </span>
                      </div>
                      {adj.sku && (
                        <p className="text-xs text-gray-500">{adj.sku}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(adj.adjusted_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by title or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Products Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variants</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Inventory</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.featured_image_url ? (
                            <img
                              src={product.featured_image_url}
                              alt=""
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                              <PackageIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <span className="text-white font-medium">{product.product_title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{product.vendor || '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{product.product_type || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{product.variant_count}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {product.total_inventory.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        ${product.inventory_value?.toFixed(0) || '0'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.low_stock_variants > 0 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">
                            {product.low_stock_variants} low
                          </span>
                        ) : product.min_variant_inventory <= 0 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                            OOS
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Levels Tab */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by SKU, product, or variant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Variants Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variant</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Reorder</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredVariants.map((variant) => {
                    const statusConfig = stockStatusConfig[variant.stock_status];
                    return (
                      <tr key={variant.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-mono text-sm text-gray-300">{variant.sku || '-'}</td>
                        <td className="px-4 py-3 text-white">{variant.product_title}</td>
                        <td className="px-4 py-3 text-gray-400">{variant.variant_title || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          ${variant.price?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          ${variant.cost?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {variant.total_inventory}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {variant.reorder_point}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Adjustments Tab */}
        {activeTab === 'adjustments' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Stock Adjustments</h2>
            {recentAdjustments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AdjustmentsHorizontalIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No adjustments recorded</p>
                <p className="text-sm mt-2">Adjustments will appear here when stock is manually changed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAdjustments.map((adj) => (
                  <div key={adj.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium capitalize">{adj.adjustment_type.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-400">{adj.sku} - {adj.product_title}</p>
                      <p className="text-sm text-gray-500">{adj.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${adj.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(adj.adjusted_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{adj.adjusted_by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shadow Mode / Comparison Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {/* Shadow Mode Header */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <GitCompare className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Unleashed Shadow Mode</h2>
                    <p className="text-gray-400 text-sm">
                      Comparing Unleashed inventory with Shopify in real-time
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {comparisonData?.syncStatus?.last_sync && (
                    <p className="text-sm text-gray-400">
                      Last sync: {new Date(comparisonData.syncStatus.last_sync).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => refetchComparison()}
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white transition-colors"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {comparisonLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : comparisonData ? (
              <>
                {/* Accuracy Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className={`rounded-lg p-4 border ${
                    comparisonData.summary.accuracy_percentage >= 99
                      ? 'bg-green-500/10 border-green-500/20'
                      : comparisonData.summary.accuracy_percentage >= 95
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <div className={`text-3xl font-bold ${
                      comparisonData.summary.accuracy_percentage >= 99
                        ? 'text-green-400'
                        : comparisonData.summary.accuracy_percentage >= 95
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      {comparisonData.summary.accuracy_percentage}%
                    </div>
                    <div className="text-sm text-gray-400">Accuracy</div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-3xl font-bold text-white">
                      {comparisonData.summary.total_unleashed_products}
                    </div>
                    <div className="text-sm text-gray-400">Unleashed SKUs</div>
                  </div>

                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    <div className="text-3xl font-bold text-green-400">
                      {comparisonData.summary.matched_count}
                    </div>
                    <div className="text-sm text-gray-400">Matched</div>
                  </div>

                  <div className={`rounded-lg p-4 border ${
                    comparisonData.summary.mismatch_count > 0
                      ? 'bg-orange-500/10 border-orange-500/20'
                      : 'bg-gray-800 border-gray-700'
                  }`}>
                    <div className={`text-3xl font-bold ${
                      comparisonData.summary.mismatch_count > 0 ? 'text-orange-400' : 'text-white'
                    }`}>
                      {comparisonData.summary.mismatch_count}
                    </div>
                    <div className="text-sm text-gray-400">Mismatches</div>
                  </div>

                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                    <div className="text-3xl font-bold text-blue-400">
                      {comparisonData.summary.unleashed_only_count}
                    </div>
                    <div className="text-sm text-gray-400">Unleashed Only</div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-3xl font-bold text-white">
                      {comparisonData.summary.total_quantity_variance}
                    </div>
                    <div className="text-sm text-gray-400">Total Variance</div>
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  {['all', 'mismatches', 'unleashed_only', 'shopify_only'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setComparisonFilter(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        comparisonFilter === f
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {f === 'all' ? 'All' : f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>

                {/* Comparison Table */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Unleashed</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Shopify</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Difference</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {comparisonData.comparisons.slice(0, 100).map((item, idx) => {
                        const severityConfig = comparisonSeverityConfig[item.severity];
                        const statusConfig = matchStatusConfig[item.match_status];
                        return (
                          <tr key={`${item.product_code}-${idx}`} className="hover:bg-gray-700/50">
                            <td className="px-4 py-3 font-mono text-sm text-gray-300">
                              {item.product_code || '-'}
                            </td>
                            <td className="px-4 py-3 text-white max-w-xs truncate">
                              {item.product_description || '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-blue-400 font-medium">
                              {item.unleashed_qty}
                            </td>
                            <td className="px-4 py-3 text-right text-purple-400 font-medium">
                              {item.shopify_qty ?? '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${
                              item.difference === 0
                                ? 'text-green-400'
                                : item.difference > 0
                                ? 'text-orange-400'
                                : 'text-red-400'
                            }`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full ${severityConfig.bg} ${severityConfig.color} ${severityConfig.border} border`}>
                                {severityConfig.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {comparisonData.comparisons.length > 100 && (
                    <div className="px-4 py-3 bg-gray-900 text-center text-sm text-gray-400">
                      Showing 100 of {comparisonData.comparisons.length} items
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <GitCompare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No Comparison Data</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Run the Unleashed sync to populate comparison data.
                </p>
                <code className="bg-gray-900 px-4 py-2 rounded text-sm text-gray-300 font-mono">
                  npx tsx teelixir/scripts/sync-unleashed.ts --store=teelixir --type=stock
                </code>
              </div>
            )}
          </div>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <TruckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Purchase Orders</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create and track purchase orders for incoming inventory. Manage suppliers and receive goods.
            </p>
            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Create Purchase Order
            </button>
          </div>
        )}

        {/* Bundles Tab */}
        {activeTab === 'bundles' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <Boxes className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Bundle Management</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Define bundle products with component SKUs. Track availability based on component stock levels.
            </p>
            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Create Bundle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
