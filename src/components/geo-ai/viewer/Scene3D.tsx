'use client'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'
import { useRef, useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import * as THREE from 'three'
import { GeometryMesh } from './GeometryMesh'
import { ShowcaseScene } from './ShowcaseScene'
import { AxisSystem } from './AxisSystem'
import { ViewerToolbar } from './ViewerToolbar'
import type { GeometryModel, UnfoldMode } from '@/types/geo-ai'
import type { ShowcaseItem } from '@/hooks/geo-ai/useShowcaseShapes'

export interface Scene3DHandle {
  resetCamera: () => void
  fitToModel: (model: GeometryModel) => void
  resetToDefaultView: (model: GeometryModel) => void
}

interface Scene3DProps {
  model: GeometryModel | null
  selectedObjectId: string | null
  onObjectSelect: (id: string, type: 'vertex' | 'edge' | 'face') => void
  unfoldProgress: number
  unfoldMode?: UnfoldMode
  containerId?: string
  stepHighlight?: { vertices: string[]; edges: string[]; faces: string[] }
  stepVisibility?: { vertices: string[]; edges: string[]; faces: string[] }
  showAxes?: boolean
  showAxisTicks?: boolean
  showGrid?: boolean
  showLabels?: boolean
  showFaces?: boolean
  hiddenEdges?: boolean
  measurementMode?: 'none' | 'distance' | 'angle'
  measurementPoints?: string[]
  onAxisClick?: (axis: 'X' | 'Y' | 'Z' | 'O') => void
  autoRotate?: boolean
  autoFit?: boolean
  waterLevel?: number
  givenParams?: string[]
  params?: Record<string, number>
  unit?: string
  formulaFaceLabels?: 'total' | 'lateral' | null
  volumeUnitCubeProgress?: number | null
  is2D?: boolean
  onToggle2D?: () => void
  showcaseItems?: ShowcaseItem[]
  onShowcaseClick?: (shapeKey: string) => void
}

const CONTAINER_ID = 'scene3d-container'

// Extract the imperative handle type from OrbitControls' forwarded ref
type OrbitControlsRef = NonNullable<React.ComponentRef<typeof OrbitControls>>

// Frame the whole model: fit its bounding sphere in a 50° fov with 1.8× padding,
// preserving the current orbit direction. Shared by the imperative handle and AutoFit.
function fitCameraToModel(controls: OrbitControlsRef, model: GeometryModel) {
  // Exclude helper vertices (e.g. radius anchor R) — they offset the bounding box
  // center, causing the camera to target a point displaced from the shape's axis.
  // Circular extent is already handled by circleRadius below.
  const allVerts = Object.values(model.vertices)
  const vertices = allVerts.filter(v => v.label) || allVerts
  if (!vertices.length) return

  const box = new THREE.Box3()
  for (const v of vertices) {
    box.expandByPoint(new THREE.Vector3(v.position.x, v.position.y, v.position.z))
  }

  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const flatExtent = Math.max(size.x, size.z)
  const circleRadius = model.spec?.params?.r ?? 0
  // Helper vertices (e.g. the radius anchor R at (r,0,0)) are excluded from the
  // center but DO mark the real extent — without this, a sphere whose spec is
  // missing params.r (e.g. built from a raw AI parse) frames as a tiny 0.5-unit
  // box and the camera ends up inside the ball.
  let helperExtent = 0
  for (const v of allVerts) {
    const d = new THREE.Vector3(v.position.x, v.position.y, v.position.z).distanceTo(center)
    helperExtent = Math.max(helperExtent, d * 2)
  }
  const maxDim = Math.max(size.x, size.y, size.z, flatExtent, circleRadius * 2, helperExtent, 0.5)

  const camera = controls.object
  const dir = camera.position.clone().sub(controls.target)
  if (dir.lengthSq() < 0.0001) dir.set(1, 1, 1)
  dir.normalize()

  // Spheres are solid balls whose silhouette spans the full diameter and are
  // semi-transparent — extra padding keeps the camera well outside so you don't
  // end up looking "into" the ball.
  const pad = model.spec.shape === 'sphere' ? 3.4 : 2.4

  if (camera instanceof THREE.PerspectiveCamera) {
    const fov = camera.fov * (Math.PI / 180)
    const distance = (maxDim / 2) / Math.tan(fov / 2) * pad
    camera.position.copy(center).addScaledVector(dir, distance)
  } else if (camera instanceof THREE.OrthographicCamera) {
    // Cylinder/cone: straight-on view (no X offset) so silhouette lines sit exactly
    // at x=±r. Polyhedra use cavalier oblique (-X shifts depth to lower-right).
    const isCylindrical = model.spec.shape === 'cylinder' || model.spec.shape === 'cone' || model.spec.shape === 'sphere'
    const obliqueDir = isCylindrical
      ? new THREE.Vector3(0, 0.5, 1).normalize()
      : new THREE.Vector3(-0.4, 0.5, 1).normalize()
    const viewHeight = camera.top - camera.bottom || 2
    camera.zoom = viewHeight / (maxDim * (pad * 0.75))
    camera.updateProjectionMatrix()
    camera.position.copy(center).addScaledVector(obliqueDir, 20)
  }

  controls.target.copy(center)
  controls.update()
}

// Auto-fit on model change from INSIDE the Canvas. OrbitControls may not have
// attached its ref yet on a cold page load (?example=… deep link) — the model
// arrives while the lazy-loaded Canvas/GL is still initializing. Retry each
// frame until the ref is ready (capped ~2s) instead of giving up after 2 frames,
// otherwise the camera silently stays at the too-close default position.
// Sets the perspective camera's initial position imperatively — keeps it out of JSX
// so R3F reconciler never resets the position after fitCameraToModel moves it.
function CameraInit() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(5, 4, 7)
    }
  }, [camera])
  return null
}

function applyDefaultView(ctrl: OrbitControlsRef, model: GeometryModel) {
  const cam = ctrl.object
  if (cam instanceof THREE.PerspectiveCamera && cam.fov !== 22) {
    cam.fov = 22
    cam.updateProjectionMatrix()
  }
  // Set canonical direction [5,4,7] directly — no ctrl.update() here because
  // update() would apply accumulated OrbitControls delta (autoRotate, damping)
  // and move the camera away from [5,4,7] before fitCameraToModel reads direction.
  ctrl.target.set(0, 0, 0)
  cam.position.set(5, 4, 7)
  fitCameraToModel(ctrl, model)
}

function AutoFit({
  model,
  orbitRef,
}: {
  model: GeometryModel | null
  orbitRef: React.RefObject<OrbitControlsRef | null>
}) {
  const pending = useRef<GeometryModel | null>(null)
  const frameCount = useRef(0)

  useLayoutEffect(() => {
    pending.current = model ?? null
    frameCount.current = 0
  }, [model])

  // Priority 1 = runs AFTER OrbitControls (priority 0), so our correction always
  // wins over accumulated damping/autoRotate delta OrbitControls applied this frame.
  // Run for 5 consecutive frames: OrbitControls damping (factor=0.05) can leave
  // residual sphericalDelta from prior camera state (e.g. showcase at [0,30,90]).
  // Each frame we re-apply the fit, overriding any drift. After 5 frames the
  // damping tail is negligible and OrbitControls spherical has fully converged
  // to the new position.
  useFrame(() => {
    if (!pending.current) return
    const ctrl = orbitRef.current
    if (!ctrl) return
    applyDefaultView(ctrl, pending.current)
    frameCount.current++
    if (frameCount.current >= 5) {
      pending.current = null
      frameCount.current = 0
    }
  }, 1)

  return null
}

// Position camera to see the full showcase grid with minimal perspective distortion.
// Camera nearly horizontal (y≈2, z=90) so vertical axis lines project straight up/down —
// both endpoints share the same cam_z, eliminating apparent axis tilt.
function ShowcaseAutoFit({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsRef | null> }) {
  useEffect(() => {
    let r1 = 0, r2 = 0
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const ctrl = orbitRef.current
        if (!ctrl) return
        const cam = ctrl.object
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        if (cam instanceof THREE.PerspectiveCamera) {
          cam.fov = isMobile ? 40 : 30
          cam.updateProjectionMatrix()
        }
        cam.position.set(0, isMobile ? 25 : 30, 90)
        ctrl.target.set(0, isMobile ? 0 : 4, 0)
        ctrl.update()
      })
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [orbitRef])
  return null
}

function UnfoldCamera({
  model,
  progress,
  orbitRef,
}: {
  model: GeometryModel | null
  progress: number
  orbitRef: React.RefObject<OrbitControlsRef | null>
}) {
  const lastApplied = useRef(progress)

  useEffect(() => {
    lastApplied.current = progress
  // Reset only when the selected model changes; progress changes are handled per frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  useFrame(() => {
    const ctrl = orbitRef.current
    if (!ctrl || !model || Math.abs(lastApplied.current - progress) < 0.0001) return
    if (model.spec.shape !== 'cube' && model.spec.shape !== 'rectangular_prism') return

    const points = Object.values(model.vertices).map(
      (vertex) => new THREE.Vector3(vertex.position.x, vertex.position.y, vertex.position.z),
    )
    if (points.length === 0) return

    const box = new THREE.Box3().setFromPoints(points)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z, 1)
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
    const closedPosition = new THREE.Vector3(
      center.x + maxSize * 2.8,
      center.y + maxSize * 2.2,
      center.z + maxSize * 2.8,
    )
    const openPosition = new THREE.Vector3(center.x, center.y, center.z + maxSize * 6)
    const camera = ctrl.object

    camera.position.copy(closedPosition.lerp(openPosition, eased))
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(22, 42, eased)
      camera.updateProjectionMatrix()
    }
    ctrl.target.copy(center)
    ctrl.update()
    lastApplied.current = progress
  }, 1)

  return null
}

export const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D({
  model,
  selectedObjectId,
  onObjectSelect,
  unfoldProgress,
  unfoldMode = 'closed',
  containerId = CONTAINER_ID,
  stepHighlight,
  stepVisibility,
  showAxes = true,
  showAxisTicks = false,
  showGrid = true,
  showLabels,
  showFaces,
  hiddenEdges,
  measurementMode,
  measurementPoints,
  onAxisClick,
  autoRotate = false,
  autoFit = false,
  waterLevel = 0,
  givenParams,
  params,
  unit,
  formulaFaceLabels,
  volumeUnitCubeProgress,
  is2D = false,
  onToggle2D,
  showcaseItems,
  onShowcaseClick,
}: Scene3DProps, ref: React.Ref<Scene3DHandle>) {
  const orbitRef = useRef<OrbitControlsRef>(null)

  const handleResetCamera = useCallback(() => {
    if (orbitRef.current && model) fitCameraToModel(orbitRef.current, model)
  }, [model])

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (orbitRef.current && model) fitCameraToModel(orbitRef.current, model)
    },
    fitToModel: (m: GeometryModel) => {
      if (orbitRef.current) fitCameraToModel(orbitRef.current, m)
    },
    resetToDefaultView: (m: GeometryModel) => {
      if (orbitRef.current) applyDefaultView(orbitRef.current, m)
    },
  }), [model])

  // Axis length = furthest shape extent + 25% headroom, min 3, so the axes
  // always reach BEYOND the geometry (arrows/labels never buried inside it).
  const axisLength = useMemo(() => {
    if (!model) return 3
    let max = 0
    for (const v of Object.values(model.vertices)) {
      max = Math.max(max, Math.abs(v.position.x), Math.abs(v.position.y), Math.abs(v.position.z))
    }
    // For circular shapes, vertices are at center — factor in the actual radius
    const r = model.spec.params.r ?? 0
    max = Math.max(max, r)
    return Math.max(3, max * 1.25)
  }, [model])

  // Grid size = 4× axis length, minimum 20, rounded to nearest 5
  const gridSize = Math.max(20, Math.ceil((axisLength * 4) / 5) * 5)

  return (
    <div id={containerId} className="relative w-full h-full">
      <Canvas
        style={{ background: '#0f172a', display: 'block', width: '100%', height: '100%' }}
        gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
      >
        {is2D ? (
          <OrthographicCamera makeDefault position={(model?.spec?.shape === 'cylinder' || model?.spec?.shape === 'cone' || model?.spec?.shape === 'sphere') ? [0, 5, 10] : [-4, 5, 10]} near={0.1} far={1000} zoom={80} />
        ) : (
          <PerspectiveCamera makeDefault fov={22} near={0.1} far={1000} />
        )}
        {!is2D && <CameraInit />}

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.3} />
        <hemisphereLight args={['#1e3a5f', '#0f172a', 0.3] as [string, string, number]} />

        {showGrid && (
          <Grid
            args={[gridSize, gridSize]}
            cellColor="#334155"
            sectionColor="#475569"
            fadeDistance={gridSize * 2}
            position={[0, -0.01, 0]}
          />
        )}

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate && !is2D}
          autoRotateSpeed={2}
          enableRotate={!is2D}
        />

        <UnfoldCamera model={model} progress={unfoldProgress} orbitRef={orbitRef} />

        {autoFit && <AutoFit model={model} orbitRef={orbitRef} />}

        <AxisSystem
          visible={showAxes && !!model && !is2D}
          showTicks={showAxisTicks}
          onAxisClick={onAxisClick ?? (() => {})}
          length={axisLength}
          unit={unit}
        />

        <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
          <GizmoViewport
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="white"
          />
        </GizmoHelper>

        {!model && showcaseItems && showcaseItems.length > 0 && (
          <>
            <ShowcaseAutoFit orbitRef={orbitRef} />
            <ShowcaseScene items={showcaseItems} onShapeClick={onShowcaseClick ?? (() => {})} />
          </>
        )}

        {model && (
          <GeometryMesh
            model={model}
            selectedObjectId={selectedObjectId}
            onObjectSelect={onObjectSelect}
            unfoldProgress={unfoldProgress}
            unfoldMode={unfoldMode}
            stepHighlight={stepHighlight}
            stepVisibility={stepVisibility}
            waterLevel={waterLevel}
            showLabels={showLabels ?? true}
            showFaces={showFaces ?? true}
            hiddenEdges={hiddenEdges ?? false}
            is2D={is2D}
            measurementMode={measurementMode ?? 'none'}
            measurementPoints={measurementPoints ?? []}
            givenParams={givenParams}
            params={params}
            unit={unit}
            formulaFaceLabels={formulaFaceLabels}
            volumeUnitCubeProgress={volumeUnitCubeProgress}
          />
        )}
      </Canvas>

      {model && <ViewerToolbar onResetCamera={handleResetCamera} containerId={containerId} is2D={is2D} onToggle2D={onToggle2D} />}
    </div>
  )
})
