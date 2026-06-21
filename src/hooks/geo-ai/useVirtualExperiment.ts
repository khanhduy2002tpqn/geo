'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { VirtualExperiment, ExperimentFrame } from '@/types/geo-ai'

export function useVirtualExperiment(experiment: VirtualExperiment | null) {
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const play = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsPlaying(true)
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 1) {
          setIsPlaying(false)
          clearInterval(intervalRef.current!)
          return 1
        }
        return Math.min(1, p + 0.01)
      })
    }, 50)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const reset = useCallback(() => {
    pause()
    setProgress(0)
  }, [pause])

  const currentFrame: ExperimentFrame | null = (() => {
    if (!experiment?.frames.length) return null
    let best: ExperimentFrame = experiment.frames[0]!
    for (const frame of experiment.frames) {
      if (frame.time <= progress) best = frame
    }
    return best
  })()

  return { progress, isPlaying, currentFrame, play, pause, reset }
}
