import api from './axios'
import type {
  Idea,
  IdeasListResponse,
  IdeaAttachment,
  IdeaDiagram,
  ProcessResult,
  ClarificationResult,
  NamingSuggestion,
  IdeaVersionSummary,
  IdeaVersion,
} from '@/types/idea'

export const ideasApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; mode?: string }) =>
    api.get<IdeasListResponse>('/ideas', { params }),

  get: (id: string) =>
    api.get<Idea>(`/ideas/${id}`),

  create: (payload: {
    title: string
    description: string
    mode: 'simple' | 'complex'
    projectContext?: string
    affectedAreas?: string
    structuralNotes?: string
  }) =>
    api.post<Idea>('/ideas', payload),

  update: (id: string, payload: Partial<{
    title: string
    description: string
    mode: 'simple' | 'complex'
    status: string
    projectContext: string | null
    affectedAreas: string | null
    structuralNotes: string | null
  }>) =>
    api.put<Idea>(`/ideas/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/ideas/${id}`),

  checkClarification: (id: string) =>
    api.post<ClarificationResult>(`/ideas/${id}/clarify`),

  answerClarifications: (id: string, answers: Array<{ id: string; answer: string }>) =>
    api.post<Idea>(`/ideas/${id}/answer`, { answers }),

  process: (id: string, signal?: AbortSignal) =>
    api.post<ProcessResult>(`/ideas/${id}/process`, {}, { signal }),

  regenerateHandoff: (id: string) =>
    api.post<{ handoffText: string }>(`/ideas/${id}/handoff`),

  checkNaming: (text: string) =>
    api.post<{ suggestions: NamingSuggestion[] }>('/ideas/naming/check', { text }),

  uploadAttachment: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<IdeaAttachment>(`/ideas/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteAttachment: (ideaId: string, attachmentId: string) =>
    api.delete(`/ideas/${ideaId}/attachments/${attachmentId}`),

  saveDiagram: (ideaId: string, data: {
    name?: string
    diagramData?: any
    imageData?: string
    sourceType?: 'excalidraw' | 'upload'
  }) =>
    api.post<IdeaDiagram>(`/ideas/${ideaId}/diagrams`, data),

  updateDiagram: (ideaId: string, diagramId: string, data: {
    name?: string
    diagramData?: any
    imageData?: string
  }) =>
    api.put<IdeaDiagram>(`/ideas/${ideaId}/diagrams/${diagramId}`, data),

  deleteDiagram: (ideaId: string, diagramId: string) =>
    api.delete(`/ideas/${ideaId}/diagrams/${diagramId}`),

  listVersions: (ideaId: string) =>
    api.get<IdeaVersionSummary[]>(`/ideas/${ideaId}/versions`),

  getVersion: (ideaId: string, versionId: string) =>
    api.get<IdeaVersion>(`/ideas/${ideaId}/versions/${versionId}`),
}
