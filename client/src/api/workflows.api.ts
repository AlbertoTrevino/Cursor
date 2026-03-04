import api from './axios'

export interface WorkflowSummary {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowDetail extends WorkflowSummary {
  nodes: unknown[]
  edges: unknown[]
}

export const workflowsApi = {
  list: () =>
    api.get<WorkflowSummary[]>('/workflows'),

  get: (id: string) =>
    api.get<WorkflowDetail>(`/workflows/${id}`),

  create: (payload: { name: string; description?: string }) =>
    api.post<WorkflowDetail>('/workflows', payload),

  update: (id: string, payload: { name?: string; description?: string }) =>
    api.put<WorkflowDetail>(`/workflows/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/workflows/${id}`),

  saveCanvas: (id: string, payload: { nodes: unknown[]; edges: unknown[] }) =>
    api.put(`/workflows/${id}/canvas`, payload),
}
