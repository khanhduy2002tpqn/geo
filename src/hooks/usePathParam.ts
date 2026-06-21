'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Read + write the first path segment as a param.
 * Navigates between `/` (null) and `/<value>` without scroll.
 */
export function usePathParam(): readonly [string | null, (value: string | null) => void] {
  const router = useRouter()
  const pathname = usePathname()

  // Extract slug from /<slug>; root path returns null
  const value = pathname === '/' ? null : pathname.slice(1) || null

  const setValue = useCallback(
    (next: string | null) => {
      if (next) {
        router.push(`/${next}`, { scroll: false })
      } else {
        router.replace('/', { scroll: false })
      }
    },
    [router],
  )

  return [value, setValue] as const
}
