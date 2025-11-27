import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { QueryProvider } from '@/components/QueryProvider'

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
        <QueryProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  )
}
