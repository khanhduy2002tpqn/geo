'use client'
import { Line, Html } from '@react-three/drei'
import { useRef, useMemo, useEffect, useCallback, createContext, useContext } from 'react'
import * as THREE from 'three'
import type { GeometryModel, GeometryVertex, GeometryFace, UnfoldMode } from '@/types/geo-ai'
import { ObjectLabel } from './ObjectLabel'

// Shared accent color — set by GeometryMesh's Provider, consumed by sub-components
// without prop drilling. undefined = use each component's own default color.
const AccentColorContext = createContext<string | undefined>(undefined)

interface GeometryMeshProps {
  model: GeometryModel
  selectedObjectId: string | null
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  unfoldProgress: number
  unfoldMode?: UnfoldMode
  stepHighlight?: { vertices: string[]; edges: string[]; faces: string[] }
  stepVisibility?: { vertices: string[]; edges: string[]; faces: string[] }
  waterLevel?: number   // 0-1 experiment fill level
  showLabels?: boolean
  showFaces?: boolean
  hiddenEdges?: boolean
  is2D?: boolean
  measurementMode?: 'none' | 'distance' | 'angle'
  measurementPoints?: string[]
  givenParams?: string[]
  params?: Record<string, number>
  unit?: string
  accentColor?: string
  edgeWidth?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toV3(v: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z)
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

type CuboidFaceRole = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom'

function cuboidFaceRole(
  face: GeometryFace,
  allVertices: Record<string, GeometryVertex>,
): CuboidFaceRole | null {
  if (face.type === 'top') return 'top'
  if (face.type === 'base') return 'bottom'

  const positions = face.vertices.flatMap((id) => {
    const vertex = allVertices[id]
    return vertex ? [vertex.position] : []
  })
  if (positions.length < 3) return null

  const all = Object.values(allVertices).map((vertex) => vertex.position)
  const xMin = Math.min(...all.map((p) => p.x))
  const xMax = Math.max(...all.map((p) => p.x))
  const zMin = Math.min(...all.map((p) => p.z))
  const zMax = Math.max(...all.map((p) => p.z))
  const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length
  const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length

  if (Math.abs(avgZ - zMin) <= Math.abs(avgX - xMax)
    && Math.abs(avgZ - zMin) <= Math.abs(avgZ - zMax)
    && Math.abs(avgZ - zMin) <= Math.abs(avgX - xMin)) return 'front'
  if (Math.abs(avgX - xMax) <= Math.abs(avgZ - zMax)
    && Math.abs(avgX - xMax) <= Math.abs(avgX - xMin)) return 'right'
  if (Math.abs(avgZ - zMax) <= Math.abs(avgX - xMin)) return 'back'
  return 'left'
}

/**
 * Reproduce the reference cuboid nets: four side faces form one connected
 * horizontal strip in the order left-front-right-back; in the full net the
 * top and bottom faces attach to the front face.
 */
export function unfoldedVertexPosition(
  face: GeometryFace,
  vertex: GeometryVertex,
  allVertices: Record<string, GeometryVertex>,
  mode: UnfoldMode,
  progress: number
): THREE.Vector3 {
  const original = toV3(vertex.position)
  if (progress <= 0 || mode === 'closed') return original

  const positions = Object.values(allVertices).map((v) => v.position)
  const xMin = Math.min(...positions.map((p) => p.x))
  const xMax = Math.max(...positions.map((p) => p.x))
  const yMin = Math.min(...positions.map((p) => p.y))
  const yMax = Math.max(...positions.map((p) => p.y))
  const zMin = Math.min(...positions.map((p) => p.z))
  const zMax = Math.max(...positions.map((p) => p.z))
  const length = xMax - xMin
  const width = zMax - zMin
  const height = yMax - yMin
  const centerX = (xMin + xMax) / 2
  const centerY = (yMin + yMax) / 2
  const centerZ = (zMin + zMax) / 2
  const stripWidth = length * 2 + width * 2
  const stripLeft = centerX - stripWidth / 2
  const leftStart = stripLeft
  const frontStart = leftStart + width
  const rightStart = frontStart + length
  const backStart = rightStart + width
  const role = cuboidFaceRole(face, allVertices)

  const targetFor = (point: THREE.Vector3): THREE.Vector3 => {
    const target = point.clone()
    switch (role) {
      case 'front':
        return target.set(frontStart + (point.x - xMin), centerY + (point.y - centerY), centerZ)
      case 'right':
        return target.set(rightStart + (point.z - zMin), centerY + (point.y - centerY), centerZ)
      case 'back':
        return target.set(backStart + (xMax - point.x), centerY + (point.y - centerY), centerZ)
      case 'left':
        return target.set(leftStart + (zMax - point.z), centerY + (point.y - centerY), centerZ)
      case 'top':
        return mode === 'full'
          ? target.set(frontStart + (point.x - xMin), centerY + height / 2 + (point.z - zMin), centerZ)
          : target
      case 'bottom':
        return mode === 'full'
          ? target.set(frontStart + (point.x - xMin), centerY - height / 2 - (point.z - zMin), centerZ)
          : target
      default:
        return target
    }
  }

  const closedPoints = face.vertices.flatMap((id) => {
    const item = allVertices[id]
    return item ? [toV3(item.position)] : []
  })
  if (closedPoints.length < 3) return original
  const openPoints = closedPoints.map(targetFor)
  const closedCenter = closedPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / closedPoints.length)
  const openCenter = openPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / openPoints.length)

  const orientation = (points: THREE.Vector3[]): THREE.Quaternion => {
    const xAxis = points[1]!.clone().sub(points[0]!).normalize()
    const normal = points[1]!.clone().sub(points[0]!)
      .cross(points[2]!.clone().sub(points[0]!))
      .normalize()
    const yAxis = normal.clone().cross(xAxis).normalize()
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, normal),
    )
  }

  const eased = easeInOutCubic(progress)
  const closedRotation = orientation(closedPoints)
  const rotation = closedRotation.clone().slerp(orientation(openPoints), eased)
  const local = original.clone().sub(closedCenter).applyQuaternion(closedRotation.clone().invert())
  const center = closedCenter.clone().lerp(openCenter, eased)
  return center.add(local.applyQuaternion(rotation))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VertexSphereProps {
  vertexId: string
  position: THREE.Vector3
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  isStepHighlight?: boolean
  isMeasureSelected?: boolean
  radius?: number
}

function VertexSphere({ vertexId, position, selected, onObjectSelect, isStepHighlight, isMeasureSelected, radius = 0.08 }: VertexSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const accentColor = useContext(AccentColorContext)
  const color = selected ? '#fbbf24' : isMeasureSelected ? '#a78bfa' : isStepHighlight ? '#fb923c' : accentColor ?? '#38bdf8'
  const emissiveIntensity = selected ? 0.6 : isMeasureSelected ? 0.7 : isStepHighlight ? 1.0 : 0.25

  const handleClick = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    onObjectSelect(vertexId, 'vertex')
  }

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[radius * 3.2, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface FaceMeshProps {
  faceId: string
  positions: THREE.Vector3[]
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  isStepHighlight?: boolean
  depthMask?: boolean
  visibleFace?: boolean
  opacity?: number
  showOutline?: boolean
}

function FaceMesh({
  faceId,
  positions,
  selected,
  onObjectSelect,
  isStepHighlight,
  depthMask = false,
  visibleFace = true,
  opacity = 1,
  showOutline = false,
}: FaceMeshProps) {
  const accentColor = useContext(AccentColorContext)
  const geometry = useMemo(() => {
    if (positions.length < 3) return null
    const geo = new THREE.BufferGeometry()

    if (positions.length === 3) {
      // Triangle
      const verts = new Float32Array([
        positions[0]!.x, positions[0]!.y, positions[0]!.z,
        positions[1]!.x, positions[1]!.y, positions[1]!.z,
        positions[2]!.x, positions[2]!.y, positions[2]!.z,
      ])
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      geo.setIndex([0, 1, 2])
    } else {
      // Polygon: fan triangulation from first vertex
      const verts: number[] = []
      for (const p of positions) {
        verts.push(p.x, p.y, p.z)
      }
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
      const indices: number[] = []
      for (let i = 1; i < positions.length - 1; i++) {
        indices.push(0, i, i + 1)
      }
      geo.setIndex(indices)
    }

    geo.computeVertexNormals()
    return geo
  }, [positions])

  // Dispose previous geometry to free GPU memory when positions change or component unmounts
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  if (!geometry) return null

  const materialOpacity = (selected ? 0.5 : isStepHighlight ? 0.65 : 0.22) * opacity
  const color = selected ? '#7dd3fc' : isStepHighlight ? '#fbbf24' : accentColor ?? '#0ea5e9'

  return (
    <group>
      {depthMask && (
        <mesh geometry={geometry} renderOrder={-1}>
          <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
        </mesh>
      )}
      {visibleFace && (
        <mesh
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation()
            onObjectSelect(faceId, 'face')
          }}
        >
          <meshStandardMaterial
            color={color}
            emissive={isStepHighlight ? '#d97706' : undefined}
            emissiveIntensity={isStepHighlight ? 0.3 : 0}
            transparent
            opacity={materialOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {showOutline && opacity > 0.02 && positions.length >= 3 && (
        <Line
          points={[...positions, positions[0]!]}
          color={selected ? '#f59e0b' : accentColor ?? '#67e8f9'}
          lineWidth={selected ? 3 : 1.5}
          transparent
          opacity={opacity}
          depthTest={false}
          renderOrder={2}
        />
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Curved shape renderers (cylinder / cone / sphere)
// ---------------------------------------------------------------------------

function CylinderShape({
  model,
  selected,
  onObjectSelect,
  stepHighlightFaces = [],
  depthMask = false,
  showFaces = true,
  unit = 'cm',
}: {
  model: GeometryModel
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  stepHighlightFaces?: string[]
  depthMask?: boolean
  showFaces?: boolean
  unit?: string
}) {
  const accentColor = useContext(AccentColorContext)
  const r = model.spec.params.r ?? 1
  const h = model.spec.params.h ?? 1

  // Top circle: always fully solid (camera elevated — full top ellipse visible)
  const topCirclePts = useMemo(() => Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    return new THREE.Vector3(r * Math.cos(a), h / 2, r * Math.sin(a))
  }), [r, h])

  // Bottom circle: front arc z>0 (solid), back arc z<0 (dashed)
  // θ ∈ [0,π] → sin>0 → z>0 = front visible; θ ∈ [π,2π] → sin<0 → z<0 = hidden
  const bottomFrontArc = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), -h / 2, r * Math.sin(a))
  }), [r, h])

  const bottomBackArc = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = Math.PI + (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), -h / 2, r * Math.sin(a))
  }), [r, h])

  const faceColor = (faceId: string) => {
    if (selected) return '#7dd3fc'
    return stepHighlightFaces.includes(faceId) ? '#fbbf24' : accentColor ?? '#0ea5e9'
  }
  const faceOpacity = (faceId: string) => {
    if (selected) return 0.5
    if (faceId === 'lateral') return stepHighlightFaces.includes(faceId) ? 0.65 : 0.18
    return stepHighlightFaces.includes(faceId) ? 0.65 : 0.22
  }

  const edgeColor = accentColor ?? '#22d3ee'

  return (
    <group position={[0, h / 2, 0]}>
      {depthMask && (
        <>
          <mesh position={[0, -h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
            <circleGeometry args={[r, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
            <circleGeometry args={[r, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          <mesh renderOrder={-1}>
            <cylinderGeometry args={[r, r, h, 32, 1, false]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          {/* 2D outlines: top circle fully solid (fully visible from elevated camera) */}
          <Line points={topCirclePts} color={edgeColor} lineWidth={1.5} />
          {/* 2D outlines: bottom circle — front arc solid, back arc dashed (depthTest=false to show through cylinder wall) */}
          <Line points={bottomFrontArc} color={edgeColor} lineWidth={1.5} />
          <Line points={bottomBackArc} color={edgeColor} lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          {/* 2D outlines: vertical silhouette lines always solid (outermost visible edges) */}
          <Line points={[new THREE.Vector3(-r, -h / 2, 0), new THREE.Vector3(-r, h / 2, 0)]} color={edgeColor} lineWidth={1.5} />
          <Line points={[new THREE.Vector3(r, -h / 2, 0), new THREE.Vector3(r, h / 2, 0)]} color={edgeColor} lineWidth={1.5} />
          {/* 2D radius line: center of bottom circle → right rim (solid, visible) */}
          <Line points={[new THREE.Vector3(0, -h / 2, 0), new THREE.Vector3(r, -h / 2, 0)]} color="#fbbf24" lineWidth={1.5} />
          {/* 2D radius line: center → left rim (dashed — other half of diameter, horizontal, clearly visible) */}
          <Line points={[new THREE.Vector3(0, -h / 2, 0), new THREE.Vector3(r, -h / 2, 0)]} color="#fbbf24" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          <Html zIndexRange={[10, 0]} position={[r / 2, -h / 2 + 0.18, 0]} center>
            <span style={{
              color: '#fbbf24',
              fontSize: '18px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.65)',
              padding: '1px 5px',
              borderRadius: '4px',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px #000',
            }}>
              r = {r} {unit}
            </span>
          </Html>
        </>
      )}
      {showFaces && (
        <>
          {/* bottom disk — at local y=-h/2, world y=0. Normal points DOWN (-Y, outward)
              so lighting reads correctly. DoubleSide keeps the fill colored like other shapes. */}
          <mesh position={[0, -h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onObjectSelect('bottom', 'face') }}>
            <circleGeometry args={[r, 32]} />
            <meshStandardMaterial color={faceColor('bottom')} transparent opacity={faceOpacity('bottom')} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* top disk — at local y=h/2, world y=h. Normal points UP (+Y, outward). */}
          <mesh position={[0, h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onObjectSelect('top', 'face') }}>
            <circleGeometry args={[r, 32]} />
            <meshStandardMaterial color={faceColor('top')} transparent opacity={faceOpacity('top')} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* lateral surface — FrontSide only; DoubleSide would stack front+back layers making it appear solid */}
          <mesh onClick={(e) => { e.stopPropagation(); onObjectSelect('lateral', 'face') }}>
            <cylinderGeometry args={[r, r, h, 32, 1, true]} />
            <meshStandardMaterial color={faceColor('lateral')} transparent opacity={faceOpacity('lateral')} side={THREE.FrontSide} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function ConeShape({
  model,
  selected,
  onObjectSelect,
  stepHighlightFaces = [],
  depthMask = false,
  showFaces = true,
  unit = 'cm',
}: {
  model: GeometryModel
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  stepHighlightFaces?: string[]
  depthMask?: boolean
  showFaces?: boolean
  unit?: string
}) {
  const accentColor = useContext(AccentColorContext)
  const r = model.spec.params.r ?? 1
  const h = model.spec.params.h ?? 1

  // Base circle: front arc z>0 (solid), back arc z<0 (dashed)
  const baseFrontArc = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))
  }), [r])

  const baseBackArc = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = Math.PI + (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))
  }), [r])

  const faceColor = (faceId: string) => {
    if (selected) return '#7dd3fc'
    return stepHighlightFaces.includes(faceId) ? '#fbbf24' : accentColor ?? '#0ea5e9'
  }
  const faceOpacity = (faceId: string) => {
    if (selected) return 0.5
    if (faceId === 'lateral') return stepHighlightFaces.includes(faceId) ? 0.65 : 0.18
    return stepHighlightFaces.includes(faceId) ? 0.65 : 0.22
  }

  const edgeColor = accentColor ?? '#22d3ee'

  return (
    <group>
      {depthMask && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
            <circleGeometry args={[r, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          <mesh position={[0, h / 2, 0]} renderOrder={-1}>
            <coneGeometry args={[r, h, 32, 1, false]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          {/* 2D outlines: base circle — front arc solid, back arc dashed through cone body */}
          <Line points={baseFrontArc} color={edgeColor} lineWidth={1.5} />
          <Line points={baseBackArc} color={edgeColor} lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          {/* 2D outlines: lateral silhouette lines to apex always solid */}
          <Line points={[new THREE.Vector3(-r, 0, 0), new THREE.Vector3(0, h, 0)]} color={edgeColor} lineWidth={1.5} />
          <Line points={[new THREE.Vector3(r, 0, 0), new THREE.Vector3(0, h, 0)]} color={edgeColor} lineWidth={1.5} />
          {/* 2D radius: solid right + dashed left (diameter of base) */}
          <Line points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]} color="#fbbf24" lineWidth={1.5} />
          <Line points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]} color="#fbbf24" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          <Html zIndexRange={[10, 0]} position={[r / 2, 0.18, 0]} center>
            <span style={{
              color: '#fbbf24',
              fontSize: '18px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.65)',
              padding: '1px 5px',
              borderRadius: '4px',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px #000',
            }}>
              r = {r} {unit}
            </span>
          </Html>
        </>
      )}
      {showFaces && (
        <>
          {/* base disk */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onObjectSelect('base', 'face') }}>
            <circleGeometry args={[r, 32]} />
            <meshStandardMaterial color={faceColor('base')} transparent opacity={faceOpacity('base')} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* lateral surface — FrontSide only; DoubleSide stacks front+back making it appear solid */}
          <mesh position={[0, h / 2, 0]} onClick={(e) => { e.stopPropagation(); onObjectSelect('lateral', 'face') }}>
            <coneGeometry args={[r, h, 32, 1, true]} />
            <meshStandardMaterial color={faceColor('lateral')} transparent opacity={faceOpacity('lateral')} side={THREE.FrontSide} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function SphereShape({
  model,
  selected,
  onObjectSelect,
  stepHighlightFaces = [],
  is2D = false,
  unit = 'cm',
}: {
  model: GeometryModel
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  stepHighlightFaces?: string[]
  is2D?: boolean
  unit?: string
}) {
  const accentColor = useContext(AccentColorContext)
  const r = model.spec.params.r ?? 1
  const isHighlighted = stepHighlightFaces.includes('sphere')
  const color = selected ? '#7dd3fc' : isHighlighted ? '#fbbf24' : accentColor ?? '#0ea5e9'
  const opacity = selected ? 0.5 : isHighlighted ? 0.65 : 0.25
  const edgeColor = accentColor ?? '#22d3ee'

  // Silhouette circle perpendicular to camera dir [0,0.5,1].
  // right=[1,0,0], up=[0,0.894,-0.447] → projects as true circle on screen.
  const silhouettePts = useMemo(() => Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    const c = Math.cos(a), s = Math.sin(a)
    return new THREE.Vector3(r * c, r * s * 0.8944, r * s * (-0.4472))
  }), [r])

  // Equator in XZ plane: front arc z>0 solid, back arc z<0 dashed
  const equatorFront = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))
  }), [r])

  const equatorBack = useMemo(() => Array.from({ length: 33 }, (_, i) => {
    const a = Math.PI + (i / 32) * Math.PI
    return new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))
  }), [r])

  return (
    <group>
      {is2D && (
        <>
          {/* Depth mask — writes depth so equator dashes render correctly */}
          <mesh renderOrder={-1}>
            <sphereGeometry args={[r, 32, 32]} />
            <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.FrontSide} />
          </mesh>
          {/* Silhouette: full solid circle */}
          <Line points={silhouettePts} color={edgeColor} lineWidth={1.5} />
          {/* Equator: front solid, back dashed */}
          <Line points={equatorFront} color={edgeColor} lineWidth={1.5} />
          <Line points={equatorBack} color={edgeColor} lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          {/* Radius line: solid right + dashed left */}
          <Line points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]} color="#fbbf24" lineWidth={1.5} />
          <Line points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]} color="#fbbf24" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.07} depthTest={false} />
          <Html zIndexRange={[10, 0]} position={[r / 2, 0.18, 0]} center>
            <span style={{
              color: '#fbbf24',
              fontSize: '18px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.65)',
              padding: '1px 5px',
              borderRadius: '4px',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px #000',
            }}>
              r = {r} {unit}
            </span>
          </Html>
        </>
      )}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onObjectSelect('sphere', 'face')
        }}
      >
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          wireframe={false}
        />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Flat circle / sector renderer (for 2D circle shapes)
// ---------------------------------------------------------------------------

function FlatCircleShape({
  model,
  selected,
  onObjectSelect,
}: {
  model: GeometryModel
  selected: boolean
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
}) {
  const r = model.spec.params.r ?? 3
  const isSector = model.spec.shape === 'sector'
  const angleDeg = model.spec.params.a2 ?? 90
  const thetaLength = (angleDeg * Math.PI) / 180

  const fillColor = selected ? '#7dd3fc' : '#0ea5e9'
  const fillOpacity = selected ? 0.5 : 0.25

  return (
    <group>
      {/* Filled face — rotated so it lies flat on XZ plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onObjectSelect('circle', 'face')
        }}
      >
        <circleGeometry args={isSector ? [r, 64, 0, thetaLength] : [r, 64]} />
        <meshStandardMaterial
          color={fillColor}
          transparent
          opacity={fillOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Outline ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.04, r + 0.04, 64, 1, isSector ? 0 : undefined, isSector ? thetaLength : undefined]} />
        <meshStandardMaterial color="#22d3ee" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Base face hatching — diagonal lines for 2D textbook style (Vietnamese)
// ---------------------------------------------------------------------------

function pointInPolygon(x: number, z: number, polygon: THREE.Vector3[]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i]!.x, zi = polygon[i]!.z
    const xj = polygon[j]!.x, zj = polygon[j]!.z
    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function BaseHatching({ positions }: { positions: THREE.Vector3[] }) {
  const geometry = useMemo(() => {
    if (positions.length < 3) return null
    const xs = positions.map(p => p.x)
    const zs = positions.map(p => p.z)
    const xmin = Math.min(...xs), xmax = Math.max(...xs)
    const zmin = Math.min(...zs), zmax = Math.max(...zs)
    const y = positions[0]!.y + 0.002  // slight offset above face to avoid z-fight
    const spacing = 0.28
    const pts: number[] = []

    // 45° diagonal lines: x + z = c
    for (let c = xmin + zmin - spacing; c <= xmax + zmax + spacing; c += spacing) {
      const xStart = Math.max(xmin, c - zmax)
      const xEnd = Math.min(xmax, c - zmin)
      if (xEnd - xStart < 0.01) continue
      const midX = (xStart + xEnd) / 2
      const midZ = c - midX
      if (!pointInPolygon(midX, midZ, positions)) continue
      pts.push(xStart, y, c - xStart, xEnd, y, c - xEnd)
    }

    if (!pts.length) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return geo
  }, [positions])

  useEffect(() => () => { geometry?.dispose() }, [geometry])

  if (!geometry) return null
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#94a3b8" opacity={0.45} transparent />
    </lineSegments>
  )
}

// ---------------------------------------------------------------------------
// Water fill 3D — renders fill level during experiment mode
// ---------------------------------------------------------------------------

// Shapes where water fills the shape itself (not poured into a separate container)
const FILL_SHAPES = new Set(['cylinder', 'cube', 'rectangular_prism', 'triangular_prism', 'sphere'])

function WaterFill3D({ model, waterLevel }: { model: GeometryModel; waterLevel: number }) {
  const wl = Math.max(0, Math.min(1, waterLevel))
  if (wl <= 0.005) return null

  const { spec } = model
  const shape = spec.shape

  // Cone/pyramid experiments pour INTO a separate container — skip 3D fill for those
  if (!FILL_SHAPES.has(shape)) return null
  const r = spec.params.r ?? 1
  const h = spec.params.h ?? 1
  const waterColor = '#60a5fa'
  const mat = { color: waterColor, opacity: 0.55, transparent: true, depthWrite: false, side: THREE.DoubleSide }

  // Clip plane keeps everything with y <= waterY (normal points down, constant = waterY)
  const makeClip = (waterY: number) => [new THREE.Plane(new THREE.Vector3(0, -1, 0), waterY)]

  if (shape === 'cylinder') {
    // mesh group at y=h/2, lateral centered there → world y ∈ [0, h]
    const clipPlanes = makeClip(wl * h)
    return (
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 32, 1, false]} />
        <meshStandardMaterial {...mat} clippingPlanes={clipPlanes} clipShadows={false} />
      </mesh>
    )
  }

  if (shape === 'cone') {
    // base disk at y=0, apex at y=h (lateral mesh at position [0, h/2, 0])
    const clipPlanes = makeClip(wl * h)
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r, 32]} />
          <meshStandardMaterial {...mat} clippingPlanes={clipPlanes} clipShadows={false} />
        </mesh>
        <mesh position={[0, h / 2, 0]}>
          <coneGeometry args={[r, h, 32, 1, false]} />
          <meshStandardMaterial {...mat} clippingPlanes={clipPlanes} clipShadows={false} />
        </mesh>
      </group>
    )
  }

  if (shape === 'sphere') {
    // centered at origin: y ∈ [-r, r]
    const clipPlanes = makeClip(-r + wl * 2 * r)
    return (
      <mesh>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial {...mat} clippingPlanes={clipPlanes} clipShadows={false} />
      </mesh>
    )
  }

  // Polyhedral shapes — full bounding box with clip plane at water level
  // (clip plane gives a clean horizontal water surface)
  const verts = Object.values(model.vertices)
  if (!verts.length) return null
  const ys = verts.map(v => v.position.y)
  const xs = verts.map(v => v.position.x)
  const zs = verts.map(v => v.position.z)
  const yMin = Math.min(...ys); const yMax = Math.max(...ys)
  const xMin = Math.min(...xs); const xMax = Math.max(...xs)
  const zMin = Math.min(...zs); const zMax = Math.max(...zs)
  const totalH = yMax - yMin
  if (totalH < 0.005) return null
  const clipPlanes = makeClip(yMin + wl * totalH)
  return (
    <mesh position={[(xMin + xMax) / 2, yMin + totalH / 2, (zMin + zMax) / 2]}>
      <boxGeometry args={[(xMax - xMin) * 0.97, totalH, (zMax - zMin) * 0.97]} />
      <meshStandardMaterial {...mat} clippingPlanes={clipPlanes} clipShadows={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GeometryMesh({
  model,
  selectedObjectId,
  onObjectSelect,
  unfoldProgress,
  unfoldMode = 'closed',
  stepHighlight,
  stepVisibility,
  waterLevel = 0,
  showLabels = true,
  showFaces = true,
  hiddenEdges = false,
  is2D = false,
  measurementMode = 'none',
  measurementPoints = [],
  givenParams,
  params,
  unit = 'cm',
  accentColor,
  edgeWidth = 1.5,
}: GeometryMeshProps) {
  const { vertices, edges, faces, specialPoints, spec } = model
  const effectiveParams: Record<string, number | undefined> = params ?? (spec.params as Record<string, number | undefined>)

  // [DEBUG] dimension-label diagnostics
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[DIM-DEBUG]', {
      shape: spec.shape,
      givenParams,
      paramsProp: params,
      specParams: spec.params,
      effectiveParams,
      edgesWithParamKey: edges.filter((e) => e.paramKey).map((e) => ({ id: e.id, paramKey: e.paramKey, length: e.length })),
      totalEdges: edges.length,
    })
  }

  const isFlat2DCircle = spec.shape === 'circle' || spec.shape === 'sector'

  const isCurved =
    spec.shape === 'cylinder' ||
    spec.shape === 'cone' ||
    spec.shape === 'sphere' ||
    spec.shape === 'hyperboloid' ||
    spec.shape === 'paraboloid'

  const isCuboid = spec.shape === 'cube' || spec.shape === 'rectangular_prism'
  const isUnfolding = isCuboid && (unfoldMode !== 'closed' || unfoldProgress > 0.001)
  const unfoldedAmount = easeInOutCubic(unfoldProgress)

  // Change the canvas cursor when in measurement mode so the user knows
  // click targets are being collected for distance / angle calculations.
  const setCursor = useCallback(
    (cursor: string) => {
      if (typeof document !== 'undefined') {
        const canvas = document.querySelector('canvas')
        if (canvas) canvas.style.cursor = cursor
      }
    },
    []
  )

  const handlePointerEnter = useCallback(() => {
    if (measurementMode === 'distance' || measurementMode === 'angle') {
      setCursor('crosshair')
    }
  }, [measurementMode, setCursor])

  const handlePointerLeave = useCallback(() => {
    if (measurementMode === 'distance' || measurementMode === 'angle') {
      setCursor('auto')
    }
  }, [measurementMode, setCursor])

  // Compute (possibly unfolded) vertex positions, including per-face stable arrays for FaceMesh
  const computedPositions = useMemo(() => {
    const result: Record<string, Record<string, THREE.Vector3>> = {}

    for (const face of faces) {
      result[face.id] = {}
      for (const vId of face.vertices) {
        const vertex = vertices[vId]
        if (!vertex) continue
        result[face.id]![vId] = isCuboid
          ? unfoldedVertexPosition(face, vertex, vertices, unfoldMode, unfoldProgress)
          : toV3(vertex.position)
      }
    }

    return result
  }, [faces, vertices, isCuboid, unfoldMode, unfoldProgress])

  // Stable per-face position arrays — computed once per computedPositions change,
  // not inline in map() which would create new references on every render.
  const facePositionArrays = useMemo(() => {
    const result: Record<string, THREE.Vector3[]> = {}
    for (const face of faces) {
      result[face.id] = face.vertices
        .map((vId) => computedPositions[face.id]?.[vId])
        .filter((p): p is THREE.Vector3 => p !== undefined)
    }
    return result
  }, [faces, computedPositions])

  // Flat vertex positions (for vertices not part of any face, use raw position)
  const flatVertexPositions = useMemo(() => {
    const result: Record<string, THREE.Vector3> = {}
    for (const [id, v] of Object.entries(vertices)) {
      // Use position from first face that contains this vertex, else raw
      let found = false
      for (const face of faces) {
        if (face.vertices.includes(id) && computedPositions[face.id]?.[id]) {
          result[id] = computedPositions[face.id]![id]!
          found = true
          break
        }
      }
      if (!found) {
        result[id] = new THREE.Vector3(
          THREE.MathUtils.lerp(v.position.x, v.position.x, unfoldProgress),
          THREE.MathUtils.lerp(v.position.y, 0, unfoldProgress),
          THREE.MathUtils.lerp(v.position.z, v.position.z, unfoldProgress)
        )
      }
    }
    return result
  }, [vertices, faces, computedPositions, unfoldProgress])

  const unfoldedVertexItems = useMemo(() => {
    if (!isUnfolding || !showLabels) return []

    const items: Array<{ key: string; vertexId: string; position: THREE.Vector3 }> = []
    const seen = new Set<string>()
    const coordKey = (value: number) => Math.round(value * 10000) / 10000

    for (const face of faces) {
      if (stepVisibility && !stepVisibility.faces.includes(face.id)) continue
      const isCap = face.type === 'base' || face.type === 'top'
      const faceOpacity = unfoldMode === 'strip' && isCap ? 1 - unfoldedAmount : 1
      if (faceOpacity <= 0.15) continue

      for (const vertexId of face.vertices) {
        if (stepVisibility && !stepVisibility.vertices.includes(vertexId)) continue
        const vertex = vertices[vertexId]
        const position = computedPositions[face.id]?.[vertexId]
        if (!vertex?.label || !position) continue

        const key = [
          vertexId,
          coordKey(position.x),
          coordKey(position.y),
          coordKey(position.z),
        ].join(':')
        if (seen.has(key)) continue
        seen.add(key)
        items.push({ key, vertexId, position })
      }
    }

    return items
  }, [
    isUnfolding,
    showLabels,
    faces,
    stepVisibility,
    unfoldMode,
    unfoldedAmount,
    vertices,
    computedPositions,
  ])

  // Adaptive node radius — scales with bounding box so nodes look right at any shape size.
  const nodeRadius = useMemo(() => {
    const verts = Object.values(vertices)
    if (verts.length === 0) return 0.08
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (const v of verts) {
      minX = Math.min(minX, v.position.x); maxX = Math.max(maxX, v.position.x)
      minY = Math.min(minY, v.position.y); maxY = Math.max(maxY, v.position.y)
      minZ = Math.min(minZ, v.position.z); maxZ = Math.max(maxZ, v.position.z)
    }
    const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2)
    return Math.max(0.04, Math.min(0.10, diagonal * 0.025))
  }, [vertices])

  // Render flat circle / sector shapes
  if (isFlat2DCircle) {
    return (
      <group onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        <FlatCircleShape
          model={model}
          selected={selectedObjectId === 'circle'}
          onObjectSelect={onObjectSelect}
        />
        {/* Center vertex label */}
        {Object.entries(vertices).map(([id, v]) => (
          <group key={id}>
            <VertexSphere
              vertexId={id}
              position={toV3(v.position)}
              selected={selectedObjectId === id}
              onObjectSelect={onObjectSelect}
              isStepHighlight={stepHighlight?.vertices.includes(id) ?? false}
              isMeasureSelected={measurementPoints.includes(id)}
              radius={nodeRadius}
            />
            {showLabels && (
              <ObjectLabel id={id} position={v.position} selected={selectedObjectId === id} />
            )}
          </group>
        ))}
        {/* Sector radius edges with dimension labels */}
        {edges.map((edge) => {
          const fromV = vertices[edge.from]
          const toV_  = vertices[edge.to]
          if (!fromV || !toV_) return null
          const fromPos = toV3(fromV.position)
          const toPos = toV3(toV_.position)
          const showDim = edge.paramKey
            && (givenParams === undefined || givenParams.includes(edge.paramKey))
            && effectiveParams[edge.paramKey] !== undefined
          const mid = showDim ? new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5) : null
          return (
            <group key={edge.id}>
              <Line
                points={[fromPos, toPos]}
                color={accentColor ?? '#22d3ee'}
                lineWidth={edgeWidth}
              />
              {showDim && mid && (
                <Html zIndexRange={[10, 0]} position={[mid.x, mid.y + 0.3, mid.z]} center>
                  <span style={{
                    color: '#fbbf24',
                    fontSize: '18px',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px #000',
                  }}>
                    {edge.paramKey} = {effectiveParams[edge.paramKey!]} {unit}
                  </span>
                </Html>
              )}
            </group>
          )
        })}
        {/* Circle radius label (full circle — no radius edge) */}
        {edges.length === 0 && spec.params.r && (
          <Html zIndexRange={[10, 0]} position={[spec.params.r / 2, 0.3, 0]} center>
            <span style={{
              color: '#fbbf24',
              fontSize: '18px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.65)',
              padding: '1px 5px',
              borderRadius: '4px',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px #000',
            }}>
              r = {spec.params.r} {unit ?? 'cm'}
            </span>
          </Html>
        )}
      </group>
    )
  }

  // Render curved shapes differently
  if (isCurved) {
    return (
      // Provider must wrap this early-return branch too — sub-components read accentColor via context
      <AccentColorContext.Provider value={accentColor}>
      <group onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        {spec.shape === 'cylinder' && (
          <CylinderShape
            model={model}
            selected={selectedObjectId === 'cylinder'}
            onObjectSelect={onObjectSelect}
            stepHighlightFaces={stepHighlight?.faces ?? []}
            depthMask={is2D}
            showFaces={showFaces || is2D}
            unit={unit}
          />
        )}
        {spec.shape === 'cone' && (
          <ConeShape
            model={model}
            selected={selectedObjectId === 'cone'}
            onObjectSelect={onObjectSelect}
            stepHighlightFaces={stepHighlight?.faces ?? []}
            depthMask={is2D}
            showFaces={showFaces || is2D}
            unit={unit}
          />
        )}
        {spec.shape === 'sphere' && (showFaces || is2D) && (
          <SphereShape
            model={model}
            selected={selectedObjectId === 'sphere'}
            onObjectSelect={onObjectSelect}
            stepHighlightFaces={stepHighlight?.faces ?? []}
            is2D={is2D}
            unit={unit}
          />
        )}

        {/* Water fill — shows experiment fill level on top of the shape */}
        <WaterFill3D model={model} waterLevel={waterLevel} />

        {/* Vertices for curved shapes (apex, center, etc.) */}
        {Object.entries(vertices).map(([id, v]) => {
          if (stepVisibility && !stepVisibility.vertices.includes(id)) return null
          if (!v.label) return null // skip virtual reference vertices (e.g. radius anchor)
          return (
            <group key={id}>
              <VertexSphere
                vertexId={id}
                position={toV3(v.position)}
                selected={selectedObjectId === id}
                onObjectSelect={onObjectSelect}
                isStepHighlight={stepHighlight?.vertices.includes(id) ?? false}
                isMeasureSelected={measurementPoints.includes(id)}
                radius={nodeRadius}
              />
              {showLabels && (
                <ObjectLabel
                  id={id}
                  position={v.position}
                  selected={selectedObjectId === id}
                />
              )}
            </group>
          )
        })}

        {/* Edges */}
        {edges.map((edge) => {
          if (stepVisibility && !stepVisibility.edges.includes(edge.id)) return null
          const fromV = vertices[edge.from]
          const toV = vertices[edge.to]
          if (!fromV || !toV) return null
          const isSelected = selectedObjectId === edge.id
          const isEdgeStepHighlight = stepHighlight?.edges.includes(edge.id) ?? false
          const fromPos = toV3(fromV.position)
          const toPos = toV3(toV.position)
          const showDimension = edge.paramKey
            && (givenParams === undefined || givenParams.includes(edge.paramKey))
            && effectiveParams[edge.paramKey] !== undefined
          const midPos = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5)
          const isRadius = edge.type === 'radius'
          return (
            <group key={edge.id}>
              {isRadius ? (
                // Radius reference line: subtle dashed — hidden in 2D (replaced by explicit top-circle radius line)
                !is2D && <Line
                  points={[fromPos, toPos]}
                  color="#fbbf24"
                  lineWidth={1}
                  dashed
                  dashSize={0.12}
                  gapSize={0.08}
                />
              ) : (hiddenEdges || is2D) && !isSelected ? (
                <>
                  {/* Pass 1: dashed, depthTest off → renders behind faces too (nét khuất) */}
                  <Line
                    points={[fromPos, toPos]}
                    color={accentColor ?? '#22d3ee'}
                    lineWidth={edgeWidth}
                    dashed
                    dashSize={0.1}
                    gapSize={0.07}
                    depthTest={false}
                    renderOrder={0}
                  />
                  {/* Pass 2: solid, depthTest on → overwrites pass1 for visible portions */}
                  <Line
                    points={[fromPos, toPos]}
                    color={isEdgeStepHighlight ? '#fb923c' : accentColor ?? '#22d3ee'}
                    lineWidth={isEdgeStepHighlight ? edgeWidth * 2 : edgeWidth}
                    depthTest={true}
                    renderOrder={1}
                  />
                </>
              ) : (
                <Line
                  points={[fromPos, toPos]}
                  color={isSelected ? '#fb923c' : isEdgeStepHighlight ? '#fb923c' : accentColor ?? '#22d3ee'}
                  lineWidth={isSelected ? edgeWidth * 2 : isEdgeStepHighlight ? edgeWidth * 2 : edgeWidth}
                  depthTest={!is2D}
                />
              )}
              {showDimension && !(isRadius && is2D) && (
                <Html zIndexRange={[10, 0]} position={[midPos.x, midPos.y + 0.1, midPos.z]} center>
                  <span style={{
                    color: '#fbbf24',
                    fontSize: '18px',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px #000',
                  }}>
                    {edge.paramKey} = {effectiveParams[edge.paramKey!]} {unit}
                  </span>
                </Html>
              )}
            </group>
          )
        })}

        {/* Special points */}
        {specialPoints.map((sp) => {
          if (stepVisibility && !stepVisibility.vertices.includes(sp.id)) return null
          return (
            <group key={sp.id}>
              <VertexSphere
                vertexId={sp.id}
                position={toV3(sp.position)}
                selected={selectedObjectId === sp.id}
                onObjectSelect={onObjectSelect}
                isStepHighlight={stepHighlight?.vertices.includes(sp.id) ?? false}
                isMeasureSelected={measurementPoints.includes(sp.id)}
                radius={nodeRadius * 0.6}
              />
              {showLabels && (
                <ObjectLabel
                  id={sp.id}
                  position={sp.position}
                  selected={selectedObjectId === sp.id}
                />
              )}
            </group>
          )
        })}
      </group>
      </AccentColorContext.Provider>
    )
  }

  // ---------------------------------------------------------------------------
  // Polyhedral shapes
  // ---------------------------------------------------------------------------

  return (
    <AccentColorContext.Provider value={accentColor}>
    <group onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {/* Faces — render when visible OR when depth mask needed for hidden edges / 2D mode */}
      {(showFaces || hiddenEdges || is2D || isUnfolding) && faces.map((face) => {
        if (stepVisibility && !stepVisibility.faces.includes(face.id)) return null
        const facePositions = facePositionArrays[face.id] ?? []
        const isCap = face.type === 'base' || face.type === 'top'
        const faceOpacity = unfoldMode === 'strip' && isCap ? 1 - unfoldedAmount : 1
        return (
          <group key={face.id}>
            <FaceMesh
              faceId={face.id}
              positions={facePositions}
              selected={selectedObjectId === face.id}
              onObjectSelect={onObjectSelect}
              isStepHighlight={stepHighlight?.faces.includes(face.id) ?? false}
              depthMask={!isUnfolding && (hiddenEdges || is2D)}
              visibleFace={showFaces || isUnfolding}
              opacity={faceOpacity}
              showOutline={isUnfolding}
            />
            {!isUnfolding && is2D && face.type === 'base' && <BaseHatching positions={facePositions} />}
          </group>
        )
      })}

      {isUnfolding && unfoldedVertexItems.map(({ key, vertexId, position }) => {
        const labelPosition = { x: position.x, y: position.y, z: position.z }
        return (
          <group key={key}>
            <VertexSphere
              vertexId={vertexId}
              position={position}
              selected={selectedObjectId === vertexId}
              onObjectSelect={onObjectSelect}
              isStepHighlight={false}
              isMeasureSelected={measurementPoints.includes(vertexId)}
              radius={nodeRadius * 0.7}
            />
            <ObjectLabel
              id={vertexId}
              position={labelPosition}
              selected={selectedObjectId === vertexId}
            />
          </group>
        )
      })}

      {/* Water fill — experiment mode fill level */}
      {!isUnfolding && <WaterFill3D model={model} waterLevel={waterLevel} />}

      {/* Edges */}
      {!isUnfolding && edges.map((edge) => {
        if (stepVisibility && !stepVisibility.edges.includes(edge.id)) return null
        const fromPos = flatVertexPositions[edge.from]
        const toPos = flatVertexPositions[edge.to]
        if (!fromPos || !toPos) return null

        const isSelected = selectedObjectId === edge.id
        const isEdgeStepHighlight = stepHighlight?.edges.includes(edge.id) ?? false
        const isRadius = edge.type === 'radius' // internal reference (height/radius) — dashed, not selectable
        const showDimension = edge.paramKey
          && (givenParams === undefined || givenParams.includes(edge.paramKey))
          && effectiveParams[edge.paramKey] !== undefined
        const midPos = showDimension
          ? new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5)
          : null
        return (
          <group
            key={edge.id}
            onClick={isRadius ? undefined : (e) => {
              e.stopPropagation()
              onObjectSelect(edge.id, 'edge')
            }}
          >
            {!isRadius && (
              <Line
                points={[fromPos, toPos]}
                color="#ffffff"
                lineWidth={Math.max(10, edgeWidth * 6)}
                transparent
                opacity={0}
                depthTest={false}
                renderOrder={3}
              />
            )}
            {isRadius ? (
              <Line
                points={[fromPos, toPos]}
                color="#fbbf24"
                lineWidth={1}
                dashed
                dashSize={0.12}
                gapSize={0.08}
              />
            ) : (hiddenEdges || is2D) && !isSelected ? (
              <>
                {/* Pass 1: dashed, depthTest off → renders behind faces too (nét khuất) */}
                <Line
                  points={[fromPos, toPos]}
                  color={accentColor ?? '#22d3ee'}
                  lineWidth={edgeWidth}
                  dashed
                  dashSize={0.1}
                  gapSize={0.07}
                  depthTest={false}
                  renderOrder={0}
                />
                {/* Pass 2: solid, depthTest on → overwrites pass1 for visible portions */}
                <Line
                  points={[fromPos, toPos]}
                  color={isEdgeStepHighlight ? '#fb923c' : accentColor ?? '#22d3ee'}
                  lineWidth={isEdgeStepHighlight ? edgeWidth * 2 : edgeWidth}
                  depthTest={true}
                  renderOrder={1}
                />
              </>
            ) : (
              <Line
                points={[fromPos, toPos]}
                color={isSelected ? '#fb923c' : isEdgeStepHighlight ? '#fb923c' : accentColor ?? '#22d3ee'}
                lineWidth={isSelected ? edgeWidth * 2 : isEdgeStepHighlight ? edgeWidth * 2 : edgeWidth}
              />
            )}
            {showDimension && midPos && (
              <Html zIndexRange={[10, 0]} position={[midPos.x, midPos.y + 0.2, midPos.z]} center>
                <span style={{
                  color: '#fbbf24',
                  fontSize: '18px',
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 'bold',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 3px #000',
                }}>
                  {edge.paramKey} = {effectiveParams[edge.paramKey!]} {unit}
                </span>
              </Html>
            )}
          </group>
        )
      })}

      {/* Vertices */}
      {!isUnfolding && Object.entries(vertices).map(([id, v]) => {
        if (stepVisibility && !stepVisibility.vertices.includes(id)) return null
        if (!v.label) return null // skip virtual reference points (e.g. height foot O)
        const pos = flatVertexPositions[id] ?? toV3(v.position)
        const labelPos = { x: pos.x, y: pos.y, z: pos.z }
        return (
          <group key={id}>
            <VertexSphere
              vertexId={id}
              position={pos}
              selected={selectedObjectId === id}
              onObjectSelect={onObjectSelect}
              isStepHighlight={stepHighlight?.vertices.includes(id) ?? false}
              isMeasureSelected={measurementPoints.includes(id)}
              radius={nodeRadius}
            />
            {showLabels && (
              <ObjectLabel
                id={id}
                position={labelPos}
                selected={selectedObjectId === id}
              />
            )}
          </group>
        )
      })}

      {/* Special points */}
      {!isUnfolding && specialPoints.map((sp) => {
        if (stepVisibility && !stepVisibility.vertices.includes(sp.id)) return null
        const pos = toV3(sp.position)
        return (
          <group key={sp.id}>
            <mesh
              position={pos}
              onClick={(e) => {
                e.stopPropagation()
                onObjectSelect(sp.id, 'vertex')
              }}
            >
              <sphereGeometry args={[nodeRadius * 0.5, 16, 16]} />
              <meshStandardMaterial color="#a78bfa" roughness={0.3} metalness={0.4} />
            </mesh>
            {showLabels && (
              <ObjectLabel
                id={sp.id}
                position={sp.position}
                selected={selectedObjectId === sp.id}
              />
            )}
          </group>
        )
      })}
    </group>
    </AccentColorContext.Provider>
  )
}
