import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export function validateUUID(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of paramNames) {
      const value = req.params[name]
      if (value && !uuidSchema.safeParse(value).success) {
        res.status(400).json({ message: `Parámetro '${name}' no es un UUID válido` })
        return
      }
    }
    next()
  }
}
