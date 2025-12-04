import { AppLayout } from '@/components/AppLayout'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
