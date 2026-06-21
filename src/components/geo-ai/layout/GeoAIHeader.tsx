'use client'

export function GeoAIHeader() {
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
      <nav>
        <button type="button" className="rounded-md bg-cyan-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
          Đăng Nhập
        </button>
      </nav>
    </header>
  )
}
