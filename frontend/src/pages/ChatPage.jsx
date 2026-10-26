import { useEffect } from 'react'

import { ChatInput } from '../components/ChatInput'
import { ChatSection } from '../components/ChatSection'
import { Sidebar } from '../components/Sidebar'
import { useRagQueryStore } from '../store/ragQueryStore'
import { useSidebarStore } from '../store/sidebarStore'

export function ChatPage() {
  const sessions = useSidebarStore((state) => state.sessions)
  const currentSessionId = useSidebarStore((state) => state.currentSessionId)
  const uploadedPdfs = useSidebarStore((state) => state.uploadedPdfs)
  const models = useSidebarStore((state) => state.models)
  const selectedModel = useSidebarStore((state) => state.selectedModel)
  const isUploading = useSidebarStore((state) => state.isUploading)

  const messages = useRagQueryStore((state) => state.messages)
  const isSending = useRagQueryStore((state) => state.isSending)

  const setCurrentSession = useSidebarStore((state) => state.setCurrentSession)
  const createSession = useSidebarStore((state) => state.createSession)
  const renameSession = useSidebarStore((state) => state.renameSession)
  const deleteSession = useSidebarStore((state) => state.deleteSession)
  const setSelectedModel = useSidebarStore((state) => state.setSelectedModel)
  const uploadPdf = useSidebarStore((state) => state.uploadPdf)
  const removePdf = useSidebarStore((state) => state.removePdf)

  const sendMessage = useRagQueryStore((state) => state.sendMessage)
  const loadSessionMessages = useRagQueryStore((state) => state.loadSessionMessages)
  const clearMessages = useRagQueryStore((state) => state.clearMessages)

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId)
    }
  }, [currentSessionId, loadSessionMessages])

  const activeSession = sessions.find((session) => session.id === currentSessionId) || null

  const handleNewChat = () => {
    setCurrentSession(null)
    clearMessages()
  }

  const handleRenameSession = (sessionId) => {
    const targetSession = sessions.find((session) => session.id === sessionId)
    const nextTitle = window.prompt('Rename chat session', targetSession?.title || 'New chat')

    if (nextTitle && nextTitle.trim()) {
      renameSession(sessionId, nextTitle.trim())
    }
  }

  const handleDeleteSession = (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return
    deleteSession(sessionId)
  }

  const handleUploadPdf = async (file) => {
    if (!file) return
    await uploadPdf(file)
  }

  const handleSendMessage = async (question) => {
    await sendMessage(question)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex h-screen max-w-[1800px] overflow-hidden">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          uploadedPdfs={uploadedPdfs}
          onNewChat={handleNewChat}
          onSelectSession={setCurrentSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onDeletePdf={removePdf}
          brand="Local AI Mind"
        />

        <main className="flex min-w-0 flex-1 flex-col bg-slate-950">
          <ChatSection
            messages={messages}
            selectedModel={selectedModel}
            sessionTitle={activeSession?.title || 'Start New chat'}
            isSending={isSending}
          />

          <ChatInput
            models={models}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onSendMessage={handleSendMessage}
            onUploadPdf={handleUploadPdf}
            isSending={isSending}
            isUploading={isUploading}
          />
        </main>
      </div>
    </div>
  )
}
