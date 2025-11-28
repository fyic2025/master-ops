'use client'

import { Clock, CheckCircle, XCircle } from 'lucide-react'

export default function TrialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trial Accounts</h1>
        <p className="text-gray-400 mt-1">Manage wholesale trial customers</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Track trial accounts, expiration dates, and conversion status.
          Manage the journey from prospect to approved wholesale customer.
        </p>

        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="w-10 h-10 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm text-gray-400">Active Trials</p>
            <p className="text-xl font-bold text-white">--</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-gray-400">Converted</p>
            <p className="text-xl font-bold text-white">--</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-gray-400">Expired</p>
            <p className="text-xl font-bold text-white">--</p>
          </div>
        </div>
      </div>
    </div>
  )
}
