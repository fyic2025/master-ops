'use client'

import { Package } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-gray-400 mt-1">Stock levels and availability</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Track fresh produce inventory levels, manage stock allocations,
          and monitor availability for upcoming delivery slots.
        </p>
      </div>
    </div>
  )
}
