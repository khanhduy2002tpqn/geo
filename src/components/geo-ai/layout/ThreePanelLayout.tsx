'use client'

import { useState, type ReactNode } from 'react'

interface ThreePanelLayoutProps {
  header: ReactNode
  left?: ReactNode
  center: ReactNode
  right?: ReactNode
}

export function ThreePanelLayout({
  header,
  left,
  center,
  right,
}: ThreePanelLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        {header}
      </div>

      {/* Mobile left-panel toggle — only when a left panel exists */}
      {left ? (
        <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950 px-3 md:hidden">
          <button
            type="button"
            onClick={() => setLeftOpen((prev) => !prev)}
            aria-expanded={leftOpen}
            aria-label="Mở/đóng bảng nhập liệu"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg
              className={`h-4 w-4 transition-transform ${leftOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 14.75z"
                clipRule="evenodd"
              />
            </svg>
            Bảng điều khiển
          </button>
        </div>
      ) : null}

      {/* Main area */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Left panel — only when provided */}
        {left ? (
          <aside
            aria-label="Bảng điều khiển"
            className={[
              'flex-shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950',
              'w-80',
              // Mobile: absolute overlay that slides in
              'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:shadow-2xl max-md:transition-transform max-md:duration-200',
              leftOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
            ].join(' ')}
          >
            {left}
          </aside>
        ) : null}

        {/* Mobile overlay backdrop */}
        {left && leftOpen && (
          <div
            className="absolute inset-0 z-10 bg-black/50 md:hidden"
            aria-hidden="true"
            onClick={() => setLeftOpen(false)}
          />
        )}

        {/* Center — 3D canvas area */}
        <section className="relative flex-1 overflow-hidden" aria-label="Vùng 3D">
          {center}
        </section>

        {/* Right panel — only when provided, hidden on mobile */}
        {right ? (
          <aside
            aria-label="Thông tin chi tiết"
            className="hidden w-64 flex-shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950 md:block"
          >
            {right}
          </aside>
        ) : null}
      </main>
    </div>
  )
}
