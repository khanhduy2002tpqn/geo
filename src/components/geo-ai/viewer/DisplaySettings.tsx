'use client'
import { useState } from 'react'
import type { DisplaySettings } from '@/hooks/geo-ai/useDisplaySettings'

interface DisplaySettingsProps {
  settings: DisplaySettings
  onToggle: (key: keyof DisplaySettings) => void
}

const LABELS: Record<keyof DisplaySettings, string> = {
  showAxes:      'Trục tọa độ',
  showAxisTicks: 'Số trên trục',
  showGrid:      'Lưới nền',
  showLabels:    'Nhãn',
  showFaces:     'Mặt phẳng',
  hiddenEdges:   'Cạnh khuất',
  animations:    'Hoạt ảnh',
}

const ICONS: Record<keyof DisplaySettings, string> = {
  showAxes:      '⊕',
  showAxisTicks: '123',
  showGrid:      '▦',
  showLabels:    'Aa',
  showFaces:     '◻',
  hiddenEdges:   '⋯',
  animations:    '▶',
}

function Toggle({ label, icon, checked, onToggle }: {
  label: string; icon: string; checked: boolean; onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
    >
      <span className="flex items-center gap-2 text-sm text-slate-300 min-w-0">
        <span className="text-xs text-slate-500 w-4 text-center flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {/* Track */}
      <div className={[
        'relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ml-2',
        checked ? 'bg-cyan-600' : 'bg-slate-600',
      ].join(' ')}>
        {/* Thumb */}
        <div className={[
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')} />
      </div>
    </button>
  )
}

export function DisplaySettingsPanel({ settings, onToggle }: DisplaySettingsProps) {
  const [open, setOpen] = useState(false)
  const keys = Object.keys(settings) as (keyof DisplaySettings)[]

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">⚙ Hiển thị</span>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="bg-slate-950 py-1">
          {keys.map(key => (
            <Toggle
              key={key}
              label={LABELS[key]}
              icon={ICONS[key]}
              checked={settings[key]}
              onToggle={() => onToggle(key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
