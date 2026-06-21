import { Suspense } from 'react'
import { GeoAIStudio } from '@/components/geo-ai/GeoAIStudio'

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-slate-950 text-white">
          Đang tải...
        </div>
      }
    >
      <GeoAIStudio />
    </Suspense>
  )
}
