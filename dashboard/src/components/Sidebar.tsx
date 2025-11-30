'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { BUSINESSES, type BusinessCode } from '@/lib/business-config'
import { getAllowedPages, isAdmin } from '@/lib/user-permissions'

export function Sidebar() {
  const params = useParams()
  const pathname = usePathname()
  const { data: session } = useSession()

  const businessCode = (params.business as BusinessCode) || 'home'
  const business = BUSINESSES[businessCode] || BUSINESSES.home
  const userEmail = session?.user?.email

  // Filter navigation based on user permissions
  const allowedPages = getAllowedPages(userEmail, businessCode)
  const hasFullAccess = allowedPages.includes('all') || isAdmin(userEmail)

  const navigation = hasFullAccess
    ? business.navigation
    : business.navigation.filter(item => allowedPages.includes(item.href))

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Business Context Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${business.color}`} />
          <h2 className="text-lg font-semibold text-white">{business.name}</h2>
        </div>
        {business.platform && (
          <p className="text-xs text-gray-500 mt-1">{business.platform}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const fullHref = `/${businessCode}${item.href}`
          const isActive = pathname === fullHref ||
            (item.href === '' && pathname === `/${businessCode}`)

          return (
            <Link
              key={item.name}
              href={fullHref}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-800">
        {session?.user && (
          <div className="flex items-center gap-3 mb-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <p className="text-xs text-gray-600 mt-2">v0.3.0</p>
      </div>
    </aside>
  )
}
