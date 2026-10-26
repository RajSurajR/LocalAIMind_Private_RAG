import { create } from 'zustand'

import {
  deletePdfApi,
  deleteSessionApi,
  getModels,
  listPdfs,
  listSessionsApi,
  notifyBackendOffline,
  renameSessionApi,
  uploadPdfApi,
} from '../api/localRagApi'
import { toast } from 'sonner'

const fallbackModels = [
  { name: 'llama3.2:3b', size: 0, modified_at: 'local' },
]

const normalizeSession = (sessionId, fallbackTitle = 'New chat') => ({
  id: sessionId,
  title: fallbackTitle,
  createdAt: new Date().toISOString(),
})

export const useSidebarStore = create((set, get) => ({
  sessions: [],
  currentSessionId: null,
  uploadedPdfs: [],
  selectedModel: 'llama3.2:3b',
  models: fallbackModels,
  isInitializing: true,
  isUploading: false,
  isDeleting: false,

  initializeSidebar: async () => {
    set({ isInitializing: true })

    try {
      const savedSessions = await listSessionsApi()
      
      const normalizedSessions = Array.isArray(savedSessions)
        ? savedSessions.map((session) => ({
            id: session.session_id,
            title: session.title || 'New chat',
            createdAt: session.created_at || new Date().toISOString(),
          }))
        : []

      set({
        sessions: normalizedSessions,
        // currentSessionId: normalizedSessions[0]?.id ?? null,
      })
    } catch (error) {
      set({
        sessions: [],
        currentSessionId: null,
      })
      toast.error('Server error. Previous sessions are unavailable.', {
        duration: 4000,
      })
      set({ isInitializing: false })
      return;
    }

    await get().fetchModels()
    await get().fetchUploadedPdfs()

    set({ isInitializing: false })
  },

  setCurrentSession: (sessionId) => {
    set({ currentSessionId: sessionId })
  },

  // keep the app in a blank draft until the first message is sent.
  // the real session is created by the backend when the query succeeds.
  createSession: () => {
    set({ currentSessionId: null })
    return null
  },

  // rename a session in to backend and then update the session state.
  renameSession: async (sessionId, nextTitle) => {
    const trimTitle = String(nextTitle || '').trim()
    if (!sessionId || !trimTitle) return

    try {
      await renameSessionApi(sessionId, trimTitle)

      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId ? { ...session, title: trimTitle } : session,
        ),
      }))
    } catch (error) {
      toast.error('Could not rename this chat. Please try again later.', {
        duration: 5000,
      })
    }
  },

  // delete a session from backend and remove it from session state.
  deleteSession: async (sessionId) => {
    try {
      await deleteSessionApi(sessionId)

      set((state) => {
        const remaining = state.sessions.filter((session) => session.id !== sessionId)
        const nextCurrentId =
          state.currentSessionId === sessionId ? remaining[0]?.id ?? null : state.currentSessionId

        return {
          sessions: remaining,
          currentSessionId: nextCurrentId,
        }
      })
    } catch (error) {
      toast.error('Could not delete this chat. Please verify the backend connection.', {
        duration: 5000,
      })
    }
  },

  setSelectedModel: (modelName) => {
    set({ selectedModel: modelName })
  },

  // fetch all available models from backend and set models state.
  fetchModels: async () => {
    try {
      const data = await getModels()
      const nextModels = Array.isArray(data) && data.length ? data : fallbackModels
      const nextSelection =
        nextModels.some((model) => model.name === get().selectedModel)
          ? get().selectedModel
          : nextModels[0]?.name || 'llama3.2:3b'

      set({
        models: nextModels,
        selectedModel: nextSelection,
      })
    } catch (error) {
      toast.error('Could not load available models.', {
        duration: 4000,
      })
      set({
        models: fallbackModels,
        selectedModel: 'llama3.2:3b',
        uploadedPdfs: [],
      })
    }
  },

  // fetch all uploade pdfs from backend and set uploadedpdfs state.
  fetchUploadedPdfs: async () => {
    try {
      const data = await listPdfs()
      set({ uploadedPdfs: Array.isArray(data) ? data : [] })
    } catch (error) {
      toast.error('Could not load uploaded PDFs.', {
        duration: 4000,
      })
      set({ uploadedPdfs: [] })
    }
  },

  // uploadpdf to backend and add it to uploadedpdfs state.
  uploadPdf: async (file) => {
    set({ isUploading: true })

    try {
      const payload = await uploadPdfApi(file)
      const uploadedPdf = {
        pdf_id: payload.pdf_id,
        name: payload.name,
        collection_name: payload.collection_name,
        doc_count: payload.doc_count,
        page_count: payload.page_count,
        upload_timestamp: payload.upload_timestamp,
      }

      set((state) => ({
        uploadedPdfs: [uploadedPdf, ...state.uploadedPdfs],
        isUploading: false,
      }))

      return uploadedPdf
    } catch (error) {
      toast.error('PDF upload failed.', {
        duration: 5000,
      })

      const mockPdf = {
        pdf_id: `pdf_mock_${Date.now()}`,
        name: file.name,
        collection_name: `collection_${Date.now()}`,
        doc_count: 1,
        page_count: 1,
        upload_timestamp: new Date().toISOString(),
      }

      set((state) => ({
        uploadedPdfs: [mockPdf, ...state.uploadedPdfs],
        isUploading: false,
      }))

      return mockPdf
    }
  },

  // remove pdf from the uploadedPdfs state and also remove it from the backend.
  removePdf: async (pdfId) => {
    try {
      await deletePdfApi(pdfId)
    } catch (error) {
      toast.error('Could not delete this PDF.', {
        duration: 5000,
      })
    }

    set((state) => ({
      uploadedPdfs: state.uploadedPdfs.filter((pdf) => pdf.pdf_id !== pdfId),
    }))
  },
}))
