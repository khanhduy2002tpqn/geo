'use client'

import { toPng } from 'html-to-image'
import type { MeasurementMode } from '@/hooks/geo-ai/useMeasurementTool'

// ---------------------------------------------------------------------------
// SVG Icons (Heroicons / Feather style — 24×24 viewBox, stroke-based)
// ---------------------------------------------------------------------------

const ico = 'w-[18px] h-[18px]'
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function IcoRuler() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M3 17.25L17.25 3M6 14l4 4M9 11l2 2M12 8l2 2M3.75 20.25l16.5-16.5a1.06 1.06 0 0 1 1.5 1.5l-16.5 16.5a1.06 1.06 0 0 1-1.5-1.5z" />
    </svg>
  )
}

function IcoAngle() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M4 20L12 4L20 20" />
      <path d="M8.8 17.2a5 5 0 0 0 6.4 0" />
    </svg>
  )
}

function IcoFaces() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M12 3L20 8.5v11L12 21L4 15.5V8.5L12 3z" />
      <path d="M12 3v18M4 8.5l8 4 8-4" strokeOpacity={0.4} />
    </svg>
  )
}

function IcoAxes() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M12 20V4" stroke="#22c55e" />
      <path d="M4 12h16" stroke="#ef4444" />
      <path d="M6.5 17L17.5 7" stroke="#3b82f6" />
      <circle cx={12} cy={12} r={1.5} fill="currentColor" stroke="none" />
    </svg>
  )
}

function IcoPlay() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function IcoPause() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <rect x={6} y={4} width={4} height={16} rx={1} />
      <rect x={14} y={4} width={4} height={16} rx={1} />
    </svg>
  )
}

function IcoSkipBack() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <polygon points="19,20 9,12 19,4" />
      <line x1={5} y1={4} x2={5} y2={20} />
    </svg>
  )
}

function IcoRotate() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M22 2l-4 4 4 4" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  )
}

function IcoReset() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function IcoHiddenEdges() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M3 12h3M9 12h3M15 12h3M21 12h0" strokeDasharray="3 2" />
      <path d="M12 3L20 8.5v11L12 21L4 15.5V8.5L12 3z" />
    </svg>
  )
}

function IcoCamera() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx={12} cy={13} r={4} />
    </svg>
  )
}

function IcoFullscreen() {
  return (
    <svg viewBox="0 0 24 24" className={ico} {...stroke}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Button primitive
// ---------------------------------------------------------------------------

interface ToolBtnProps {
  label: string
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolBtn({ label, title, active, disabled, onClick, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={disabled ? 'Tạo mô hình trước' : title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-col items-center justify-center gap-[3px] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 min-w-[28px] sm:min-w-[38px]',
        disabled
          ? 'text-slate-600 cursor-not-allowed'
          : active
            ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50'
            : 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-100',
      ].join(' ')}
    >
      <span className="flex items-center justify-center">{children}</span>
      <span className="hidden sm:block leading-none tracking-tight whitespace-nowrap">{label}</span>
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 sm:h-7 bg-slate-700/70 mx-0 sm:mx-0.5 self-center flex-shrink-0" />
}

// ---------------------------------------------------------------------------
// Measurement badge
// ---------------------------------------------------------------------------

interface MeasurementBadgeProps {
  mode: MeasurementMode
  points: string[]
  result: number | null
  requiredPoints: number
  onClear: () => void
}

function MeasurementBadge({ mode, points, result, requiredPoints, onClear }: MeasurementBadgeProps) {
  if (mode === 'none') return null

  const remaining = requiredPoints - points.length
  const label =
    result !== null
      ? mode === 'distance'
        ? `${points[0]}${points[1]} = ${result.toFixed(3)} a`
        : `∠${points[0]}${points[1]}${points[2]} = ${result.toFixed(1)}°`
      : remaining > 0
        ? `Nhấp vào ${remaining} đỉnh nữa`
        : 'Đang tính…'

  return (
    <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-200 shadow-lg backdrop-blur">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
      <span className="text-cyan-300 font-mono font-semibold">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="text-slate-500 hover:text-slate-200 transition-colors ml-1"
      >
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
          <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------

export interface ViewerTopToolbarProps {
  containerId: string
  shapeName?: string
  measurementMode: MeasurementMode
  measurementPoints: string[]
  measurementResult: number | null
  requiredPoints: number
  onDistanceTool: () => void
  onAngleTool: () => void
  onDeactivateMeasure: () => void
  onClearMeasure: () => void
  showFaces: boolean
  showAxes: boolean
  hiddenEdges: boolean
  onToggleFaces: () => void
  onToggleAxes: () => void
  onToggleHiddenEdges: () => void
  onResetCamera: () => void
  isStepPlaying: boolean
  onConstructMode: () => void
  constructModeActive: boolean
  autoRotate: boolean
  onToggleRotate: () => void
  disabled?: boolean
}

export function ViewerTopToolbar({
  containerId,
  shapeName,
  measurementMode,
  measurementPoints,
  measurementResult,
  requiredPoints,
  onDistanceTool,
  onAngleTool,
  onDeactivateMeasure,
  onClearMeasure,
  showFaces,
  showAxes,
  hiddenEdges,
  onToggleFaces,
  onToggleAxes,
  onToggleHiddenEdges,
  onResetCamera,
  isStepPlaying,
  onConstructMode,
  constructModeActive,
  autoRotate,
  onToggleRotate,
  disabled = false,
}: ViewerTopToolbarProps) {
  function handleScreenshot() {
    const el = document.getElementById(containerId)
    if (!el) return
    const filter = (node: Node) =>
      !(node instanceof HTMLElement && 'screenshotIgnore' in node.dataset)
    void toPng(el, { cacheBust: true, filter }).then((url) => {
      const a = document.createElement('a')
      a.href = url
      a.download = `geometry-${Date.now()}.png`
      a.click()
    })
  }
  const isDistanceActive = measurementMode === 'distance'
  const isAngleActive = measurementMode === 'angle'

  return (
    <div data-screenshot-ignore className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 w-max max-w-[calc(100vw-1rem)]">
      <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-1 sm:px-2 py-1 sm:py-1.5 shadow-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Shape name label */}
        {shapeName && (
          <>
            <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-indigo-300 bg-indigo-600/20 rounded-lg border border-indigo-700/40 whitespace-nowrap select-none">
              {shapeName}
            </span>
            <Sep />
          </>
        )}

        {/* Measurement */}
        <ToolBtn
          label="Cạnh"
          title="Đo khoảng cách (D)"
          active={isDistanceActive}
          disabled={disabled}
          onClick={isDistanceActive ? onDeactivateMeasure : onDistanceTool}
        >
          <IcoRuler />
        </ToolBtn>
        <ToolBtn
          label="Góc"
          title="Đo góc (A)"
          active={isAngleActive}
          disabled={disabled}
          onClick={isAngleActive ? onDeactivateMeasure : onAngleTool}
        >
          <IcoAngle />
        </ToolBtn>

        <Sep />

        {/* Display */}
        <ToolBtn
          label="Mặt"
          title={showFaces ? 'Ẩn mặt phẳng' : 'Hiện mặt phẳng'}
          active={showFaces}
          disabled={disabled}
          onClick={onToggleFaces}
        >
          <IcoFaces />
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Trục"
          title={showAxes ? 'Ẩn trục tọa độ' : 'Hiện trục tọa độ'}
          active={showAxes}
          disabled={disabled}
          onClick={onToggleAxes}
        >
          <IcoAxes />
        </ToolBtn>
        <ToolBtn
          label="Cạnh ẩn"
          title={hiddenEdges ? 'Ẩn đường khuất' : 'Hiện đường khuất (nét đứt)'}
          active={hiddenEdges}
          disabled={disabled}
          onClick={onToggleHiddenEdges}
        >
          <IcoHiddenEdges />
        </ToolBtn>

        <Sep />

        {/* Construction playback */}
        <ToolBtn
          label={isStepPlaying ? 'Dừng' : 'Dựng hình'}
          title={isStepPlaying ? 'Dừng hoạt cảnh' : 'Dựng hình từng bước'}
          active={constructModeActive}
          disabled={disabled}
          onClick={onConstructMode}
        >
          {isStepPlaying ? <IcoPause /> : <IcoPlay />}
        </ToolBtn>
        <Sep />
        <ToolBtn
          label={autoRotate ? 'Dừng xoay' : 'Xoay 3D'}
          title={autoRotate ? 'Dừng tự động xoay' : 'Tự động xoay hình học'}
          active={autoRotate}
          disabled={disabled}
          onClick={onToggleRotate}
        >
          <IcoRotate />
        </ToolBtn>

        <Sep />

        {/* Camera */}
        <ToolBtn
          label="Reset"
          title="Đặt lại góc nhìn (R)"
          disabled={disabled}
          onClick={onResetCamera}
        >
          <IcoReset />
        </ToolBtn>
        <ToolBtn
          label="Chụp ảnh"
          title="Chụp ảnh màn hình (PNG)"
          disabled={disabled}
          onClick={handleScreenshot}
        >
          <IcoCamera />
        </ToolBtn>

      </div>

      <MeasurementBadge
        mode={measurementMode}
        points={measurementPoints}
        result={measurementResult}
        requiredPoints={requiredPoints}
        onClear={onClearMeasure}
      />
    </div>
  )
}
