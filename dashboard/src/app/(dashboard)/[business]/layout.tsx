import { AppLayout } from '@/components/AppLayout'
import { notFound } from 'next/navigation'
import { isValidBusinessCode } from '@/lib/business-config'

export default function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { business: string }
}) {
  // Validate business code
  if (!isValidBusinessCode(params.business)) {
    notFound()
  }

  return <AppLayout>{children}</AppLayout>
}
