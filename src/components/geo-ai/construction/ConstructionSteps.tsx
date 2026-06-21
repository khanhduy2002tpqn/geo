'use client'

import type { ConstructionStep } from '@/types/geo-ai'

interface ConstructionStepsProps {
  steps: ConstructionStep[]
  currentStep: number
}

export default function ConstructionSteps({ steps, currentStep }: ConstructionStepsProps) {
  if (!steps.length) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
        Chưa có bước dựng hình.
      </div>
    )
  }

  return (
    <ol className="space-y-1 p-3">
      {steps.map((step) => {
        const isPast = step.index < currentStep
        const isCurrent = step.index === currentStep
        const isFuture = step.index > currentStep

        return (
          <li
            key={step.index}
            className={[
              'flex gap-3 items-start rounded-lg px-3 py-2 transition-all duration-200',
              isCurrent && 'bg-indigo-600/15 ring-1 ring-indigo-500/50',
              isPast && 'opacity-60',
              isFuture && 'opacity-30',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Step number badge */}
            <span
              className={[
                'flex-shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5',
                isCurrent && 'bg-indigo-600 text-white',
                isPast && 'bg-slate-700 text-slate-400',
                isFuture && 'bg-slate-800 text-slate-600 border border-slate-700',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.index + 1}
            </span>

            {/* Step description */}
            <span
              className={[
                'text-sm leading-relaxed',
                isCurrent && 'text-indigo-300 font-medium',
                isPast && 'text-slate-500',
                isFuture && 'text-slate-400',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.description}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
