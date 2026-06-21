'use client'

import { useState, useCallback, useRef } from 'react'
import type { GeometryModel } from '@/types/geo-ai'

export function useGeoAICache() {
  const [model, setModel] = useState<GeometryModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const resolve = useCallback(async (prompt: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/geo-ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Không thể tạo mô hình')
      const data = await res.json() as { model: GeometryModel }
      setModel(data.model)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  return { model, loading, error, resolve, cancel, setModel }
}
