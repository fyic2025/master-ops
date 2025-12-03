import { notFound } from 'next/navigation'
import { BUSINESSES, isValidBusinessCode, type BusinessCode } from '@/lib/business-config'
import { BusinessCard } from '@/components/BusinessCard'
import { IntegrationStatus } from '@/components/IntegrationStatus'
import { AlertsPanel } from '@/components/AlertsPanel'
import ApiUsageWidget from '@/components/ApiUsageWidget'
import { JobMonitoringWidget } from '@/components/JobMonitoringWidget'
import AwsMigrationWidget from '@/components/AwsMigrationWidget'
import { DispatchProblemsWidget } from '@/components/DispatchProblemsWidget'

export default function BusinessDashboard({
  params,
}: {
  params: { business: string }
}) {
  if (!isValidBusinessCode(params.business)) {
    notFound()
  }

  const businessCode = params.business as BusinessCode
  const business = BUSINESSES[businessCode]

  // Home shows cross-business overview
  if (businessCode === 'home') {
    return <HomeDashboard />
  }

  // Business-specific dashboard
  return <SingleBusinessDashboard businessCode={businessCode} />
}

function HomeDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-gray-400 mt-1">All businesses at a glance</p>
      </header>

      {/* Business Overview Cards */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Businesses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <BusinessCard
            name="Buy Organics Online"
            code="boo"
            platform="BigCommerce"
            color="bg-brand-boo"
          />
          <BusinessCard
            name="Red Hill Fresh"
            code="rhf"
            platform="WooCommerce"
            color="bg-brand-rhf"
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
            name="Brand Connections"
            code="brandco"
            platform="Coming Soon"
            color="bg-amber-500"
          />
        </div>
      </section>

      {/* Job Monitoring + Integration Status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Automated Jobs</h2>
          <JobMonitoringWidget />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Integration Health</h2>
          <IntegrationStatus />
        </div>
      </section>

      {/* AWS Migration Status */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Infrastructure Migration</h2>
        <AwsMigrationWidget />
      </section>

      {/* API Usage */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">API Usage</h2>
        <ApiUsageWidget />
      </section>

      {/* Alerts */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Alerts & Actions</h2>
        <AlertsPanel />
      </section>
    </div>
  )
}

function SingleBusinessDashboard({ businessCode }: { businessCode: BusinessCode }) {
  const business = BUSINESSES[businessCode]

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <span className={`w-4 h-4 rounded-full ${business.color}`} />
          <h1 className="text-3xl font-bold text-white">{business.name}</h1>
        </div>
        {business.platform && (
          <p className="text-gray-400 mt-1">{business.platform} Dashboard</p>
        )}
      </header>

      {/* BOO-specific widgets */}
      {businessCode === 'boo' && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Stock Alerts</h2>
          <DispatchProblemsWidget />
        </section>
      )}

      {/* Quick Stats - Placeholder for non-BOO */}
      {businessCode !== 'boo' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Coming Soon</p>
              <p className="text-2xl font-bold text-white mt-1">—</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Coming Soon</p>
              <p className="text-2xl font-bold text-white mt-1">—</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Coming Soon</p>
              <p className="text-2xl font-bold text-white mt-1">—</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Coming Soon</p>
              <p className="text-2xl font-bold text-white mt-1">—</p>
            </div>
          </div>

          {/* Placeholder content */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-gray-400">
              Business-specific features for {business.name} will appear here.
              Use the sidebar to navigate to specific features.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
