import { LoaderCircle, SendHorizontal, Sparkles, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

export function ChatInput({
  models,
  selectedModel,
  onModelChange,
  onSendMessage,
  onUploadPdf,
  isSending,
  isUploading = false,
}) {
  const [draft, setDraft] = useState('')
  const fileInputRef = useRef(null)

  const handleSubmit = async () => {
    if (!draft.trim() || isSending) return

    const value = draft.trim()
    setDraft('')
    await onSendMessage(value)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    await onUploadPdf(file)
    event.target.value = ''
  }

  return (
    <div className="border-t border-slate-800 bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
        >
          <UploadCloud size={15} className="text-indigo-300" />
          {isUploading ? 'Uploading...' : 'Add PDF'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          <Sparkles size={14} className="text-indigo-300" />
          <select
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            className="bg-transparent text-sm text-slate-100 outline-none"
          >
            {models.map((model) => (
              <option key={model.name} value={model.name} className="bg-slate-900 text-slate-100">
                {model.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-end gap-3">
        <textarea
          value={draft}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your local PDFs..."
          className="min-h-13 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!draft.trim() || isSending}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          aria-label="Send message"
        >
          {isSending ? <LoaderCircle size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
        </button>
      </div>
    </div>
  )
}
