'use client'

import { useState, useCallback } from 'react'
import type { GeometryModel } from '@/types/geo-ai'

export function useConstructionSteps(model: GeometryModel | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const steps = model?.constructionSteps ?? []
  const canPrev = currentStep > 0
  const canNext = currentStep < steps.length - 1
  const prev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setCurrentStep(s => Math.min(steps.length - 1, s + 1)), [steps.length])
  const reset = useCallback(() => setCurrentStep(0), [])
  return { steps, currentStep, canPrev, canNext, prev, next, reset }
}
