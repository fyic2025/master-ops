'use client'

import { Package, RefreshCw } from 'lucide-react'

export default function StockSyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Stock Sync</h1>
        <p className="text-gray-400 mt-1">Unleashed → BigCommerce inventory synchronization</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          View stock sync status between Unleashed inventory management and
          BigCommerce product levels.
        </p>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          Trigger Sync
        </button>
      </div>
    </div>
  )
}
