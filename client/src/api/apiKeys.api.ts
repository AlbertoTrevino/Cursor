import api from './axios'

export interface ApiKeyItem {
  id: string
  label: string
  provider: string
  maskedKey: string
  createdAt: string
}

export const apiKeysApi = {
  list: () =>
    api.get<ApiKeyItem[]>('/api-keys'),

  create: (payload: { label: string; provider: string; key: string }) =>
    api.post<ApiKeyItem>('/api-keys', payload),

  update: (id: string, payload: { label?: string; key?: string }) =>
    api.put<ApiKeyItem>(`/api-keys/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/api-keys/${id}`),
}
