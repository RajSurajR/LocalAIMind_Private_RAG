import { create } from 'zustand'

import { useSidebarStore } from './sidebarStore'

const normalizeMessages = (rows = []) =>
  rows.map((row) => ({
    id: row.message_id ?? `${row.role}-${row.timestamp ?? Date.now()}-${Math.random()}`,
    role: row.role,
    content: row.content ?? '',
    timestamp: row.timestamp ?? new Date().toISOString(),
    sources: row.sources ?? [],
    isTyping: false,
  }))

const buildSessionTitle = (question) => {
  const clean = String(question || '').trim().replace(/\s+/g, ' ')
  if (!clean) return 'New chat'
  return clean.length > 28 ? `${clean.slice(0, 28).trim()}…` : clean
}

const createFallbackAnswer = (question) => `I’m currently offline or the backend isn’t running, so this is a demo answer for: "${question}".\n\nIn a real Local RAG setup, the app would query your uploaded PDFs with the selected Ollama model and return grounded content from the indexed documents.`

export const useRagQueryStore = create((set, get) => ({
  messagesBySession: {},
  messages: [],
  isSending: false,
  isLoadingSession: false,

  setMessagesForSession: (sessionId) => {
    const sessionMessages = get().messagesBySession[sessionId] || []
    set({ messages: sessionMessages })
  },

  loadSessionMessages: async (sessionId) => {
    if (!sessionId) return []

    set({ isLoadingSession: true })

    try {
      const response = await fetch(`/api/v1/sessions/${sessionId}/messages`)
      if (!response.ok) {
        throw new Error('Session history unavailable')
      }

      const payload = await response.json()
      const normalized = normalizeMessages(payload)
      const activeSessionId = useSidebarStore.getState().currentSessionId

      set((state) => ({
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: normalized,
        },
        messages: activeSessionId === sessionId ? normalized : state.messages,
        isLoadingSession: false,
      }))

      return normalized
    } catch (error) {
      set((state) => ({
        isLoadingSession: false,
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: state.messagesBySession[sessionId] || [],
        },
      }))
      return []
    }
  },

  sendMessage: async (question) => {
    const trimmedQuestion = String(question || '').trim()
    if (!trimmedQuestion) return null

    const sidebar = useSidebarStore.getState()
    let currentSessionId = sidebar.currentSessionId
    if (!currentSessionId) {
      currentSessionId = sidebar.createSession()
    }

    const now = new Date().toISOString()
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmedQuestion,
      timestamp: now,
      sources: [],
      isTyping: false,
    }

    const typingMessage = {
      id: `assistant_${Date.now()}_typing`,
      role: 'assistant',
      content: '',
      timestamp: now,
      sources: [],
      isTyping: true,
    }

    set((state) => {
      const existing = state.messagesBySession[currentSessionId] || []
      const nextMessages = [...existing, userMessage, typingMessage]
      const nextTitle = buildSessionTitle(trimmedQuestion)

      useSidebarStore.setState((sidebarState) => ({
        sessions: sidebarState.sessions.some((session) => session.id === currentSessionId)
          ? sidebarState.sessions.map((session) =>
              session.id === currentSessionId ? { ...session, title: nextTitle } : session,
            )
          : sidebarState.sessions,
      }))

      return {
        isSending: true,
        messagesBySession: {
          ...state.messagesBySession,
          [currentSessionId]: nextMessages,
        },
        messages: sidebar.currentSessionId === currentSessionId ? nextMessages : state.messages,
      }
    })

    try {
      const pdfIds = useSidebarStore.getState()
        .uploadedPdfs.map((pdf) => pdf.pdf_id || pdf.id)
        .filter(Boolean)

      const response = await fetch('/api/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          model: useSidebarStore.getState().selectedModel,
          pdf_ids: pdfIds,
          session_id: currentSessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Query failed')
      }

      const payload = await response.json()
      const answer = payload.answer || 'No answer returned.'

      set((state) => {
        const existing = state.messagesBySession[currentSessionId] || []
        const updated = existing.map((message) =>
          message.isTyping ? { ...message, content: answer, isTyping: false, timestamp: new Date().toISOString() } : message,
        )

        return {
          messagesBySession: {
            ...state.messagesBySession,
            [currentSessionId]: updated,
          },
          messages: useSidebarStore.getState().currentSessionId === currentSessionId ? updated : state.messages,
          isSending: false,
        }
      })

      return answer
    } catch (error) {
      const fallbackAnswer = createFallbackAnswer(trimmedQuestion)

      set((state) => {
        const existing = state.messagesBySession[currentSessionId] || []
        const updated = existing.map((message) =>
          message.isTyping ? { ...message, content: fallbackAnswer, isTyping: false, timestamp: new Date().toISOString() } : message,
        )

        return {
          messagesBySession: {
            ...state.messagesBySession,
            [currentSessionId]: updated,
          },
          messages: useSidebarStore.getState().currentSessionId === currentSessionId ? updated : state.messages,
          isSending: false,
        }
      })

      return fallbackAnswer
    }
  },
}))
