'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BUSINESSES, BUSINESS_ORDER, type BusinessCode } from '@/lib/business-config'
import { getAllowedBusinesses, isAdmin, getDefaultRedirect } from '@/lib/user-permissions'

export function TopHeader() {
  const params = useParams()
  const { data: session } = useSession()
  const currentBusiness = (params.business as BusinessCode) || 'home'

  // DEV: Allow ?viewAs=peter@teelixir.com to test other user views
  const [viewAsEmail, setViewAsEmail] = useState<string | null>(null)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const viewAs = searchParams.get('viewAs')
    if (viewAs) setViewAsEmail(viewAs)
  }, [])

  const userEmail = viewAsEmail || session?.user?.email

  // Filter businesses based on user permissions
  const allowedBusinesses = getAllowedBusinesses(userEmail)
  const hasFullAccess = isAdmin(userEmail)

  // Get the default landing page for restricted users
  const defaultRedirect = getDefaultRedirect(userEmail)

  // Filter business tabs based on permissions
  const visibleBusinesses = hasFullAccess
    ? BUSINESS_ORDER
    : BUSINESS_ORDER.filter(code => allowedBusinesses.includes(code))

  // Preserve viewAs parameter in links
  const getHref = (path: string) => viewAsEmail ? `${path}?viewAs=${viewAsEmail}` : path

  return (
    <header className="sticky top-0 z-50 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4">
      {/* Logo */}
      <Link href={getHref(hasFullAccess ? "/home" : defaultRedirect)} className="flex items-center gap-2 mr-6">
        <span className="text-xl font-bold text-white">Master Ops</span>
        {viewAsEmail && <span className="text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">viewing as: {viewAsEmail.split('@')[0]}</span>}
      </Link>

      {/* Business Tabs */}
      <nav className="flex items-center gap-1">
        {visibleBusinesses.map((code) => {
          const business = BUSINESSES[code]
          const isActive = currentBusiness === code

          return (
            <Link
              key={code}
              href={getHref(`/${code}`)}
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
