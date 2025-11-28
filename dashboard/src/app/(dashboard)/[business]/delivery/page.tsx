'use client'

import { Truck, MapPin } from 'lucide-react'

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delivery Zones</h1>
        <p className="text-gray-400 mt-1">Manage delivery areas and scheduling</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Configure delivery zones, time slots, and manage the fresh produce
          delivery schedule for Red Hill Fresh.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">Mornington Peninsula delivery management</span>
        </div>
      </div>
    </div>
  )
}
