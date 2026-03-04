import type { AxiosError } from 'axios'

export function getApiErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as AxiosError<{ message?: string }>
    return axiosErr.response?.data?.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}
