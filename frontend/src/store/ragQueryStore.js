import { create } from 'zustand'
import { toast } from 'sonner'

import {
  getSessionMessagesApi,
  queryRagApi,
} from '../api/localRagApi'

import { useSidebarStore } from './sidebarStore'

// ------------------------------------
// Helpers
// ------------------------------------
const DEFAULT_TITLE = 'New chat'
const MAX_TITLE_LENGTH = 30

const createId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`

const buildSessionTitle = (question) => {
  const clean = String(question ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return DEFAULT_TITLE

  return clean.length > MAX_TITLE_LENGTH
    ? `${clean.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
    : clean
}

const shouldSetSessionTitle = (title) =>
  !title?.trim() || title.trim() === DEFAULT_TITLE

const normalizeMessages = (rows = []) =>
  rows.map((row) => ({
    id: row.message_id ?? createId(row.role ?? 'message'),
    role: row.role,
    content: row.content ?? '',
    timestamp: row.timestamp ?? new Date().toISOString(),
    sources: row.sources ?? [],
    isTyping: false,
  }))

const createFallbackAnswer = (question) => 
  `I’m currently offline or the backend isn’t running, so this is a demo answer for: "${question}".\n\nIn a real Local RAG setup, the app would query your uploaded PDFs with the selected Ollama model and return grounded content from the indexed documents.`

// updates an existing session's title only if it still has the default title.
const setTitleIfDefault = (sessionId, question) => {
  const title = buildSessionTitle(question)

  useSidebarStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
        session.id === sessionId &&
        shouldSetSessionTitle(session.title)
          ? { ...session, title } : session
      ),
  }))
}

// ------------------------------------
// RAG Query Store
// ------------------------------------
export const useRagQueryStore = create((set, get) => ({
  messagesBySession: {}, //{ session_id : [msg], }
  messages: [],
  attachedPdfIds: [],
  isSending: false,
  isLoadingSession: false,

  clearMessages: () => {
    set({
      messages: [],
    })
  },

  toggleAttachedPdf: (pdfId) => {
    if (!pdfId) return

    set((state) => {
      const hasPdf = state.attachedPdfIds.includes(pdfId)
      return {
        attachedPdfIds: hasPdf
          ? state.attachedPdfIds.filter((id) => id !== pdfId)
          : [...state.attachedPdfIds, pdfId],
      }
    })
  },

  clearAttachedPdfIds: () => {
    set({ attachedPdfIds: [] })
  },

  // show cache msg for selected sessionId
  setMessagesForSession: (sessionId) => {
    const sessionMessages = get().messagesBySession[sessionId] || []
    set({ messages: sessionMessages })
  },

  // load msgs from backend
  loadSessionMessages: async (sessionId) => {
    if (!sessionId) return []

    set({ isLoadingSession: true })

    try {
      const sessionMsg = await getSessionMessagesApi(sessionId)
      const normalizedMessages = normalizeMessages(sessionMsg)
      const isActive = useSidebarStore.getState().currentSessionId === sessionId

      set((state) => ({
        messagesBySession: { 
          ...state.messagesBySession,
          [sessionId]: normalizeMessages,
        },
        messages: isActive ? normalizedMessages : state.messages,
        isLoadingSession: false,
      }))

      return normalizedMessages
    } catch (error) {
      console.log(error);
      toast.error('Could not load chat history for this session. Please try again later.', {
        duration: 5000,
      })
      set({ isLoadingSession: false })
      return []
    }
  },

  sendMessage: async (question) => {
    const trimmedQuestion = String(question || '').trim()
    if (!trimmedQuestion) return null

    if(get().isSending) return null; // prevent overlapping sends

    const sidebar = useSidebarStore.getState()
    const sessionId = sidebar.currentSessionId
    const hasSession = Boolean(sessionId)
    const attachedPdfIds = get().attachedPdfIds

    const storageId = sessionId || createId('draft')

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

    // update rag state only in this set callbacke
    set((state) => {
      const existing = state.messagesBySession[storageId] ?? []
      const updatedMessages = [...existing, userMessage, typingMessage]

      return {
        isSending: true,
        messagesBySession: {
          ...state.messagesBySession,
          [storageId]: updatedMessages,
        },
        messages: updatedMessages,
      }
    })
    // if(!hasSession) {
    //   setTitleIfDefault(sessionId, trimmedQuestion)
    // }

    try {
      // get the all pdf_ids from the uploadedPdfs in the sidebar store and filter out any falsy values.
      const pdfIds = attachedPdfIds.length
        ? attachedPdfIds
        : sidebar.uploadedPdfs
            .map((pdf) => pdf.pdf_id || pdf.id)
            .filter(Boolean)

      const payload = await queryRagApi({
        question: trimmedQuestion,
        model: useSidebarStore.getState().selectedModel,
        pdf_ids: pdfIds,
        session_id: sidebar.currentSessionId || undefined,
      })

      const answer = payload.answer || 'No answer returned.'
      const realSessionId = payload.session_id || storageId
      
      // register a newly created backend session.
      if (!hasSession && realSessionId !== storageId) {
        const title = buildSessionTitle(trimmedQuestion)
        useSidebarStore.setState((sidebarState) => ({
          sessions: [
            {
              id: realSessionId,
              title,
              createdAt: new Date().toISOString(),
            },
            ...sidebarState.sessions.filter(
              (session) => session.id !== realSessionId
            )
          ],
          currentSessionId: realSessionId,
        }))
      }

      // replace typeing msg to answer msg
      set((state) => {
        const existing = state.messagesBySession[storageId] || []
        const updated = existing.map((message) =>
          message.id === typingMessage.id 
            ? { ...message,
                content: answer,
                sources: payload.sources ?? [],
                isTyping: false, 
                timestamp: new Date().toISOString() 
              } 
            : message,
        )

        const messagesBySession = { ...state.messagesBySession }
        delete messagesBySession[storageId]
        messagesBySession[realSessionId] = updated

        const activeSessionId =
          useSidebarStore.getState().currentSessionId
        
        const isVisibleMsg =
          activeSessionId === realSessionId ||
          (!hasSession && activeSessionId == null)
        

        return {
          messagesBySession,
          messages: isVisibleMsg ? updated : state.messages,
          isSending: false,
        }
      })

      return answer
    } catch (error) {
      const fallbackAnswer = createFallbackAnswer(trimmedQuestion)
      toast.error('Message failed to send.', {
        duration: 5000,
      })

      set((state) => {
        const existing = state.messagesBySession[storageId] ?? []
        const updated = existing.map((message) =>
          message.id == typingMessage.id 
            ? { 
                ...message,
                content: fallbackAnswer,
                isTyping: false,
                timestamp: new Date().toISOString()
              } 
            : message,
        )

        const activeSessionId = useSidebarStore.getState().currentSessionId
        const isVisibleMsg =
         activeSessionId === storageId || (!hasSession && activeSessionId == null)
        return {
          messagesBySession: {
            ...state.messagesBySession,
            [storageId]: updated,
          },
          messages: isVisibleMsg ? updated : state.messages,
          isSending: false,
        }
      })

      return fallbackAnswer
    }
  },
}))
