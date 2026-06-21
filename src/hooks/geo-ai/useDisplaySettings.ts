'use client'
import { useState, useCallback } from 'react'

export interface DisplaySettings {
  showAxes: boolean
  showAxisTicks: boolean
  showGrid: boolean
  showLabels: boolean
  showFaces: boolean
  hiddenEdges: boolean
  animations: boolean
}

const DEFAULTS: DisplaySettings = {
  showAxes: true,
  showAxisTicks: false,
  showGrid: false,
  showLabels: true,
  showFaces: true,
  hiddenEdges: true,
  animations: true,
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULTS)

  const toggle = useCallback((key: keyof DisplaySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const update = useCallback((key: keyof DisplaySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULTS), [])

  return { settings, toggle, update, reset }
}
