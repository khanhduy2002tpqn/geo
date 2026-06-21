'use client'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { GeometryMesh } from './GeometryMesh'
import type { ShowcaseItem } from '@/hooks/geo-ai/useShowcaseShapes'

const SHAPE_SCALE = 4.5
const HOVER_SCALE = 1.18
const REST_SCALE = 1.0

// Colors cycle by DB order — no hardcoded shape names.
// Add more shapes → palette wraps around automatically.
const COLOR_PALETTE = [
  '#818cf8', // indigo
  '#06b6d4', // cyan
  '#60a5fa', // cornflower blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#38bdf8', // sky
  '#2dd4bf', // teal
  '#fb923c', // amber
  '#c084fc', // purple
]

// Sphere center is at y=0 in model space, extending ±r in all directions.
// Other shapes sit with base at y=0 and extend upward.
// Lift sphere by r in MODEL space (inside the scaled group) so after scaling
// its bottom is at y=0, matching other shapes' baseline.
function getSphereModelOffset(item: ShowcaseItem): [number, number, number] {
  if (item.model.spec.shape !== 'sphere') return [0, 0, 0]
  const r = item.model.spec.params.r ?? 1
  return [0, r, 0]
}

function ShowcaseShape({
  item,
  index,
  onClick,
}: {
  item: ShowcaseItem
  index: number
  onClick: () => void
}) {
  const rotRef = useRef<THREE.Group>(null)
  const hoverGroupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const currentScale = useRef(REST_SCALE)
  const isSphere = item.model.spec.shape === 'sphere'
  const sphereR = isSphere ? (item.model.spec.params.r ?? 1) : 0
  const shapeColor = COLOR_PALETTE[index % COLOR_PALETTE.length] ?? '#22d3ee'
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const wordCount = item.label.split(' ').length
  const lineCount = isMobile ? Math.ceil(wordCount / 3) : 1
  const labelY = -3.5 - (lineCount - 1) * 0.6

  useFrame((_, delta) => {
    if (rotRef.current) {
      rotRef.current.rotation.y += delta * 0.4
      if (isSphere) rotRef.current.rotation.x = 0.22
    }
    if (hoverGroupRef.current) {
      const target = hovered ? HOVER_SCALE : REST_SCALE
      currentScale.current += (target - currentScale.current) * Math.min(1, delta * 12)
      hoverGroupRef.current.scale.setScalar(currentScale.current)
    }
  })

  return (
    // Outer group: world position + pointer events. NOT rotated or scaled,
    // so the Html label stays in a fixed readable position.
    <group
      position={item.position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {/* Large invisible hit box so click registers anywhere near the shape */}
      <mesh>
        <boxGeometry args={[6, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Rotating + scaled shape */}
      <group ref={rotRef} scale={SHAPE_SCALE}>
        {/* Offset applied in model space so it scales with the shape */}
        <group ref={hoverGroupRef} position={getSphereModelOffset(item)}>
          <GeometryMesh
            model={item.model}
            selectedObjectId={null}
            onObjectSelect={() => {}}
            unfoldProgress={0}
            showLabels={false}
            showFaces={true}
            hiddenEdges={true}
            is2D={false}
            givenParams={[]}
            accentColor={shapeColor}
            edgeWidth={0.8}
          />
          {/* Wireframe overlay so the sphere looks like a 3D ball, not a flat disc */}
          {isSphere && (
            <mesh>
              <sphereGeometry args={[sphereR, 14, 10]} />
              <meshBasicMaterial color={shapeColor} wireframe transparent opacity={0.25} />
            </mesh>
          )}
        </group>
      </group>

      {/* Label sits just below the shape's base (y=0) in outer world space */}
      {/* onClick here is a native DOM handler — Html is a DOM portal, not R3F */}
      <Html position={[0, labelY, 0]} center zIndexRange={[10, 0]}>
        <span
          onClick={onClick}
          style={{
            color: hovered ? shapeColor : '#64748b',
            fontSize: '12px',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            textAlign: isMobile ? 'center' : 'left',
            textShadow: '0 1px 4px #000, 0 0 8px rgba(0,0,0,0.8)',
            cursor: 'pointer',
            transition: 'color 120ms',
            userSelect: 'none',
            padding: '4px 8px',
            wordSpacing: '-0.2em',
          }}
        >
          {isMobile
            ? item.label.split(' ').reduce<string[][]>((lines, word, i) => {
                if (i % 3 === 0) lines.push([])
                lines[lines.length - 1]!.push(word)
                return lines
              }, []).map((words, i, arr) => (
                <span key={i} style={{ display: 'block', lineHeight: 1.1 }}>{words.join(' ')}</span>
              ))
            : item.label}
        </span>
      </Html>
    </group>
  )
}

export function ShowcaseScene({
  items,
  onShapeClick,
}: {
  items: ShowcaseItem[]
  onShapeClick: (shapeKey: string) => void
}) {
  return (
    <>
      {items.map((item, i) => (
        <ShowcaseShape
          key={item.shapeKey}
          item={item}
          index={i}
          onClick={() => onShapeClick(item.shapeKey)}
        />
      ))}
    </>
  )
}
