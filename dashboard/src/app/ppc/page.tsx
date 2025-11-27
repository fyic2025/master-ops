import { TrendingUp, TrendingDown, DollarSign, MousePointer, Eye } from 'lucide-react'

export default function PPCDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">PPC Dashboard</h1>
        <p className="text-gray-400 mt-1">Google Ads performance across all accounts</p>
      </header>

      {/* Account Selector */}
      <div className="flex gap-2">
        {['All Accounts', 'BOO', 'Teelixir', 'Red Hill Fresh'].map((account) => (
          <button
            key={account}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
          >
            {account}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Spend (Today)"
          value="$--"
          change="+12%"
          trend="up"
          icon={DollarSign}
        />
        <KPICard
          title="Clicks"
          value="--"
          change="+8%"
          trend="up"
          icon={MousePointer}
        />
        <KPICard
          title="Impressions"
          value="--"
          change="+15%"
          trend="up"
          icon={Eye}
        />
        <KPICard
          title="ROAS"
          value="--x"
          change="-3%"
          trend="down"
          icon={TrendingUp}
        />
      </div>

      {/* Campaign Performance Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Campaign Performance</h2>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-3">Campaign</th>
                <th className="pb-3">Account</th>
                <th className="pb-3">Spend</th>
                <th className="pb-3">Clicks</th>
                <th className="pb-3">Conv.</th>
                <th className="pb-3">ROAS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-t border-gray-800">
                <td className="py-3 text-white" colSpan={6}>
                  Connect to Supabase to view campaign data
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Search Terms Queue */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Search Term Mining</h2>
          <span className="text-sm text-gray-500">0 pending review</span>
        </div>
        <div className="p-4 text-gray-400 text-sm">
          No search terms pending review
        </div>
      </section>
    </div>
  )
}

function KPICard({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-gray-500" />
        <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  )
}
