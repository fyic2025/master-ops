'use client'

import { ShoppingCart, MapPin } from 'lucide-react'

export default function RetailersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Retailers</h1>
        <p className="text-gray-400 mt-1">Retail partners on the Brand Connections marketplace</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Manage retail partners, their locations, and product selections.
          Connect brands with the right retailers.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">Australian retail network</span>
        </div>
      </div>
    </div>
  )
}
