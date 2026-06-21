'use client'
import { Html } from '@react-three/drei'
import type { Vector3D } from '@/types/geo-ai'

// Explicit colors for common geometry labels
const LABEL_COLORS: Record<string, string> = {
  A: '#f97316', // orange
  B: '#22c55e', // green
  C: '#60a5fa', // sky blue
  D: '#e879f9', // fuchsia
  S: '#fbbf24', // amber — apex
  M: '#f472b6', // pink  — midpoint
  N: '#34d399', // emerald
  O: '#38bdf8', // cyan  — center
  I: '#a78bfa', // violet
  J: '#fb7185', // rose
  K: '#4ade80', // light green
  H: '#fb923c', // orange-red
  G: '#c084fc', // purple
  F: '#2dd4bf', // teal
  E: '#facc15', // yellow
}

const FALLBACK = [
  '#f97316','#22c55e','#60a5fa','#e879f9',
  '#34d399','#f472b6','#facc15','#38bdf8',
]

function labelColor(id: string): string {
  const key = id.toUpperCase()
  return LABEL_COLORS[key] ?? FALLBACK[key.charCodeAt(0) % FALLBACK.length] ?? '#cbd5e1'
}

interface ObjectLabelProps {
  id: string
  position: Vector3D
  selected: boolean
}

export function ObjectLabel({ id, position, selected }: ObjectLabelProps) {
  const color = selected ? '#ffffff' : labelColor(id)

  return (
    <Html
      position={[position.x, position.y + 0.22, position.z]}
      center
      zIndexRange={[10, 0]}
    >
      <span
        style={{
          color,
          fontSize: '32px',
          fontWeight: 800,
          fontFamily: 'ui-monospace, monospace',
          textShadow: `0 0 6px #000, 0 1px 3px #000, 0 0 12px ${color}55`,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '0.02em',
        }}
      >
        {id}
      </span>
    </Html>
  )
}
