import { Check, CheckCircle, FileText, MessageSquareText, MoreHorizontal, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function Sidebar({
  sessions,
  currentSessionId,
  uploadedPdfs,
  attachedPdfIds = [],
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onToggleAttachPdf,
  onDeletePdf,
  brand = 'Local AI Mind',
}) {
  const [openMenuId, setOpenMenuId] = useState(null)

  return (
    <aside className="flex h-screen w-full max-w-85 flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-sm">
      <div className="border-b border-slate-800 py-5">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <MessageSquareText size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Workspace</p>
            <h2 className="text-base font-semibold text-slate-100">{brand}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="flex w-11/12  px-3 py-3 ml-4 items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sessions</p>
        </div>

        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-400">
              No chats yet.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId
              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 rounded-xl border p-2 transition ${
                    isActive
                      ? 'border-indigo-500/40 bg-slate-800/90 shadow-md shadow-slate-900/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                  >
                    <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-300">
                      <MessageSquareText size={15} />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-100">{session.title}</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === session.id ? null : session.id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === session.id && (
                      <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/70">
                        <button
                          type="button"
                          onClick={() => {
                            onRenameSession(session.id)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                        >
                          <PencilLine size={14} />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSession(session.id)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 transition hover:bg-slate-800"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Uploaded PDFs</p>
          </div>

          <div className="space-y-2">
            {uploadedPdfs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-400">
                No PDFs indexed yet.
              </div>
            ) : (
              uploadedPdfs.map((pdf) => {
                const isAttached = attachedPdfIds.includes(pdf.pdf_id)
                const menuKey = `pdf-${pdf.pdf_id}`

                return (
                  <div
                    key={pdf.pdf_id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                        <FileText size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100"  title={pdf.name}>{pdf.name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {pdf.page_count || 0} pages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleAttachPdf?.(pdf.pdf_id)}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                          isAttached
                            ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {isAttached ? <Check size={18}/> : <Plus size={18}/>}
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                          aria-label={`More actions for ${pdf.name}`}
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {openMenuId === menuKey && (
                          <div className="absolute right-0 z-30 mt-2 w-32 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/70">
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePdf(pdf.pdf_id)
                                setOpenMenuId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 transition hover:bg-slate-800"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
