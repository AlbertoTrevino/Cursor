import type { Response, NextFunction } from 'express'
import { prisma } from '../config/database.js'
import type { AuthRequest } from './auth.middleware.js'

export interface IdeaRequest extends AuthRequest {
  ideaId?: string
}

export function ideaOwnership(
  req: IdeaRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  if (!userId || !ideaId) {
    res.status(400).json({ message: 'Parámetros inválidos' })
    return
  }

  prisma.idea.findFirst({ where: { id: ideaId, userId } })
    .then((idea) => {
      if (!idea) {
        res.status(404).json({ message: 'Idea no encontrada' })
        return
      }
      req.ideaId = ideaId
      next()
    })
    .catch(next)
}
