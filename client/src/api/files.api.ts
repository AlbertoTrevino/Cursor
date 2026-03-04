import api from './axios'

export interface UploadedFileItem {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export const filesApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<UploadedFileItem>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () => api.get<UploadedFileItem[]>('/files'),

  download: (fileId: string) =>
    api.get(`/files/${fileId}/download`, { responseType: 'blob' }),

  delete: (fileId: string) => api.delete(`/files/${fileId}`),
}

/** Trigger browser download from a blob response */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
