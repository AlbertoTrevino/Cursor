import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'

const registerSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  displayName: z.string().min(1, 'Nombre requerido'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body)

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    res.status(409).json({ message: 'Ya existe una cuenta con ese correo' })
    return
  }

  const passwordHash = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      displayName: body.displayName,
    },
  })

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  })

  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    accessToken,
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user) {
    res.status(401).json({ message: 'Credenciales incorrectas' })
    return
  }

  const valid = await comparePassword(body.password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ message: 'Credenciales incorrectas' })
    return
  }

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  })

  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    accessToken,
  })
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken
  if (!token) {
    res.status(401).json({ message: 'No hay refresh token' })
    return
  }

  try {
    const payload = verifyRefreshToken(token)
    const accessToken = signAccessToken(payload.userId)
    res.json({ accessToken })
  } catch {
    res.status(401).json({ message: 'Refresh token inválido' })
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, displayName: true },
  })

  if (!user) {
    res.status(404).json({ message: 'Usuario no encontrado' })
    return
  }

  res.json(user)
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' })
  res.json({ message: 'Sesión cerrada' })
}
