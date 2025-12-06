'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  AlertCircle,
  Download,
  ExternalLink,
} from 'lucide-react';

interface Invoice {
  id: string;
  guid: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  invoice_status: string;
  customer_code: string;
  customer_name: string;
  sub_total: number;
  tax_total: number;
  total: number;
  bc_status: string;
  sales_order_number: string;
  raw_data: any;
}

interface InvoiceStats {
  total: number;
  completed: number;
  parked: number;
  credited: number;
  totalValue: number;
  paid: number;
  unpaid: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  Completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  Parked: { label: 'Parked', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
  Credited: { label: 'Credited', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Paid: { label: 'Paid', color: 'text-green-400', bg: 'bg-green-500/20' },
  Unpaid: { label: 'Unpaid', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  Partial: { label: 'Partial', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UnleashedInvoicesPage() {
  const params = useParams();
  const business = params.business as string;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unleashed-invoices', business, status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        store: business,
        status,
        search,
        page: page.toString(),
        limit: '50',
      });
      const res = await fetch(`/api/unleashed/invoices?${params}`);
      return res.json();
    },
    enabled: business === 'teelixir',
  });

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Unleashed is only available for Teelixir</h1>
        <p className="text-gray-400 mt-2">This page shows invoices from the Unleashed inventory system.</p>
      </div>
    );
  }

  const invoices: Invoice[] = data?.invoices || [];
  const stats: InvoiceStats = data?.stats || { total: 0, completed: 0, parked: 0, credited: 0, totalValue: 0, paid: 0, unpaid: 0 };
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-400" />
              Invoices
            </h1>
            <p className="text-gray-400 mt-1">
              Unleashed invoice browser
              {data?.lastSync && (
                <span className="ml-2 text-gray-500">
                  Last synced: {new Date(data.lastSync).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-emerald-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Total Invoices</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Completed</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.completed.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Parked</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{stats.parked.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Credited</span>
          </div>
          <div className="text-3xl font-bold text-red-400">{stats.credited.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-sky-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Total Value</span>
          </div>
          <div className="text-2xl font-bold text-sky-400">{formatCurrency(stats.totalValue)}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Paid</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.paid.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Unpaid</span>
          </div>
          <div className="text-3xl font-bold text-orange-400">{stats.unpaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'Completed', 'Parked', 'Credited'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sub Total</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-center py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {invoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.invoice_status] || STATUS_CONFIG.Completed;
                  const StatusIcon = statusConfig.icon;
                  const paymentConfig = PAYMENT_STATUS_CONFIG[invoice.bc_status] || PAYMENT_STATUS_CONFIG.Unpaid;

                  return (
                    <tr key={invoice.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono text-emerald-400 font-medium">{invoice.invoice_number}</span>
                        {invoice.sales_order_number && (
                          <div className="text-xs text-gray-500">SO: {invoice.sales_order_number}</div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300">{formatDate(invoice.invoice_date)}</td>
                      <td className="py-4 px-5 text-gray-300">{formatDate(invoice.due_date)}</td>
                      <td className="py-4 px-5">
                        <div className="text-white font-medium">{invoice.customer_name}</div>
                        <div className="text-sm text-gray-500">{invoice.customer_code}</div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{statusConfig.label}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full ${paymentConfig.bg} ${paymentConfig.color}`}>
                          <span className="text-xs font-medium">{paymentConfig.label}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-gray-300">{formatCurrency(invoice.sub_total || 0)}</td>
                      <td className="py-4 px-5 text-right text-gray-400">{formatCurrency(invoice.tax_total || 0)}</td>
                      <td className="py-4 px-5 text-right text-white font-medium">{formatCurrency(invoice.total || 0)}</td>
                      <td className="py-4 px-5 text-center">
                        <a
                          href={`/api/unleashed/invoices/${invoice.id}/pdf?store=${business}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
            <div className="text-sm text-gray-400">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} invoices
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
