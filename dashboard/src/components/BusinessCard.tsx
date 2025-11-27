'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface BusinessCardProps {
  name: string
  code: string
  platform: string
  color: string
}

export function BusinessCard({ name, code, platform, color }: BusinessCardProps) {
  return (
    <Link href={`/business/${code}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
        <div className="flex items-start justify-between">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mt-3">{name}</h3>
        <p className="text-sm text-gray-500">{platform}</p>

        {/* Quick stats - will be populated from Supabase */}
        <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Orders Today</p>
            <p className="text-lg font-semibold text-white">--</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-semibold text-white">--</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
