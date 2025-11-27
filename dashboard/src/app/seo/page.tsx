import { Search, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function SEODashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">SEO Dashboard</h1>
        <p className="text-gray-400 mt-1">Content optimization and rankings</p>
      </header>

      {/* Agent Status */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">SEO Agent Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AgentCard name="Classification" status="idle" lastRun="2h ago" />
          <AgentCard name="Content Format" status="idle" lastRun="2h ago" />
          <AgentCard name="GSC Data" status="idle" lastRun="6h ago" />
          <AgentCard name="Keyword Research" status="idle" lastRun="1d ago" />
          <AgentCard name="Health Claims" status="idle" lastRun="12h ago" />
          <AgentCard name="Content Gen" status="idle" lastRun="2h ago" />
          <AgentCard name="Supplier Enrichment" status="idle" lastRun="4h ago" />
          <AgentCard name="Coordinator" status="idle" lastRun="2h ago" />
        </div>
      </section>

      {/* Content Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Content Queue</h2>
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm">
              0 pending
            </span>
          </div>
          <div className="p-4">
            <div className="text-gray-400 text-sm">No content pending optimization</div>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Health Claims Review</h2>
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-sm">
              0 flagged
            </span>
          </div>
          <div className="p-4">
            <div className="text-gray-400 text-sm">No health claims flagged for review</div>
          </div>
        </section>
      </div>

      {/* GSC Performance */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Search Console Performance</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Clicks (7d)</p>
              <p className="text-2xl font-bold text-white">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Impressions (7d)</p>
              <p className="text-2xl font-bold text-white">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg CTR</p>
              <p className="text-2xl font-bold text-white">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Position</p>
              <p className="text-2xl font-bold text-white">--</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Connect to view GSC data</p>
        </div>
      </section>

      {/* Category/Brand Pages */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Category & Brand Pages</h2>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-3">Page</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Content Score</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-800">
                <td className="py-3 text-gray-400" colSpan={4}>
                  Connect to Supabase to view page data
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function AgentCard({
  name,
  status,
  lastRun,
}: {
  name: string
  status: 'running' | 'idle' | 'error'
  lastRun: string
}) {
  const statusConfig = {
    running: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    idle: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  }
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`${config.bg} border border-gray-800 rounded-lg p-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-sm font-medium text-white">{name}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">Last: {lastRun}</p>
    </div>
  )
}
