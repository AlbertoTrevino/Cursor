import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

const canvasSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string().optional(),
    positionX: z.number(),
    positionY: z.number(),
    nodeType: z.string(),
    label: z.string(),
    subType: z.string().nullable().optional(),
    config: z.unknown().optional(),
    currentPrompt: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    apiKeyId: z.string().nullable().optional(),
  })),
  edges: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
  })),
})

async function getWorkflowForUser(id: string, userId: string, include?: Record<string, unknown>) {
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    ...(include ? { include } : {}),
  })
  if (!workflow) throw AppError.notFound('Flujo no encontrado')
  return workflow
}

export async function listWorkflows(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(workflows)
}

export async function getWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string
  const userId = req.userId as string
  const workflow = await getWorkflowForUser(id, userId, {
    nodes: { orderBy: { createdAt: 'asc' } },
    edges: true,
  })
  res.json(workflow)
}

export async function createWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const body = createSchema.parse(req.body)

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: body.name,
      description: body.description,
    },
    include: { nodes: true, edges: true },
  })

  res.status(201).json(workflow)
}

export async function updateWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string
  const userId = req.userId as string
  const body = createSchema.partial().parse(req.body)

  await getWorkflowForUser(id, userId)

  const workflow = await prisma.workflow.update({
    where: { id },
    data: body,
  })

  res.json(workflow)
}

export async function deleteWorkflow(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params.id as string
  const userId = req.userId as string

  await getWorkflowForUser(id, userId)

  await prisma.workflow.delete({ where: { id } })
  res.json({ message: 'Flujo eliminado' })
}

export async function saveCanvas(req: AuthRequest, res: Response): Promise<void> {
  const workflowId = req.params.id as string
  const userId = req.userId as string
  const body = canvasSchema.parse(req.body)

  await getWorkflowForUser(workflowId, userId)

  const apiKeyIds = body.nodes
    .map((n) => n.apiKeyId)
    .filter((id): id is string => !!id)

  if (apiKeyIds.length > 0) {
    const uniqueIds = [...new Set(apiKeyIds)]
    const ownedKeys = await prisma.apiKey.findMany({
      where: { id: { in: uniqueIds }, userId },
      select: { id: true },
    })
    const ownedSet = new Set(ownedKeys.map((k) => k.id))
    for (const kid of uniqueIds) {
      if (!ownedSet.has(kid)) throw AppError.badRequest('API key no pertenece al usuario')
    }
  }

  const nodeIds = new Set(body.nodes.map((n) => n.id))
  for (const edge of body.edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      throw AppError.badRequest('Las conexiones deben referenciar nodos del mismo flujo')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workflowEdge.deleteMany({ where: { workflowId } })
    await tx.workflowNode.deleteMany({ where: { workflowId } })

    for (const node of body.nodes) {
      await tx.workflowNode.create({
        data: {
          id: node.id,
          workflowId,
          type: node.nodeType,
          subType: node.subType || null,
          label: node.label || 'Sin nombre',
          positionX: node.positionX,
          positionY: node.positionY,
          config: (node.config as object) || {},
          apiKeyId: node.apiKeyId || null,
          currentPrompt: node.currentPrompt || null,
        },
      })
    }

    for (const edge of body.edges) {
      await tx.workflowEdge.create({
        data: {
          id: edge.id,
          workflowId,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        },
      })
    }

    await tx.workflow.update({
      where: { id: workflowId },
      data: { updatedAt: new Date() },
    })
  })

  res.json({ message: 'Canvas guardado' })
}
