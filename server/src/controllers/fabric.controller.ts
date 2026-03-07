import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { encryptionService } from '../services/encryption.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

const SENSITIVE_KEYS = ['clientSecret']

function separateSecrets(config: Record<string, string>): {
  safeConfig: Record<string, string>
  secret: string | null
} {
  const safeConfig: Record<string, string> = {}
  let secret: string | null = null

  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_KEYS.includes(key) && value) {
      secret = value
    } else {
      safeConfig[key] = value
    }
  }

  return { safeConfig, secret }
}

function maskSecret(conn: any): any {
  const result = { ...conn }
  if (result.encryptedSecret) {
    result.hasSecret = true
  }
  delete result.encryptedSecret
  delete result.secretIv
  delete result.secretAuthTag
  return result
}

const createConnectionSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  config: z.record(z.string()).default({}),
})

const updateConnectionSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.string()).optional(),
})

export async function listConnections(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connections = await prisma.fabricConnection.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(connections.map(maskSecret))
}

export async function getConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const conn = await prisma.fabricConnection.findFirst({
    where: { id: connId, userId },
  })
  if (!conn) throw AppError.notFound('Conexión no encontrada')
  res.json(maskSecret(conn))
}

export async function createConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const body = createConnectionSchema.parse(req.body)
  const { safeConfig, secret } = separateSecrets(body.config)

  const encData = secret ? encryptionService.encrypt(secret) : null

  const conn = await prisma.fabricConnection.create({
    data: {
      userId,
      name: body.name,
      config: safeConfig,
      ...(encData && {
        encryptedSecret: encData.encryptedData,
        secretIv: encData.iv,
        secretAuthTag: encData.authTag,
      }),
    },
  })

  res.status(201).json(maskSecret(conn))
}

export async function updateConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string
  const body = updateConnectionSchema.parse(req.body)

  const existing = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!existing) throw AppError.notFound('Conexión no encontrada')

  const updateData: any = {}
  if (body.name) updateData.name = body.name

  if (body.config) {
    const { safeConfig, secret } = separateSecrets(body.config)
    updateData.config = safeConfig

    if (secret) {
      const encData = encryptionService.encrypt(secret)
      updateData.encryptedSecret = encData.encryptedData
      updateData.secretIv = encData.iv
      updateData.secretAuthTag = encData.authTag
    }
  }

  const conn = await prisma.fabricConnection.update({
    where: { id: connId },
    data: updateData,
  })

  res.json(maskSecret(conn))
}

export async function deleteConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const existing = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!existing) throw AppError.notFound('Conexión no encontrada')

  await prisma.fabricConnection.delete({ where: { id: connId } })
  res.json({ message: 'Conexión eliminada' })
}

export async function testConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const conn = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!conn) throw AppError.notFound('Conexión no encontrada')

  const config = conn.config as Record<string, string>
  const requiredFields = ['workspaceId', 'endpoint']
  const missing = requiredFields.filter(f => !config[f])

  if (missing.length > 0) {
    await prisma.fabricConnection.update({
      where: { id: connId },
      data: { status: 'error', lastError: `Campos faltantes: ${missing.join(', ')}` },
    })
    res.json({
      success: false,
      message: `Configuración incompleta: ${missing.join(', ')}`,
      requiredFields: ['workspaceId', 'endpoint', 'tenantId', 'clientId', 'clientSecret'],
    })
    return
  }

  await prisma.fabricConnection.update({
    where: { id: connId },
    data: { status: 'connected', lastError: null },
  })

  res.json({
    success: true,
    message: 'Configuración válida. La prueba completa de conectividad estará disponible cuando se configure la autenticación de Microsoft Fabric.',
    requiredFields: ['workspaceId', 'endpoint', 'tenantId', 'clientId', 'clientSecret'],
  })
}
