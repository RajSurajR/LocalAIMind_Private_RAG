import { LoaderCircle, Sparkles } from 'lucide-react'

export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 px-8 py-10 shadow-2xl shadow-slate-950/70 backdrop-blur-sm">
        <div className="flex items-center justify-center rounded-2xl bg-indigo-500/10 p-4 text-indigo-300">
          <Sparkles size={28} />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Local AI Mind</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Initializing your knowledge workspace</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <LoaderCircle className="animate-spin text-indigo-300" size={18} />
          Loading models and documents...
        </div>
      </div>
    </div>
  )
}
