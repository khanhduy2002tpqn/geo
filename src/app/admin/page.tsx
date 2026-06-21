import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminShapesClient } from '@/components/admin/AdminShapesClient'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Quản trị thư viện hình học',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
          Đang tải...
        </div>
      }
    >
      <AdminShapesClient />
    </Suspense>
  )
}
