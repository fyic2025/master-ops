'use client'

import { AlertCircle, Package } from 'lucide-react'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Product Health</h1>
        <p className="text-gray-400 mt-1">Monitor product data quality and issues</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Track product health metrics including missing images, descriptions,
          pricing issues, and inventory problems.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Health checks pending implementation</span>
        </div>
      </div>
    </div>
  )
}
