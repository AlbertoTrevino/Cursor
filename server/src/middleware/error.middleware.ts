import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }

  if (err instanceof ZodError) {
    const messages = err.issues.map((i) => i.message).join(', ')
    res.status(400).json({ message: messages || 'Datos inválidos' })
    return
  }

  logger.error({ err }, 'Unhandled error')

  res.status(500).json({
    message: env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  })
}
