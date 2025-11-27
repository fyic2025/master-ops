import { RefreshCw, Package, Users, ShoppingCart, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function SyncDashboard() {
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
          status="healthy"
          lastSync="5 min ago"
          stats={[
            { label: 'BOO Products', value: '11,357' },
            { label: 'Teelixir Products', value: '156' },
          ]}
        />
        <SyncCard
          title="Customer Sync"
          icon={Users}
          status="healthy"
          lastSync="2 min ago"
          stats={[
            { label: 'HubSpot Contacts', value: '--' },
            { label: 'B2B Customers', value: '--' },
          ]}
        />
        <SyncCard
          title="Order Sync"
          icon={ShoppingCart}
          status="healthy"
          lastSync="1 min ago"
          stats={[
            { label: 'Today', value: '--' },
            { label: 'Pending', value: '--' },
          ]}
        />
      </div>

      {/* Supplier Feeds */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Supplier Feeds (BOO)</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {[
            { name: 'Oborne Health', products: '--', lastSync: '--', status: 'unknown' },
            { name: 'UHP', products: '--', lastSync: '--', status: 'unknown' },
            { name: 'KIK Trading', products: '--', lastSync: '--', status: 'unknown' },
            { name: 'Kadac', products: '--', lastSync: '--', status: 'unknown' },
          ].map((supplier) => (
            <div key={supplier.name} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{supplier.name}</p>
                <p className="text-sm text-gray-500">{supplier.products} products</p>
              </div>
              <div className="text-right">
                <StatusBadge status={supplier.status as any} />
                <p className="text-xs text-gray-500 mt-1">Last: {supplier.lastSync}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Sync Logs */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Sync Activity</h2>
          <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm">Connect to view sync logs</p>
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
  status: 'healthy' | 'warning' | 'error'
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

function StatusBadge({ status }: { status: 'healthy' | 'warning' | 'error' | 'unknown' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    warning: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Warning' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error' },
    unknown: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Unknown' },
  }
  const cfg = config[status]
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}
