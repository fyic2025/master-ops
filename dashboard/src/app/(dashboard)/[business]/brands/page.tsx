'use client'

import { Tag } from 'lucide-react'

export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Brands</h1>
        <p className="text-gray-400 mt-1">Manage brand pages and content</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Tag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Manage brand listings, supplier relationships, and brand page content
          across your store.
        </p>
      </div>
    </div>
  )
}
