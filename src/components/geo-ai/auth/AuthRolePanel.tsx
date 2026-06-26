'use client'

import { useState } from 'react'

export type LearningUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'student'
}

export function notifyLearningAuthChange(user: LearningUser | null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('learning-auth-change', { detail: user }))
  }
}

export function AuthRolePanel({
  user,
  onUserChange,
}: {
  user: LearningUser | null
  onUserChange: (user: LearningUser | null) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState<'student' | 'teacher'>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function changeUser(nextUser: LearningUser | null) {
    onUserChange(nextUser)
    notifyLearningAuthChange(nextUser)
  }

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Không đăng nhập được.')
      changeUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    changeUser(null)
    window.location.assign('/')
  }

  async function createUserFromAdmin() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: adminRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Không tạo được tài khoản.')
      setAdminName('')
      setAdminEmail('')
      setAdminPassword('')
      setError(`Đã tạo ${data.user.role === 'teacher' ? 'Teacher' : 'Student'}: ${data.user.email}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="rounded-xl border border-emerald-700/35 bg-emerald-950/20 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-slate-400">
              {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'} · {user.email}
            </p>
          </div>
          <button type="button" onClick={logout} className="text-xs text-slate-400 hover:text-white">
            Đăng xuất
          </button>
        </div>
        {user.role === 'admin' && (
          <div className="mt-3 border-t border-emerald-700/25 pt-3">
            <p className="text-xs font-semibold text-emerald-100">Admin tạo tài khoản</p>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Họ tên" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Email" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} type="password" placeholder="Mật khẩu" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['student', 'teacher'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAdminRole(item)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${adminRole === item ? 'border-emerald-500 bg-emerald-950/50 text-emerald-100' : 'border-slate-700 text-slate-300'}`}
                >
                  {item === 'teacher' ? 'Teacher' : 'Student'}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-emerald-200">{error}</p>}
            <button type="button" disabled={loading} onClick={createUserFromAdmin} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60">
              Tạo tài khoản
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
        {(['login', 'register'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${mode === item ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {item === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        ))}
      </div>
      {mode === 'register' && (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ tên" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </>
      )}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === 'login' ? 'Email hoặc tài khoản admin' : 'Email'} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
      </button>
    </div>
  )
}
