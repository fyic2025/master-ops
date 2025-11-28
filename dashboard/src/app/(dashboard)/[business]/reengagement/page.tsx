'use client'

import { Users, Mail, DollarSign } from 'lucide-react'

export default function ReengagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Customer Re-engagement</h1>
        <p className="text-gray-400 mt-1">Win back unengaged customers with targeted offers</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Identify customers who haven&apos;t engaged recently and send them a
          $40 discount offer via Klaviyo to win them back.
        </p>

        <div className="max-w-sm mx-auto space-y-3 text-left">
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white text-sm">Identify Unengaged</p>
              <p className="text-xs text-gray-500">No purchase in 90+ days</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white text-sm">$40 Discount Offer</p>
              <p className="text-xs text-gray-500">Personalized Klaviyo campaign</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <Mail className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-white text-sm">Automated Follow-up</p>
              <p className="text-xs text-gray-500">Track redemption & re-engagement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
