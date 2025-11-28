'use client'

import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Package, Users, ShoppingCart, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SupplierStatus {
  id: string
  business: string
  supplier_name: string
  product_count: number
  last_sync: string
  sync_status: 'healthy' | 'stale' | 'error' | 'unknown'
  error_message?: string
}

interface SyncLog {
  id: string
  business: string
  source: string
  level: string
  message: string
  duration_ms?: number
  created_at: string
}

const supplierNames: Record<string, string> = {
  oborne: 'Oborne Health',
  uhp: 'UHP',
  kadac: 'Kadac',
  kik: 'KIK Trading',
}

async function fetchSupplierStatus(): Promise<SupplierStatus[]> {
  const { data, error } = await supabase
    .from('sync_supplier_status')
    .select('*')
    .order('supplier_name', { ascending: true })

  if (error) throw error
  return data || []
}

async function fetchRecentLogs(): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('sync_integration_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data || []
}

async function fetchBusinessMetrics() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('dashboard_business_metrics')
    .select('*')
    .eq('date', today)

  if (error) return []
  return data || []
}

function formatLastSync(dateString: string): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export default function SyncDashboard() {
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['supplier-status'],
    queryFn: fetchSupplierStatus,
    refetchInterval: 60000,
  })

  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: fetchRecentLogs,
    refetchInterval: 30000,
  })

  const { data: metrics } = useQuery({
    queryKey: ['sync-metrics'],
    queryFn: fetchBusinessMetrics,
    refetchInterval: 60000,
  })

  const booMetrics = metrics?.find((m: any) => m.business === 'boo')

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Sync Dashboard</h1>
        <p className="text-gray-400 mt-1">Data synchronization status</p>
      </header>

      {/* Sync Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SyncCard
          title="Product Sync"
          icon={Package}
          status={booMetrics?.sync_status === 'healthy' ? 'healthy' : 'unknown'}
          lastSync={booMetrics?.updated_at ? formatLastSync(booMetrics.updated_at) : '--'}
          stats={[
            { label: 'BOO Products', value: '--' },
            { label: 'Teelixir Products', value: '--' },
          ]}
        />
        <SyncCard
          title="Customer Sync"
          icon={Users}
          status="unknown"
          lastSync="--"
          stats={[
            { label: 'HubSpot Contacts', value: '--' },
            { label: 'B2B Customers', value: '--' },
          ]}
        />
        <SyncCard
          title="Order Sync"
          icon={ShoppingCart}
          status="unknown"
          lastSync="--"
          stats={[
            { label: 'Today', value: booMetrics?.orders_today?.toString() || '--' },
            { label: 'Pending', value: '--' },
          ]}
        />
      </div>

      {/* Supplier Feeds */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Supplier Feeds (BOO)</h2>
        </div>
        {loadingSuppliers ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-gray-500 mx-auto animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {suppliers && suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <div key={supplier.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {supplierNames[supplier.supplier_name] || supplier.supplier_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {supplier.product_count > 0 ? `${supplier.product_count.toLocaleString()} products` : '-- products'}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={supplier.sync_status} />
                    <p className="text-xs text-gray-500 mt-1">
                      Last: {formatLastSync(supplier.last_sync)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4">
                <p className="text-gray-400 text-sm">No supplier data yet. Run sync job to populate.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recent Sync Logs */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Sync Activity</h2>
        </div>
        <div className="p-4">
          {logs && logs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`text-sm border-l-2 pl-3 ${
                    log.level === 'error' ? 'border-red-500' :
                    log.level === 'warn' ? 'border-yellow-500' :
                    'border-gray-600'
                  }`}
                >
                  <p className="text-white">{log.message}</p>
                  <p className="text-gray-500 text-xs">
                    {log.source} • {log.business}
                    {log.duration_ms && ` • ${log.duration_ms}ms`}
                    {' • '}{new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No sync logs yet</p>
          )}
        </div>
      </section>
    </div>
  )
}

function SyncCard({
  title,
  icon: Icon,
  status,
  lastSync,
  stats,
}: {
  title: string
  icon: React.ElementType
  status: 'healthy' | 'stale' | 'error' | 'unknown'
  lastSync: string
  stats: { label: string; value: string }[]
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{stat.label}</span>
            <span className="text-white">{stat.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">Last sync: {lastSync}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: 'healthy' | 'stale' | 'error' | 'unknown' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    stale: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Stale' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error' },
    unknown: { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Unknown' },
  }
  const cfg = config[status] || config.unknown
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}
