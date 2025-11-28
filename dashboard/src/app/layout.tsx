import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/QueryProvider'
import { SessionProvider } from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'Master Ops Dashboard',
  description: 'Centralized operations dashboard for all businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950">
        <SessionProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
