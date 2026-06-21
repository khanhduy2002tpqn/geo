'use client'

interface VoiceTutorOverlayProps {
  text: string | null
  isSpeaking: boolean
  onStop: () => void
}

export default function VoiceTutorOverlay({ text, isSpeaking, onStop }: VoiceTutorOverlayProps) {
  const visible = text !== null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'w-[min(92vw,560px)]',
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
    >
      <div
        className="rounded-2xl bg-slate-800/90 backdrop-blur-md shadow-2xl
                   border border-slate-700/60 px-4 py-3 flex items-center gap-3"
      >
        {/* Speaking animation dots */}
        <div className="flex-shrink-0 flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={[
                'block w-1.5 h-1.5 rounded-full bg-indigo-400',
                isSpeaking ? 'animate-bounce' : 'opacity-30',
              ].join(' ')}
              style={isSpeaking ? { animationDelay: `${i * 120}ms` } : {}}
            />
          ))}
        </div>

        {/* Text */}
        <p className="flex-1 text-sm text-slate-100 leading-relaxed">
          {text ?? ''}
        </p>

        {/* Stop button */}
        <button
          onClick={onStop}
          aria-label="Dừng giọng đọc"
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg
                     bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium
                     transition-colors duration-150"
        >
          <span className="text-[10px]">■</span>
          Dừng
        </button>
      </div>
    </div>
  )
}
