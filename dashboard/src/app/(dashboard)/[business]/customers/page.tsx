'use client'

import { Users, Search } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-gray-400 mt-1">Wholesale customer management</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          View and manage wholesale customers, their order history,
          account status, and pricing tiers.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Search className="w-4 h-4" />
          <span className="text-sm">Customer search and filtering</span>
        </div>
      </div>
    </div>
  )
}
