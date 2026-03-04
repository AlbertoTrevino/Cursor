import api from './axios'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  password: string
  displayName: string
}

interface AuthResponse {
  user: {
    id: string
    email: string
    displayName: string
  }
  accessToken: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/registro', payload),

  refresh: () =>
    api.post<{ accessToken: string }>('/auth/refresh'),

  me: () =>
    api.get<AuthResponse['user']>('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
}
