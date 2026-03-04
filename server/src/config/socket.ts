import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { env } from './env.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { prisma } from './database.js'

let io: Server

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      return next(new Error('Token no proporcionado'))
    }
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Token inválido o expirado'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('join:workflow', async (workflowId: string) => {
      const userId = socket.data.userId as string
      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, userId },
        select: { id: true },
      })
      if (!workflow) {
        socket.emit('error', { message: 'Flujo no encontrado' })
        return
      }
      socket.join(`workflow:${workflowId}`)
    })

    socket.on('leave:workflow', (workflowId: string) => {
      socket.leave(`workflow:${workflowId}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
