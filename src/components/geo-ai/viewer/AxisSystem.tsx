'use client'
import { Line, Html } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

interface AxisSystemProps {
  visible: boolean
  showTicks?: boolean
  onAxisClick: (axis: 'X' | 'Y' | 'Z' | 'O') => void
  length?: number
  unit?: string
}

const AXIS_COLORS = { X: '#ef4444', Y: '#22c55e', Z: '#3b82f6' }
const AXIS_LENGTH = 8

// Arrow cone dimensions
const ARROW_H = 0.14
const ARROW_R = 0.038

// Rotation to orient Y-up cone toward each axis direction
const ARROW_ROTATIONS: Record<'X' | 'Y' | 'Z', [number, number, number]> = {
  X: [0, 0, -Math.PI / 2],
  Y: [0, 0, 0],
  Z: [Math.PI / 2, 0, 0],
}

function AxisTick({
  position,
  color,
  n,
}: {
  position: [number, number, number]
  color: string
  n: number
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Html center>
        <span style={{
          color,
          fontSize: '13px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          opacity: 0.9,
          userSelect: 'none',
          pointerEvents: 'none',
          textShadow: '0 0 4px #000, 0 1px 3px #000',
          transform: 'translate(14px, -4px)',
          display: 'block',
          whiteSpace: 'nowrap',
        }}>
          {n}
        </span>
      </Html>
    </group>
  )
}

function Axis({
  dir, color, label, length, showTicks, onAxisClick, unit,
}: {
  dir: [number, number, number]
  color: string
  label: 'X' | 'Y' | 'Z'
  length: number
  showTicks: boolean
  onAxisClick: (a: 'X' | 'Y' | 'Z' | 'O') => void
  unit?: string
}) {
  const arrowCenter = new THREE.Vector3(...dir).multiplyScalar(length + ARROW_H / 2)
  const labelPos = new THREE.Vector3(...dir).multiplyScalar(length + ARROW_H + 0.45)
  const arrowRot = ARROW_ROTATIONS[label]

  const ticks = useMemo(() => {
    const result: { pos: [number, number, number]; n: number }[] = []
    for (let i = 1; i <= Math.floor(length); i++) {
      const p = new THREE.Vector3(...dir).multiplyScalar(i)
      result.push({ pos: [p.x, p.y, p.z], n: i })
    }
    return result
  }, [dir, length])

  return (
    <group onClick={(e) => { e.stopPropagation(); onAxisClick(label) }}>
      {/* Axis line */}
      <Line
        points={[[0, 0, 0], [length * dir[0], length * dir[1], length * dir[2]]]}
        color={color}
        lineWidth={1.5}
      />
      {/* Arrow cone */}
      <mesh
        position={[arrowCenter.x, arrowCenter.y, arrowCenter.z]}
        rotation={arrowRot}
      >
        <coneGeometry args={[ARROW_R, ARROW_H, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      {/* Tick marks with numbers */}
      {showTicks && ticks.map(({ pos, n }) => (
        <AxisTick key={n} position={pos} color={color} n={n} />
      ))}
      {/* Axis label — letter + optional unit */}
      <Html position={[labelPos.x, labelPos.y, labelPos.z]} center>
        <span style={{
          color,
          fontWeight: 'bold',
          fontFamily: 'serif',
          textShadow: '0 1px 2px #000',
          userSelect: 'none',
          cursor: 'pointer',
          lineHeight: 1,
        }}>
          <span style={{ fontSize: '18px', fontStyle: 'italic' }}>{label.toLowerCase()}</span>
          {unit && (
            <span style={{
              fontSize: '10px',
              fontStyle: 'normal',
              fontFamily: 'monospace',
              opacity: 0.85,
              marginLeft: '2px',
              verticalAlign: 'middle',
            }}>
              ({unit})
            </span>
          )}
        </span>
      </Html>
    </group>
  )
}

export function AxisSystem({ visible, showTicks = false, onAxisClick, length = AXIS_LENGTH, unit }: AxisSystemProps) {
  if (!visible) return null

  return (
    <group>
      <Axis dir={[1, 0, 0]} color={AXIS_COLORS.X} label="X" length={length} showTicks={showTicks} onAxisClick={onAxisClick} unit={unit} />
      <Axis dir={[0, 1, 0]} color={AXIS_COLORS.Y} label="Y" length={length} showTicks={showTicks} onAxisClick={onAxisClick} unit={unit} />
      <Axis dir={[0, 0, 1]} color={AXIS_COLORS.Z} label="Z" length={length} showTicks={showTicks} onAxisClick={onAxisClick} unit={unit} />

      {/* Origin node */}
      <mesh onClick={(e) => { e.stopPropagation(); onAxisClick('O') }}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.2} />
      </mesh>
      <Html position={[0.2, 0.15, 0]} center>
        <span style={{
          color: '#94a3b8',
          fontSize: '12px',
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontWeight: 'bold',
          userSelect: 'none',
          textShadow: '0 1px 2px #000',
        }}>
          O
        </span>
      </Html>
    </group>
  )
}
