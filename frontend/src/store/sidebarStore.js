import { create } from 'zustand'

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

  initializeSidebar: async () => {
    set({ isInitializing: true })

    if (!get().sessions.length) {
      const seedSessionId = `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
      set({
        sessions: [normalizeSession(seedSessionId, 'New chat')],
        currentSessionId: seedSessionId,
      })
    }

    await get().fetchModels()
    await get().fetchUploadedPdfs()

    const activeId = get().currentSessionId
    if (!activeId && get().sessions.length) {
      set({ currentSessionId: get().sessions[0].id })
    }

    set({ isInitializing: false })
  },

  setCurrentSession: (sessionId) => {
    set({ currentSessionId: sessionId })
  },

  createSession: () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const session = normalizeSession(sessionId, 'New chat')

    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: sessionId,
    }))

    return sessionId
  },

  renameSession: (sessionId, nextTitle) => {
    const trimmed = String(nextTitle || '').trim()
    if (!sessionId || !trimmed) return

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title: trimmed } : session,
      ),
    }))
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const remaining = state.sessions.filter((session) => session.id !== sessionId)
      const nextCurrentId =
        state.currentSessionId === sessionId ? remaining[0]?.id ?? null : state.currentSessionId

      return {
        sessions: remaining,
        currentSessionId: nextCurrentId,
      }
    })
  },

  setSelectedModel: (modelName) => {
    set({ selectedModel: modelName })
  },

  fetchModels: async () => {
    try {
      const response = await fetch('/api/v1/models')
      if (!response.ok) {
        throw new Error('Models endpoint unavailable')
      }

      const data = await response.json()
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
      set({
        models: fallbackModels,
        selectedModel: 'llama3.2:3b',
      })
    }
  },

  fetchUploadedPdfs: async () => {
    try {
      const response = await fetch('/api/v1/pdfs')
      if (!response.ok) {
        throw new Error('PDF list unavailable')
      }

      const data = await response.json()
      set({ uploadedPdfs: Array.isArray(data) ? data : [] })
    } catch (error) {
      set({ uploadedPdfs: [] })
    }
  },

  uploadPdf: async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    set({ isUploading: true })

    try {
      const response = await fetch('/api/v1/pdfs/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('PDF upload failed')
      }

      const payload = await response.json()
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

  removePdf: async (pdfId) => {
    try {
      const response = await fetch(`/api/v1/pdfs/${pdfId}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Delete failed')
      }
    } catch (error) {
      // keep local state working even without backend
    }

    set((state) => ({
      uploadedPdfs: state.uploadedPdfs.filter((pdf) => pdf.pdf_id !== pdfId),
    }))
  },
}))
