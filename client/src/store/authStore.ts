import { create } from 'zustand'

interface User {
  id: string
  email: string
  displayName: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (token: string) => void
  setBootstrapping: (value: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) =>
    set({ accessToken }),

  setBootstrapping: (isBootstrapping) =>
    set({ isBootstrapping }),

  logout: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}))
