'use client'

interface ViewerToolbarProps {
  onResetCamera: () => void
  containerId: string
  is2D?: boolean
  onToggle2D?: () => void
}

function IconFullscreen() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function IconReset() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function IconZoomIn() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
      <line x1={11} y1={8} x2={11} y2={14} />
      <line x1={8} y1={11} x2={14} y2={11} />
    </svg>
  )
}

function IconZoomOut() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
      <line x1={8} y1={11} x2={14} y2={11} />
    </svg>
  )
}

const btnBase =
  'flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors backdrop-blur-sm'

export function ViewerToolbar({ onResetCamera, containerId, is2D = false, onToggle2D }: ViewerToolbarProps) {
  function handleFullscreen() {
    const el = document.getElementById(containerId)
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen()
    }
  }

  function handleZoomIn() {
    // Fire a wheel event on the canvas to trigger OrbitControls zoom
    const el = document.getElementById(containerId)
    const canvas = el?.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: cx,
        clientY: cy,
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })
    )
  }

  function handleZoomOut() {
    const el = document.getElementById(containerId)
    const canvas = el?.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: cx,
        clientY: cy,
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })
    )
  }

  return (
    <div data-screenshot-ignore className="absolute top-20 right-3 flex flex-col gap-1 sm:gap-1.5 z-10">
      {onToggle2D && (
        <button
          type="button"
          className={`${btnBase} ${is2D ? 'bg-sky-600/80 border-sky-500/60 text-white' : ''} text-xs font-bold`}
          onClick={onToggle2D}
          title={is2D ? 'Chuyển sang 3D' : 'Chuyển sang 2D (chiếu xiên)'}
          aria-label={is2D ? 'Switch to 3D view' : 'Switch to 2D orthographic view'}
        >
          {is2D ? '3D' : '2D'}
        </button>
      )}
      <button
        type="button"
        className={btnBase}
        onClick={handleFullscreen}
        title="Fullscreen"
        aria-label="Toggle fullscreen"
      >
        <IconFullscreen />
      </button>
      <button
        type="button"
        className={btnBase}
        onClick={onResetCamera}
        title="Reset camera"
        aria-label="Reset camera"
      >
        <IconReset />
      </button>
      <button
        type="button"
        className={btnBase}
        onClick={handleZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <IconZoomIn />
      </button>
      <button
        type="button"
        className={btnBase}
        onClick={handleZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <IconZoomOut />
      </button>
    </div>
  )
}
