import { Bot, BotMessageSquare, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 shadow-sm shadow-slate-950/30">
        <div className="flex items-center gap-2 text-slate-300">
          <BotMessageSquare size={15} className="text-indigo-300" />
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
          </span>
        </div>
      </div>
    </div>
  )
}
<div class="max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 shadow-sm shadow-slate-950/30"><div class="flex items-center gap-2 text-slate-300">
  <span class="flex items-center gap-1">
    <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]"></span>
    <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]"></span>
    <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
    </span>
  
  </div></div>
function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-3xl rounded-2xl border px-4 py-3 shadow-sm ${
          isUser
            ? 'border-indigo-500/40 bg-indigo-500 text-white shadow-indigo-500/20'
            : 'border-slate-700 bg-slate-900/80 text-slate-100 shadow-slate-950/30'
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] opacity-80">
          {isUser ? <UserRound size={12} /> : <Bot size={12} />}
          {isUser ? 'You' : 'Local RAG'}
        </div>

        {message.isTyping ? (
          <div className="flex items-center gap-2 text-slate-300">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </span>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-sm leading-7 text-current">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="mb-2 list-disc space-y-1 pl-5" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-5" {...props} />,
                li: ({ node, ...props }) => <li className="leading-6" {...props} />,
                code: ({ node, inline, ...props }) =>
                  inline ? (
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em]" {...props} />
                  ) : (
                    <code className="block overflow-x-auto rounded-lg bg-slate-950/70 p-3" {...props} />
                  ),
                a: ({ node, ...props }) => <a className="text-indigo-300 underline" target="_blank" rel="noreferrer" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.sources && message.sources.length > 0 && !message.isTyping && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((source, index) => (
              <span
                key={`${source.pdf_id ?? 'source'}-${index}`}
                className="rounded-full border border-slate-600 bg-slate-950/60 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300"
              >
                {source.pdf_name || 'Source'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatSection({
  messages,
  selectedModel,
  sessionTitle,
  isSending,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-5 py-3 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Local RAG</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">{sessionTitle || 'New chat'}</h1>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
          <Sparkles size={12} className="text-indigo-300" />
          {selectedModel}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                <BotMessageSquare size={22} />
              </div>
              <h2 className="text-lg font-semibold text-slate-100">Start your local knowledge search</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Upload a PDF to your private vector store, then ask a question to retrieve grounded answers from your documents.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {/* {isSending && <TypingBubble />} */}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  )
}
