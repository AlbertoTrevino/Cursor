import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

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
  res.json(connections)
}

export async function getConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const conn = await prisma.fabricConnection.findFirst({
    where: { id: connId, userId },
  })
  if (!conn) throw AppError.notFound('Connection not found')
  res.json(conn)
}

export async function createConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const body = createConnectionSchema.parse(req.body)

  const conn = await prisma.fabricConnection.create({
    data: {
      userId,
      name: body.name,
      config: body.config,
    },
  })

  res.status(201).json(conn)
}

export async function updateConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string
  const body = updateConnectionSchema.parse(req.body)

  const existing = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!existing) throw AppError.notFound('Connection not found')

  const conn = await prisma.fabricConnection.update({
    where: { id: connId },
    data: body,
  })

  res.json(conn)
}

export async function deleteConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const existing = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!existing) throw AppError.notFound('Connection not found')

  await prisma.fabricConnection.delete({ where: { id: connId } })
  res.json({ message: 'Connection deleted' })
}

export async function testConnection(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const connId = req.params.id as string

  const conn = await prisma.fabricConnection.findFirst({ where: { id: connId, userId } })
  if (!conn) throw AppError.notFound('Connection not found')

  // Placeholder: actual Fabric connectivity will be implemented when auth method is decided
  const config = conn.config as Record<string, string>
  const requiredFields = ['workspaceId', 'endpoint']
  const missing = requiredFields.filter(f => !config[f])

  if (missing.length > 0) {
    await prisma.fabricConnection.update({
      where: { id: connId },
      data: { status: 'error', lastError: `Missing fields: ${missing.join(', ')}` },
    })
    res.json({
      success: false,
      message: `Missing required configuration: ${missing.join(', ')}`,
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
    message: 'Connection configuration looks valid. Full connectivity test will be available when Microsoft Fabric auth is configured.',
    requiredFields: ['workspaceId', 'endpoint', 'tenantId', 'clientId', 'clientSecret'],
  })
}
