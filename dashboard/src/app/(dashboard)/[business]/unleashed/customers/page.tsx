'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Tag,
  UserCheck,
  UserX,
} from 'lucide-react';

interface Customer {
  id: string;
  guid: string;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  website: string;
  contact_first_name: string;
  contact_last_name: string;
  sell_price_tier: string;
  sell_price_tier_guid: string;
  currency_code: string;
  payment_term: string;
  obsolete: boolean;
  notes: string;
  addresses: any[];
  raw_data: any;
}

interface CustomerStats {
  total: number;
  active: number;
  obsolete: number;
  wholesale: number;
  retail: number;
}

function formatAddress(addresses: any[]) {
  if (!addresses?.length) return null;
  const addr = addresses[0];
  return [addr.city, addr.region, addr.postcode].filter(Boolean).join(', ');
}

export default function UnleashedCustomersPage() {
  const params = useParams();
  const business = params.business as string;
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unleashed-customers', business, type, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        store: business,
        type,
        search,
        page: page.toString(),
        limit: '50',
      });
      const res = await fetch(`/api/unleashed/customers?${params}`);
      return res.json();
    },
    enabled: business === 'teelixir',
  });

  // Only show for Teelixir
  if (business !== 'teelixir') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Unleashed is only available for Teelixir</h1>
        <p className="text-gray-400 mt-2">This page shows customers from the Unleashed inventory system.</p>
      </div>
    );
  }

  const customers: Customer[] = data?.customers || [];
  const stats: CustomerStats = data?.stats || { total: 0, active: 0, obsolete: 0, wholesale: 0, retail: 0 };
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-400" />
              Customers
            </h1>
            <p className="text-gray-400 mt-1">
              Unleashed customer database
              {data?.lastSync && (
                <span className="ml-2 text-gray-500">
                  Last synced: {new Date(data.lastSync).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-purple-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Total Customers</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Active</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.active.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Obsolete</span>
          </div>
          <div className="text-3xl font-bold text-red-400">{stats.obsolete.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Wholesale</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{stats.wholesale.toLocaleString()}</div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Retail</span>
          </div>
          <div className="text-3xl font-bold text-amber-400">{stats.retail.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'wholesale', 'retail'].map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price Tier</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Term</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</th>
                  <th className="text-center py-4 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          customer.sell_price_tier ? 'bg-blue-500/20' : 'bg-amber-500/20'
                        }`}>
                          {customer.sell_price_tier ? (
                            <Building2 className="w-5 h-5 text-blue-400" />
                          ) : (
                            <User className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{customer.customer_name}</div>
                          <div className="text-sm text-gray-500">{customer.customer_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {customer.email}
                          </div>
                        )}
                        {(customer.phone || customer.mobile) && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            {customer.phone || customer.mobile}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      {customer.sell_price_tier ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{customer.sell_price_tier}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Retail</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-gray-300">{customer.payment_term || '-'}</td>
                    <td className="py-4 px-5 text-gray-300">{customer.currency_code || 'AUD'}</td>
                    <td className="py-4 px-5 text-center">
                      {customer.obsolete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                          <UserX className="w-3 h-3" />
                          Obsolete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                          <UserCheck className="w-3 h-3" />
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
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} customers
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
