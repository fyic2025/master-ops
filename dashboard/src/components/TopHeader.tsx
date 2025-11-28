'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BUSINESSES, BUSINESS_ORDER, type BusinessCode } from '@/lib/business-config'

export function TopHeader() {
  const params = useParams()
  const currentBusiness = (params.business as BusinessCode) || 'home'

  return (
    <header className="sticky top-0 z-50 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4">
      {/* Logo */}
      <Link href="/home" className="flex items-center gap-2 mr-6">
        <span className="text-xl font-bold text-white">Master Ops</span>
      </Link>

      {/* Business Tabs */}
      <nav className="flex items-center gap-1">
        {BUSINESS_ORDER.map((code) => {
          const business = BUSINESSES[code]
          const isActive = currentBusiness === code

          return (
            <Link
              key={code}
              href={`/${code}`}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-colors
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${business.color}`} />
              {business.shortName}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
