'use client'

import { Mail, Users, Target } from 'lucide-react'

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Outreach</h1>
        <p className="text-gray-400 mt-1">Brand and retailer acquisition campaigns</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Manage outreach campaigns to onboard new brands and retailers
          onto the Brand Connections marketplace.
        </p>

        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-sm text-gray-400">Brands</p>
            <p className="text-xs text-gray-500">Outreach pipeline</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-gray-400">Retailers</p>
            <p className="text-xs text-gray-500">Partner network</p>
          </div>
        </div>
      </div>
    </div>
  )
}
