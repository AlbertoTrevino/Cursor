import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      autoConnect: false,
      auth: {
        token: useAuthStore.getState().accessToken,
      },
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  s.auth = { token: useAuthStore.getState().accessToken }
  if (!s.connected) s.connect()
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect()
}
