'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Scene3DHandle } from './viewer/Scene3D'
import { useGeoAICache } from '@/hooks/geo-ai/useGeoAICache'
import { useVoiceTutor } from '@/hooks/geo-ai/useVoiceTutor'
import { useConstructionSteps } from '@/hooks/geo-ai/useConstructionSteps'
import { useVirtualExperiment } from '@/hooks/geo-ai/useVirtualExperiment'
import { useDisplaySettings } from '@/hooks/geo-ai/useDisplaySettings'
import { useMeasurementTool } from '@/hooks/geo-ai/useMeasurementTool'
import { useKeyboardShortcuts } from '@/hooks/geo-ai/useKeyboardShortcuts'
import { CYLINDER_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/cylinderVolume'
import { CONE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/coneVolume'
import { SPHERE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/sphereVolume'
import { CUBE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/cubeVolume'
import { RECTANGULAR_PRISM_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/rectangularPrismVolume'
import { TRIANGULAR_PRISM_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/triangularPrismVolume'
import { PYRAMID_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/pyramidVolume'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine'
import { getShape } from '@/lib/geo-ai/data'
import type { ExampleDef } from '@/lib/geo-ai/data/types'
import { useShapeData, useExamples } from '@/hooks/geo-ai/useShapeData'
import { useShowcaseShapes } from '@/hooks/geo-ai/useShowcaseShapes'
import { usePathParam } from '@/hooks/usePathParam'
import { GeoAIHeader } from './layout/GeoAIHeader'
import { ThreePanelLayout } from './layout/ThreePanelLayout'
import { ExampleLibraryPanel } from './layout/ExampleLibraryPanel'
import ConstructionSteps from './construction/ConstructionSteps'
import StepNavigator from './construction/StepNavigator'
import VoiceTutorOverlay from './voice/VoiceTutorOverlay'
import { FloatingChat } from './FloatingChat'
import { ViewerTopToolbar } from './viewer/ViewerTopToolbar'
import FormulaDiscovery from './educational/FormulaDiscovery'
import VirtualExperiment from './educational/VirtualExperiment'
import { DisplaySettingsPanel } from '@/components/geo-ai/viewer/DisplaySettings'
import { GeometryInfoPanel } from '@/components/geo-ai/viewer/GeometryInfoPanel'
import { MeasurementPanel } from '@/components/geo-ai/viewer/MeasurementPanel'
import type { GeometryModel, GeometrySpec, StepVisibility } from '@/types/geo-ai'
import type { VirtualExperiment as VirtualExperimentType } from '@/types/geo-ai'

const Scene3D = dynamic(
  () => import('./viewer/Scene3D').then((m) => ({ default: m.Scene3D })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-slate-500">
        Đang tải 3D...
      </div>
    ),
  },
)

type Mode = 'explore' | 'construct' | 'experiment' | 'qa' | 'info' | 'measure'

// Max time to hold the deep-link loading state while waiting for the
// examples catalog before falling back to the homepage.
const DEEP_LINK_TIMEOUT_MS = 10_000

const MODE_LABELS: Record<Mode, string> = {
  explore: 'Tổng quan',
  construct: 'Xây dựng',
  experiment: 'Ảo nghiệm',
  qa: 'Hỏi đáp',
  info: 'Thông tin',
  measure: 'Đo lường',
}

function buildObjectExplanation(
  id: string,
  type: 'vertex' | 'edge' | 'face',
  model: GeometryModel | null,
): string {
  if (!model) return ''

  // Use pre-generated descriptions from shapes-data when available
  const shapeDesc = getShape(model.spec.shape)
  const objDesc = shapeDesc?.objectDescriptions

  if (type === 'vertex') {
    const rich = objDesc?.vertices?.[id]
    return rich ?? `Đây là đỉnh ${id}.`
  }
  if (type === 'edge') {
    const rich = objDesc?.edges?.[id]
    if (rich) return rich
    const edge = model.edges.find((e) => e.id === id)
    return edge ? `Đây là cạnh ${edge.from}${edge.to}.` : `Đây là cạnh ${id}.`
  }
  if (type === 'face') {
    const rich = objDesc?.faces?.[id]
    return rich ?? `Đây là mặt ${id}.`
  }
  return id
}

function getExperiment(shape: string | undefined): VirtualExperimentType | null {
  if (shape === 'cylinder') return CYLINDER_VOLUME_EXPERIMENT
  if (shape === 'cone') return CONE_VOLUME_EXPERIMENT
  if (shape === 'sphere') return SPHERE_VOLUME_EXPERIMENT
  if (shape === 'cube') return CUBE_VOLUME_EXPERIMENT
  if (shape === 'rectangular_prism') return RECTANGULAR_PRISM_VOLUME_EXPERIMENT
  if (shape === 'triangular_prism') return TRIANGULAR_PRISM_VOLUME_EXPERIMENT
  if (
    shape === 'square_pyramid' ||
    shape === 'triangular_pyramid' ||
    shape === 'tetrahedron' ||
    shape === 'general_pyramid'
  ) return PYRAMID_VOLUME_EXPERIMENT
  return null
}

export function GeoAIStudio() {
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [selectedObjectType, setSelectedObjectType] = useState<
    'vertex' | 'edge' | 'face' | null
  >(null)
  const [mode, setMode] = useState<Mode>('explore')
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right')
  const [animKey, setAnimKey] = useState(0)
  const [unfoldProgress, setUnfoldProgress] = useState(0)
  const [isStepPlaying, setIsStepPlaying] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [activeExample, setActiveExample] = useState<ExampleDef | null>(null)
  const [is2D, setIs2D] = useState(false)
  const [exampleParam, setExampleParam] = usePathParam()
  // Deep link (?example=…): examples load async from Turso, so on a cold load
  // the homepage (library + showcase) would flash before the example restores.
  // Suppress it until the restore effect below resolves the param.
  const [isDeepLinkPending, setIsDeepLinkPending] = useState(() => Boolean(exampleParam))
  const examples = useExamples()
  const showcaseItems = useShowcaseShapes()

  const { model, loading: isResolving, resolve, setModel } = useGeoAICache()
  // Refresh the active shape's data from Turso (hydrates the sync registry so
  // getShape(...) below returns Turso values; re-renders on arrival).
  useShapeData(model?.spec.shape)
  const { speak, stop, isSpeaking, currentText } = useVoiceTutor()
  const { steps, currentStep, prev, next, reset } = useConstructionSteps(model)
  const { settings, toggle: toggleSetting, update: updateSetting } = useDisplaySettings()
  const measurement = useMeasurementTool()
  const scene3dRef = useRef<Scene3DHandle>(null)
  const pre2DSnapshot = useRef<{ showFaces: boolean; hiddenEdges: boolean; showAxes: boolean } | null>(null)

  const handlePrev = useCallback(() => { setShowAllSteps(false); prev() }, [prev])
  const handleNext = useCallback(() => { setShowAllSteps(false); next() }, [next])

  const handleToggle2D = useCallback(() => {
    const next2D = !is2D
    setIs2D(next2D)
    if (next2D) {
      // Save snapshot then apply 2D presets
      pre2DSnapshot.current = {
        showFaces: settings.showFaces,
        hiddenEdges: settings.hiddenEdges,
        showAxes: settings.showAxes,
      }
      if (settings.showFaces) toggleSetting('showFaces')     // hide faces
      if (!settings.hiddenEdges) toggleSetting('hiddenEdges') // show hidden edges dashed
      if (!settings.showAxes) toggleSetting('showAxes')       // show axes
      // Fit after OrthographicCamera mounts
      setTimeout(() => { if (model) scene3dRef.current?.fitToModel(model) }, 80)
    } else {
      // Restore snapshot
      const snap = pre2DSnapshot.current
      if (snap) {
        if (settings.showFaces !== snap.showFaces) toggleSetting('showFaces')
        if (settings.hiddenEdges !== snap.hiddenEdges) toggleSetting('hiddenEdges')
        if (settings.showAxes !== snap.showAxes) toggleSetting('showAxes')
        pre2DSnapshot.current = null
      }
      setTimeout(() => { if (model) scene3dRef.current?.resetToDefaultView(model) }, 50)
    }
  }, [is2D, settings.showFaces, settings.hiddenEdges, settings.showAxes, toggleSetting, model])

  useKeyboardShortcuts({
    onPrevStep: handlePrev,
    onNextStep: handleNext,
    onResetCamera: () => scene3dRef.current?.resetCamera(),
    onDistanceTool: measurement.activateDistance,
    onAngleTool: measurement.activateAngle,
  })

  const currentExperiment = getExperiment(model?.spec.shape)
  const { progress, isPlaying, currentFrame: experimentFrame, play, pause, reset: resetExperiment } = useVirtualExperiment(currentExperiment)

  const stepHighlight = useMemo(() => {
    if (mode === 'experiment' && experimentFrame) {
      return {
        vertices: experimentFrame.highlightVertices ?? [],
        edges: experimentFrame.highlightEdges ?? [],
        faces: experimentFrame.highlightFaces ?? [],
      }
    }
    const step = steps[currentStep]
    if (!step) return undefined
    return {
      vertices: step.highlightVertices ?? [],
      edges: step.highlightEdges ?? [],
      faces: step.highlightFaces ?? [],
    }
  }, [steps, currentStep, mode, experimentFrame])

  const stepVisibility = useMemo<StepVisibility | undefined>(() => {
    if (mode === 'experiment' && experimentFrame) {
      if (!experimentFrame.visibleVertices && !experimentFrame.visibleEdges && !experimentFrame.visibleFaces) return undefined
      return {
        vertices: experimentFrame.visibleVertices ?? [],
        edges: experimentFrame.visibleEdges ?? [],
        faces: experimentFrame.visibleFaces ?? [],
      }
    }
    // Only filter geometry when user is actively navigating construction steps
    if (mode !== 'construct') return undefined
    if (showAllSteps || !model) return undefined
    const step = steps[currentStep]
    if (!step) return undefined
    if (!step.visibleVertices && !step.visibleEdges && !step.visibleFaces) return undefined
    return {
      vertices: step.visibleVertices ?? [],
      edges: step.visibleEdges ?? [],
      faces: step.visibleFaces ?? [],
    }
  }, [steps, currentStep, showAllSteps, model, mode, experimentFrame])

  // Auto-play: speak narration when step starts (or auto-play begins)
  useEffect(() => {
    if (!isStepPlaying) return
    const narration = steps[currentStep]?.narration
    if (!narration) return
    speak(narration)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStepPlaying, currentStep])

  // Auto-play: advance step only after TTS finishes + 1s pause
  useEffect(() => {
    if (!isStepPlaying) return
    if (isSpeaking) return  // wait until narration done
    if (currentStep >= steps.length - 1) {
      setIsStepPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setShowAllSteps(false)
      next()
    }, 1000)
    return () => clearTimeout(timer)
  }, [isStepPlaying, isSpeaking, currentStep, steps.length, next])

  // Speak measurement result when it changes
  const prevMeasureResult = useRef<number | null>(null)
  useEffect(() => {
    if (measurement.result === null || measurement.result === prevMeasureResult.current) return
    prevMeasureResult.current = measurement.result
    const { mode: mMode, points, result } = measurement
    if (mMode === 'distance' && points.length >= 2) {
      speak(`Khoảng cách ${points[0]}${points[1]} bằng ${result.toFixed(3)} đơn vị.`)
    } else if (mMode === 'angle' && points.length >= 3) {
      speak(`Góc ${points[0]}${points[1]}${points[2]} bằng ${result.toFixed(1)} độ.`)
    }
  }, [measurement.result, measurement.mode, measurement.points, speak])

  const handleAxisClick = useCallback((axis: 'X' | 'Y' | 'Z' | 'O') => {
    const messages: Record<'X' | 'Y' | 'Z' | 'O', string> = {
      X: 'Đây là trục X. Trục X chạy theo chiều ngang.',
      Y: 'Đây là trục Y. Trục Y chạy theo chiều dọc.',
      Z: 'Đây là trục Z. Trục Z chạy theo chiều sâu.',
      O: 'Đây là gốc tọa độ O. Ba trục X, Y, Z giao nhau tại điểm O tạo thành hệ trục tọa độ không gian OXYZ.',
    }
    speak(messages[axis])
  }, [speak])

  const handleObjectSelect = useCallback(
    (id: string, type: 'vertex' | 'edge' | 'face') => {
      // If measurement tool is active and it's a vertex, add to measurement points
      if (measurement.mode !== 'none' && type === 'vertex') {
        const pos = model?.vertices[id]?.position
        if (!pos) return

        // Add point and recompute when we have enough
        const newPoints = measurement.points.includes(id)
          ? measurement.points.filter((p) => p !== id)
          : [...measurement.points, id].slice(0, measurement.requiredPoints)

        measurement.selectPoint(id, pos)

        // Compute if we have enough points
        const allPoints = newPoints
          .map((pid) => model?.vertices[pid]?.position)
          .filter(Boolean) as Array<{ x: number; y: number; z: number }>
        if (allPoints.length === measurement.requiredPoints) {
          measurement.compute(allPoints)
        }
        return // Don't trigger voice in measurement mode
      }

      // Normal mode: voice explanation
      setSelectedObjectId(id)
      setSelectedObjectType(type)
      const explanation = buildObjectExplanation(id, type, model)
      speak(explanation)
    },
    [model, measurement, speak],
  )


  const handleClearExample = useCallback(() => {
    stop()
    reset()
    setModel(null)
    setActiveExample(null)
    setExampleParam(null)
    setMode('explore')
    setIsAutoRotating(false)
    // Always return to 3D mode so the showcase uses PerspectiveCamera
    if (is2D) {
      setIs2D(false)
      const snap = pre2DSnapshot.current
      if (snap) {
        if (settings.showFaces !== snap.showFaces) toggleSetting('showFaces')
        if (settings.hiddenEdges !== snap.hiddenEdges) toggleSetting('hiddenEdges')
        if (settings.showAxes !== snap.showAxes) toggleSetting('showAxes')
        pre2DSnapshot.current = null
      }
    }
  }, [stop, reset, setModel, setExampleParam, is2D, settings, toggleSetting])

  const handleExampleSelect = useCallback(
    (example: ExampleDef) => {
      stop()
      reset()
      updateSetting('showAxes', false)
      setActiveExample(example)
      setExampleParam(example.id)
      setMode('explore')
      setIsAutoRotating(false)

      // Direct build: if example has params, skip API and build instantly.
      // Don't require getShape() — on a cold deep-link load (?example=…) the
      // Turso shape registry may not be populated yet; example.shapeKey +
      // example.params alone are enough for the engine to build the model.
      if (example.params) {
        const shapeData = getShape(example.shapeKey)
        const baseSpec =
          shapeData?.fallbackSpec ??
          ({ shape: example.shapeKey, vertices: [], conditions: [] } as Partial<GeometrySpec>)
        try {
          const spec = { ...baseSpec, params: { ...example.params, unit: 'cm' } } as GeometrySpec
          const directModel = GeometryEngine.build(spec)
          setModel(directModel)
          return
        } catch {
          // fall through to API
        }
      }

      resolve(example.prompt)
    },
    [resolve, stop, reset, setModel, updateSetting, setExampleParam, setMode],
  )

  const handleShowcaseClick = useCallback((shapeKey: string) => {
    stop()
    reset()
    setActiveExample(null)
    updateSetting('showAxes', false)
    setMode('explore')
    setIsAutoRotating(false)

    const ex = examples.find((e) => e.shapeKey === shapeKey)
    if (ex) {
      setExampleParam(ex.id)
      if (ex.params) {
        const shapeData = getShape(ex.shapeKey)
        const baseSpec =
          shapeData?.fallbackSpec ??
          ({ shape: ex.shapeKey, vertices: [], conditions: [] } as Partial<GeometrySpec>)
        try {
          const spec = { ...baseSpec, params: { ...ex.params, unit: 'cm' } } as GeometrySpec
          setModel(GeometryEngine.build(spec))
          return
        } catch { /* fall through */ }
      }
      resolve(ex.prompt)
      return
    }

    const item = showcaseItems.find((i) => i.shapeKey === shapeKey)
    if (item) {
      // Pre-position camera BEFORE setModel so the first rendered frame
      // already shows the shape at the correct size (no flash/zoom effect).
      scene3dRef.current?.resetToDefaultView(item.model)
      setModel(item.model)
    }
  }, [examples, showcaseItems, stop, reset, setModel, setActiveExample, updateSetting, resolve, setExampleParam])

  // Restore selection from URL (?example=<id>) on first load / F5.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    if (activeExample) {
      restoredRef.current = true
      setIsDeepLinkPending(false)
      return
    }
    if (!exampleParam) {
      setIsDeepLinkPending(false)
      return
    }
    if (examples.length === 0) return
    // Examples loaded — resolve the param now, even if it matches nothing
    // (invalid id falls back to the homepage instead of loading forever).
    restoredRef.current = true
    const match = examples.find((e) => e.id === exampleParam)
    if (match) handleExampleSelect(match)
    setIsDeepLinkPending(false)
  }, [exampleParam, examples, activeExample, handleExampleSelect])

  // Safety net: if the examples catalog never loads (offline, Turso down),
  // give up on the deep link and show the homepage instead of a spinner.
  useEffect(() => {
    if (!isDeepLinkPending) return
    const timer = setTimeout(() => setIsDeepLinkPending(false), DEEP_LINK_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isDeepLinkPending])

  const handlePlaySteps = useCallback(() => {
    setMode('construct')
    setShowAllSteps(false)
    if (currentStep >= steps.length - 1) reset()
    setIsStepPlaying(true)
  }, [currentStep, steps.length, reset])

  const handlePauseSteps = useCallback(() => setIsStepPlaying(false), [])

  const handleRestartSteps = useCallback(() => {
    setMode('construct')
    setShowAllSteps(false)
    reset()
    setIsStepPlaying(true)
  }, [reset])

  const handleConstructMode = useCallback(() => {
    if (isStepPlaying) {
      setIsStepPlaying(false)
      return
    }
    setMode('construct')
    setShowAllSteps(false)
    reset()
    setIsStepPlaying(true)
  }, [isStepPlaying, reset])

  const TAB_ORDER: Mode[] = ['explore', 'construct', 'info', 'qa']

  function triggerSlide(dir: 'right' | 'left') {
    setSlideDir(dir)
    setAnimKey((k) => k + 1)
  }

  function handleTabClick(newMode: Mode) {
    const cur = TAB_ORDER.indexOf(mode)
    const next = TAB_ORDER.indexOf(newMode)
    triggerSlide(next >= cur ? 'right' : 'left')
    setMode(newMode)
  }

  function renderRightPanel() {
    const tabModes = (['explore', 'construct', 'info', 'qa'] as const)

    return (
      <div className="flex flex-col h-full">
        {/* Tab bar — hidden (no layout space) when no model */}
        <div
          className="flex-shrink-0 border-b border-slate-800"
          style={{ display: model ? undefined : 'none' }}
        >
          <div className="flex">
            {tabModes.map((m) => (
              <button
                key={m}
                type="button"
                disabled={!model}
                onClick={() => handleTabClick(m)}
                className={[
                  'flex-1 py-2.5 text-sm font-medium transition-colors disabled:cursor-default',
                  (mode === m || (mode === 'measure' && m === 'info'))
                    ? 'border-b-2 border-indigo-500 text-white'
                    : 'text-slate-500 hover:text-slate-200',
                ].join(' ')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb — hidden (no layout space) when no model */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800/60 bg-slate-950/40"
          style={{ display: model ? undefined : 'none' }}
        >
          <button
            type="button"
            onClick={handleClearExample}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0">
              <path fillRule="evenodd" d="M13.5 8a.5.5 0 0 1-.5.5H4.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708.708L4.707 7.5H13a.5.5 0 0 1 .5.5z" clipRule="evenodd" />
            </svg>
            Thư viện
          </button>
          {activeExample && (
            <>
              <span className="text-slate-700 text-xs">/</span>
              <span className="text-xs text-slate-400 truncate">{activeExample.shapeNameVi}</span>
            </>
          )}
        </div>

        {/* Main content — scrollable, with slide-in animation on tab change */}
        <div className="flex-1 min-h-0 overflow-hidden">
        <div key={animKey} className={`h-full overflow-y-auto ${slideDir === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}>
          {/* Deep-link restore in flight: hold a quiet loading state so the
              library doesn't flash before the example takes over */}
          {!model && isDeepLinkPending && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Đang tải...
            </div>
          )}
          {/* Library: no model → always show. Model + explore → show detail or library */}
          {!model && !isDeepLinkPending && (
            <ExampleLibraryPanel onSelectExample={handleExampleSelect} selectedId={activeExample?.id} isResolving={isResolving} />
          )}
          {model && mode === 'explore' && (
            <div className="flex flex-col">
              {activeExample && (
                <div className="p-4 pb-0">
                  <h3 className="text-base font-semibold text-white leading-snug mb-2">
                    {activeExample.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeExample.description}
                  </p>
                </div>
              )}
              <div className="p-3">
                <FormulaDiscovery shape={model?.spec.shape ?? null} />
              </div>
            </div>
          )}

          {mode === 'construct' && !model && null}
          {mode === 'construct' && model && (
            <div className="p-3 space-y-2">
              <ConstructionSteps steps={steps} currentStep={currentStep} />
              <StepNavigator
                total={steps.length}
                current={currentStep}
                onPrev={handlePrev}
                onNext={handleNext}
                onShowAll={() => setShowAllSteps(true)}
              />
              {steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isStepPlaying || isSpeaking) {
                      setIsStepPlaying(false)
                      stop()
                    } else {
                      stop()
                      setShowAllSteps(false)
                      reset()
                      // Delay so viewer renders bước 1 before narration starts
                      setTimeout(() => setIsStepPlaying(true), 200)
                    }
                  }}
                  className={[
                    'w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    isStepPlaying
                      ? 'bg-red-900/30 text-red-300 border border-red-700/40 hover:bg-red-900/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700',
                  ].join(' ')}
                >
                  <span>{isStepPlaying ? '⏹' : '🔊'}</span>
                  {isStepPlaying ? 'Dừng giảng' : 'Nghe giảng'}
                </button>
              )}
            </div>
          )}


          {mode === 'info' && <GeometryInfoPanel model={model} />}

          {/* Hỏi đáp — chưa có nội dung */}
          {mode === 'qa' && <div className="p-4" />}

          {mode === 'measure' && (
            <MeasurementPanel
              mode={measurement.mode}
              points={measurement.points}
              result={measurement.result}
              requiredPoints={measurement.requiredPoints}
              onActivateDistance={measurement.activateDistance}
              onActivateAngle={measurement.activateAngle}
              onDeactivate={measurement.deactivate}
              onClear={measurement.clearPoints}
            />
          )}
        </div>
        </div>

        {/* Display settings — fixed at bottom; hidden until a shape is loaded */}
        <div
          className="p-3 border-t border-slate-800"
          style={{ display: model ? undefined : 'none' }}
        >
          <DisplaySettingsPanel settings={settings} onToggle={toggleSetting} />
        </div>

      </div>
    )
  }

  // suppress unused variable warning — selectedObjectType used implicitly via setSelectedObjectType
  void selectedObjectType

  return (
    <>
      <ThreePanelLayout
        header={<GeoAIHeader />}
        left={renderRightPanel()}
        center={
          <div id="geo-ai-viewer" className="relative h-full">
            {model && (
              <ViewerTopToolbar
                containerId="geo-ai-viewer"
                shapeName={getShape(model.spec.shape)?.nameVi ?? model.spec.shape}
                measurementMode={measurement.mode}
                measurementPoints={measurement.points}
                measurementResult={measurement.result}
                requiredPoints={measurement.requiredPoints}
                onDistanceTool={() => { measurement.activateDistance(); setMode('measure') }}
                onAngleTool={() => { measurement.activateAngle(); setMode('measure') }}
                onDeactivateMeasure={measurement.deactivate}
                onClearMeasure={measurement.clearPoints}
                showFaces={settings.showFaces}
                showAxes={settings.showAxes}
                hiddenEdges={settings.hiddenEdges}
                onToggleFaces={() => toggleSetting('showFaces')}
                onToggleAxes={() => toggleSetting('showAxes')}
                onToggleHiddenEdges={() => toggleSetting('hiddenEdges')}
                onResetCamera={() => scene3dRef.current?.resetCamera()}
                isStepPlaying={isStepPlaying}
                onConstructMode={handleConstructMode}
                constructModeActive={mode === 'construct'}
                autoRotate={isAutoRotating}
                onToggleRotate={() => setIsAutoRotating((v) => !v)}
                disabled={false}
              />
            )}
            <Scene3D
              ref={scene3dRef}
              model={model}
              autoFit
              selectedObjectId={selectedObjectId}
              onObjectSelect={handleObjectSelect}
              unfoldProgress={unfoldProgress}
              stepHighlight={stepHighlight}
              stepVisibility={stepVisibility}
              waterLevel={mode === 'experiment' ? (experimentFrame?.waterLevel ?? 0) : 0}
              showAxes={settings.showAxes}
              showAxisTicks={settings.showAxisTicks}
              showGrid={settings.showGrid}
              showLabels={settings.showLabels}
              showFaces={settings.showFaces}
              hiddenEdges={settings.hiddenEdges}
              measurementMode={measurement.mode}
              measurementPoints={measurement.points}
              onAxisClick={handleAxisClick}
              autoRotate={isAutoRotating}
              givenParams={activeExample?.givenParams}
              params={activeExample?.params}
              unit={model?.spec?.params?.unit ?? 'cm'}
              is2D={is2D}
              onToggle2D={handleToggle2D}
              showcaseItems={!model && !isDeepLinkPending ? showcaseItems : undefined}
              onShowcaseClick={handleShowcaseClick}
            />
            {model && (
              <div data-screenshot-ignore className="absolute bottom-10 left-4 md:left-1/2 md:-translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="text-xs text-slate-300 whitespace-nowrap">Trải phẳng</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={unfoldProgress}
                  onChange={(e) => setUnfoldProgress(parseFloat(e.target.value))}
                  className="w-28 accent-indigo-400"
                  aria-label="Tiến độ trải phẳng hình"
                />
              </div>
            )}
          </div>
        }
      />
      <VoiceTutorOverlay
        text={currentText}
        isSpeaking={isSpeaking}
        onStop={stop}
      />
      <FloatingChat
        currentShape={model?.spec.shape ?? null}
        contextObject={selectedObjectId}
      />
    </>
  )
}
