'use client'

import { useEffect, useState } from 'react'
import { AuthRolePanel, type LearningUser } from '@/components/geo-ai/auth/AuthRolePanel'

export function GeoAIHeader() {
  const [user, setUser] = useState<LearningUser | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { user: null })
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))

    function onAuthChange(event: Event) {
      setUser((event as CustomEvent<LearningUser | null>).detail ?? null)
    }
    window.addEventListener('learning-auth-change', onAuthChange)
    return () => window.removeEventListener('learning-auth-change', onAuthChange)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
      <a
        href="/"
        className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <div className="text-cyan-400 text-xl leading-none">▲</div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-white leading-tight">
            Toán Học Thông Minh
          </span>
          <span className="text-xs text-slate-500 leading-tight">Hình học 3D tương tác</span>
        </div>
      </a>
      <nav className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md bg-cyan-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {user ? (user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : 'Student') : 'Đăng Nhập'}
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
            <AuthRolePanel
              user={user}
              onUserChange={(nextUser) => {
                setUser(nextUser)
                if (nextUser) setOpen(false)
              }}
            />
          </div>
        )}
      </nav>
    </header>
  )
}
