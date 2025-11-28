'use client'

import { RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function HubSpotSyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HubSpot Sync</h1>
        <p className="text-gray-400 mt-1">Contact and deal synchronization status</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Monitor the synchronization between HubSpot CRM and Shopify.
          Track contact imports, deal updates, and sync errors.
        </p>
        <Link
          href="https://app.hubspot.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
        >
          <ExternalLink className="w-4 h-4" />
          Open HubSpot
        </Link>
      </div>
    </div>
  )
}
