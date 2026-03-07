import api from './axios'
import type { FabricConnection } from '@/types/idea'

export const fabricApi = {
  list: () =>
    api.get<FabricConnection[]>('/fabric'),

  get: (id: string) =>
    api.get<FabricConnection>(`/fabric/${id}`),

  create: (payload: { name: string; config: Record<string, string> }) =>
    api.post<FabricConnection>('/fabric', payload),

  update: (id: string, payload: { name?: string; config?: Record<string, string> }) =>
    api.put<FabricConnection>(`/fabric/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/fabric/${id}`),

  test: (id: string) =>
    api.post<{ success: boolean; message: string; requiredFields?: string[] }>(`/fabric/${id}/test`),
}
