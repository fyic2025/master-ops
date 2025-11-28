'use client'

import { BarChart3, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AdsPerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ads Performance</h1>
        <p className="text-gray-400 mt-1">Google Ads campaign metrics and optimization</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Track Google Ads performance for Teelixir campaigns including
          ROAS, conversion rates, and budget optimization.
        </p>
        <Link
          href="https://ads.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <ExternalLink className="w-4 h-4" />
          Open Google Ads
        </Link>
      </div>
    </div>
  )
}
