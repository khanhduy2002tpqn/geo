'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Read + write a single URL query param without a full navigation.
 *
 * Uses `router.replace(..., { scroll: false })` so the change is shallow:
 * the address bar + `useSearchParams` update, scroll position is preserved,
 * and on F5 the param is still there to restore selection.
 *
 * Must be used under a `<Suspense>` boundary (Next.js requirement for
 * `useSearchParams`).
 */
export function useUrlParam(key: string): readonly [string | null, (value: string | null) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const value = searchParams.get(key)

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next) params.set(key, next)
      else params.delete(key)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [key, pathname, router, searchParams],
  )

  return [value, setValue] as const
}
