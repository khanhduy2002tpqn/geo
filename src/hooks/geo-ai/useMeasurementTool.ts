'use client'
import { useState, useCallback } from 'react'

export type MeasurementMode = 'none' | 'distance' | 'angle'

export interface MeasurementResult {
  mode: MeasurementMode
  points: string[]       // vertex IDs selected
  value: number | null   // computed distance or angle in degrees
}

export function useMeasurementTool() {
  const [mode, setMode] = useState<MeasurementMode>('none')
  const [points, setPoints] = useState<string[]>([])
  const [result, setResult] = useState<number | null>(null)

  const requiredPoints = mode === 'distance' ? 2 : mode === 'angle' ? 3 : 0

  const selectPoint = useCallback((vertexId: string, _position?: { x: number; y: number; z: number }) => {
    setPoints(prev => {
      const next = prev.includes(vertexId) ? prev.filter(p => p !== vertexId) : [...prev, vertexId]
      return next.slice(0, requiredPoints)
    })
  }, [requiredPoints])

  const setSelectedPoints = useCallback((vertexIds: string[]) => {
    setPoints(vertexIds.slice(0, requiredPoints))
    setResult(null)
  }, [requiredPoints])

  // Call this when positions are known to compute result
  const compute = useCallback((positions: Array<{ x: number; y: number; z: number }>) => {
    if (mode === 'distance' && positions.length === 2) {
      const dx = positions[1]!.x - positions[0]!.x
      const dy = positions[1]!.y - positions[0]!.y
      const dz = positions[1]!.z - positions[0]!.z
      setResult(Math.sqrt(dx*dx + dy*dy + dz*dz))
    } else if (mode === 'angle' && positions.length === 3) {
      // Angle at positions[1] between positions[0] and positions[2]
      const A = { x: positions[0]!.x - positions[1]!.x, y: positions[0]!.y - positions[1]!.y, z: positions[0]!.z - positions[1]!.z }
      const C = { x: positions[2]!.x - positions[1]!.x, y: positions[2]!.y - positions[1]!.y, z: positions[2]!.z - positions[1]!.z }
      const dot = A.x*C.x + A.y*C.y + A.z*C.z
      const magA = Math.sqrt(A.x**2 + A.y**2 + A.z**2)
      const magC = Math.sqrt(C.x**2 + C.y**2 + C.z**2)
      const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)))
      setResult((Math.acos(cosAngle) * 180) / Math.PI)
    }
  }, [mode])

  const activateDistance = useCallback(() => {
    setMode('distance')
    setPoints([])
    setResult(null)
  }, [])

  const activateAngle = useCallback(() => {
    setMode('angle')
    setPoints([])
    setResult(null)
  }, [])

  const deactivate = useCallback(() => {
    setMode('none')
    setPoints([])
    setResult(null)
  }, [])

  const clearPoints = useCallback(() => {
    setPoints([])
    setResult(null)
  }, [])

  return {
    mode, points, result, requiredPoints,
    selectPoint, setSelectedPoints, compute,
    activateDistance, activateAngle, deactivate, clearPoints,
  }
}
