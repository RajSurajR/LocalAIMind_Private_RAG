import axios from 'axios'
import { toast } from 'sonner'

export const notifyBackendOffline = (message = 'Backend is offline. Please start the Local AI Mind API server.') => {
  toast.error(message, {
    id: 'backend-offline',
    duration: 5000,
  })
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});


export const getModels = async () => {
  const response = await apiClient.get('/models')
  return response.data
}

export const listPdfs = async () => {
  const response = await apiClient.get('/pdfs')
  return response.data
}

export const uploadPdfApi = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post('/pdfs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const deletePdfApi = async (pdfId) => {
  const response = await apiClient.delete(`/pdfs/${pdfId}`)
  return response.data
}

export const queryRagApi = async (payload) => {
  const response = await apiClient.post('/query', payload)
  return response.data
}

export const listSessionsApi = async () => {
  const response = await apiClient.get('/sessions')
  return response.data
}

export const getSessionMessagesApi = async (sessionId) => {
  const response = await apiClient.get(`/sessions/${sessionId}/messages`)
  return response.data
}
