'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AuthRolePanel, type LearningUser } from './AuthRolePanel'

export function LearningAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LearningUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { user: null })
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    function onAuthChange(event: Event) {
      setUser((event as CustomEvent<LearningUser | null>).detail ?? null)
    }

    window.addEventListener('learning-auth-change', onAuthChange)
    return () => window.removeEventListener('learning-auth-change', onAuthChange)
  }, [])

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950 text-slate-400">
        Đang kiểm tra đăng nhập...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl text-cyan-300">
              ▲
            </div>
            <h1 className="text-lg font-bold">Toán Học Thông Minh</h1>
            <p className="mt-1 text-sm text-slate-400">
              Vui lòng đăng nhập để bắt đầu học.
            </p>
          </div>
          <AuthRolePanel user={null} onUserChange={setUser} />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
