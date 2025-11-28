import { BusinessCard } from '@/components/BusinessCard'
import { IntegrationStatus } from '@/components/IntegrationStatus'
import { AlertsPanel } from '@/components/AlertsPanel'

export default function Home() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-gray-400 mt-1">All businesses at a glance</p>
      </header>

      {/* Business Overview Cards */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Businesses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BusinessCard
            name="Buy Organics Online"
            code="boo"
            platform="BigCommerce"
            color="bg-brand-boo"
          />
          <BusinessCard
            name="Teelixir"
            code="teelixir"
            platform="Shopify"
            color="bg-brand-teelixir"
          />
          <BusinessCard
            name="Elevate Wholesale"
            code="elevate"
            platform="Shopify B2B"
            color="bg-brand-elevate"
          />
          <BusinessCard
            name="Red Hill Fresh"
            code="rhf"
            platform="WooCommerce"
            color="bg-brand-rhf"
          />
        </div>
      </section>

      {/* Integration Status */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Integration Health</h2>
        <IntegrationStatus />
      </section>

      {/* Alerts */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Alerts & Actions</h2>
        <AlertsPanel />
      </section>
    </div>
  )
}
