'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  Truck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  Pause,
  Mail,
  Phone,
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  guid: string;
  order_number: string;
  order_date: string;
  required_date: string;
  order_status: string;
  supplier_code: string;
  supplier_name: string;
  sub_total: number;
  tax_total: number;
  total: number;
  warehouse_code: string;
  raw_data: any;
}

interface Supplier {
  id: string;
  guid: string;
  supplier_code: string;
  supplier_name: string;
  email: string;
  phone: string;
  fax: string;
  website: string;
  contact_first_name: string;
  contact_last_name: string;
  currency_code: string;
  payment_term: string;
  obsolete: boolean;
  raw_data: any;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  Completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  Parked: { label: 'Parked', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Pause },
  Placed: { label: 'Placed', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UnleashedPurchasingPage() {
  const params = useParams();
  const business = params.business as string;
  const [view, setView] = useState<'orders' | 'suppliers'>('orders');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unleashed-purchasing', business, view, status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        store: business,
        view,
        status,
        search,
        page: page.toString(),
        limit: '50',
      });
      const res = await fetch(`/api/unleashed/purchasing?${params}`);
      return res.json();
    },
    enabled: business === 'teelixir',
  });

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Unleashed is only available for Teelixir</h1>
        <p className="text-gray-400 mt-2">This page shows purchase orders and suppliers from the Unleashed inventory system.</p>
      </div>
    );
  }

  const orders: PurchaseOrder[] = data?.orders || [];
  const suppliers: Supplier[] = data?.suppliers || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Truck className="h-8 w-8 text-orange-400" />
              Purchasing
            </h1>
            <p className="text-gray-400 mt-1">
              Unleashed purchase orders & suppliers
              {data?.lastSync && (
                <span className="ml-2 text-gray-500">
                  Last synced: {new Date(data.lastSync).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-orange-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => { setView('orders'); setPage(1); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            view === 'orders'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Package className="w-5 h-5" />
          Purchase Orders
        </button>
        <button
          onClick={() => { setView('suppliers'); setPage(1); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            view === 'suppliers'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Suppliers
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {view === 'orders' ? (
          <>
            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Total POs</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.total?.toLocaleString() || 0}</div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Completed</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{stats.completed?.toLocaleString() || 0}</div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Placed</span>
              </div>
              <div className="text-3xl font-bold text-blue-400">{stats.placed?.toLocaleString() || 0}</div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalValue || 0)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Total Suppliers</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.total?.toLocaleString() || 0}</div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Active</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{stats.active?.toLocaleString() || 0}</div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Pause className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-gray-400 text-sm font-medium">Obsolete</span>
              </div>
              <div className="text-3xl font-bold text-red-400">{stats.obsolete?.toLocaleString() || 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder={view === 'orders' ? "Search by PO number or supplier..." : "Search by supplier name or code..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
          />
        </div>

        {view === 'orders' && (
          <div className="flex gap-2">
            {['all', 'Completed', 'Parked', 'Placed'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === s
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading {view}...</p>
          </div>
        ) : view === 'orders' ? (
          orders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No purchase orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">PO #</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Supplier</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sub Total</th>
                    <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax</th>
                    <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Warehouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {orders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.Placed;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={order.id} className="group hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-5">
                          <span className="font-mono text-orange-400 font-medium">{order.order_number}</span>
                        </td>
                        <td className="py-4 px-5 text-gray-300">{formatDate(order.order_date)}</td>
                        <td className="py-4 px-5">
                          <div className="text-white font-medium">{order.supplier_name}</div>
                          <div className="text-sm text-gray-500">{order.supplier_code}</div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{statusConfig.label}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right text-gray-300">{formatCurrency(order.sub_total || 0)}</td>
                        <td className="py-4 px-5 text-right text-gray-400">{formatCurrency(order.tax_total || 0)}</td>
                        <td className="py-4 px-5 text-right text-white font-medium">{formatCurrency(order.total || 0)}</td>
                        <td className="py-4 px-5 text-gray-400">{order.warehouse_code || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Supplier</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Term</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</th>
                  <th className="text-center py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="group hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{supplier.supplier_name}</div>
                          <div className="text-sm text-gray-500">{supplier.supplier_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            {supplier.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-300">{supplier.payment_term || '-'}</td>
                    <td className="py-4 px-5 text-gray-300">{supplier.currency_code || 'AUD'}</td>
                    <td className="py-4 px-5 text-center">
                      {supplier.obsolete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                          Obsolete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
            <div className="text-sm text-gray-400">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-400 px-3">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
