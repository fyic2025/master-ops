import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/QueryProvider'
import { SessionProvider } from '@/components/SessionProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorHandlerInit } from '@/components/ErrorHandlerInit'

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
        <ErrorHandlerInit />
        <SessionProvider>
          <QueryProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
