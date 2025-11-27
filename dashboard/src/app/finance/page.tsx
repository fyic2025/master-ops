import { DollarSign, TrendingUp, Building2 } from 'lucide-react'

export default function FinanceDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
        <p className="text-gray-400 mt-1">Xero consolidation and financials</p>
      </header>

      {/* Business P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { name: 'Buy Organics Online', revenue: '--', color: 'border-brand-boo' },
          { name: 'Teelixir', revenue: '--', color: 'border-brand-teelixir' },
          { name: 'Elevate Wholesale', revenue: '--', color: 'border-brand-elevate' },
          { name: 'Red Hill Fresh', revenue: '--', color: 'border-brand-rhf' },
        ].map((biz) => (
          <div key={biz.name} className={`bg-gray-900 border-l-4 ${biz.color} rounded-lg p-4`}>
            <p className="text-sm text-gray-500">{biz.name}</p>
            <p className="text-2xl font-bold text-white mt-1">{biz.revenue}</p>
            <p className="text-xs text-gray-500 mt-1">MTD Revenue</p>
          </div>
        ))}
      </div>

      {/* Consolidated View */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Consolidated Financials</h2>
        </div>
        <div className="p-4">
          <p className="text-gray-400 text-sm">Connect Xero to view consolidated financials</p>
        </div>
      </section>
    </div>
  )
}
