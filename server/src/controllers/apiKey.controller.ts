import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { encryptionService } from '../services/encryption.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

const createSchema = z.object({
  label: z.string().min(1, 'Nombre requerido'),
  provider: z.enum(['openai', 'anthropic']),
  key: z.string().min(10, 'API key demasiado corta'),
})

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  key: z.string().min(10).optional(),
})

async function getApiKeyForUser(id: string, userId: string) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } })
  if (!key) throw AppError.notFound('API key no encontrada')
  return key
}

export async function listApiKeys(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      provider: true,
      maskedKey: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(keys)
}

export async function createApiKey(req: AuthRequest, res: Response): Promise<void> {
  const body = createSchema.parse(req.body)
  const { encryptedData, iv, authTag } = encryptionService.encrypt(body.key)
  const maskedKey = encryptionService.mask(body.key)

  const userId = req.userId as string
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      label: body.label,
      provider: body.provider,
      encryptedKey: encryptedData,
      iv,
      authTag,
      maskedKey,
    },
    select: {
      id: true,
      label: true,
      provider: true,
      maskedKey: true,
      createdAt: true,
    },
  })

  res.status(201).json(apiKey)
}

export async function updateApiKey(req: AuthRequest, res: Response): Promise<void> {
  const body = updateSchema.parse(req.body)
  const id = req.params.id as string
  const userId = req.userId as string

  await getApiKeyForUser(id, userId)

  const updateData: Record<string, unknown> = {}
  if (body.label) updateData.label = body.label
  if (body.key) {
    const { encryptedData, iv, authTag } = encryptionService.encrypt(body.key)
    updateData.encryptedKey = encryptedData
    updateData.iv = iv
    updateData.authTag = authTag
    updateData.maskedKey = encryptionService.mask(body.key)
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      label: true,
      provider: true,
      maskedKey: true,
      createdAt: true,
    },
  })

  res.json(apiKey)
}

export async function deleteApiKey(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string
  const userId = req.userId as string

  await getApiKeyForUser(id, userId)

  await prisma.apiKey.delete({ where: { id } })
  res.json({ message: 'API key eliminada' })
}
