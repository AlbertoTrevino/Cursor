import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { getIO } from '../config/socket.js'
import { logger } from '../config/logger.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { ExecutionEngine } from '../services/execution/engine.js'
import { registerEngine, getEngine, removeEngine } from '../services/execution/engineRegistry.js'

async function verifyExecutionOwnership(executionId: string, userId: string) {
  return prisma.execution.findFirst({
    where: {
      id: executionId,
      workflow: { userId },
    },
    include: {
      nodeResults: { orderBy: [{ nodeId: 'asc' }, { iteration: 'asc' }] },
    },
  })
}

const startSchema = z.object({
  mode: z.enum(['play', 'autorun', 'step']).default('play'),
})

export async function startExecution(req: AuthRequest, res: Response): Promise<void> {
  const workflowId = req.params.id as string
  const userId = req.userId as string
  const body = startSchema.parse(req.body)

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } })
  if (!workflow) {
    res.status(404).json({ message: 'Flujo no encontrado' })
    return
  }

  const execution = await prisma.execution.create({
    data: {
      workflowId,
      status: 'pending',
      mode: body.mode,
    },
  })

  const io = getIO()
  const engine = new ExecutionEngine(workflowId, execution.id, body.mode, io)
  registerEngine(execution.id, engine)

  engine.start().catch(async (err) => {
    logger.error({ err, executionId: execution.id }, 'Execution error')
    removeEngine(execution.id)
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: 'failed', errorMessage: String(err) },
    })
    io.to(`workflow:${workflowId}`).emit('execution:error', {
      executionId: execution.id,
      error: String(err),
    })
  })

  res.json({ executionId: execution.id })
}

export async function resumeExecution(req: AuthRequest, res: Response): Promise<void> {
  const executionId = req.params.id as string
  const userId = req.userId as string

  const execution = await verifyExecutionOwnership(executionId, userId)
  if (!execution) {
    res.status(404).json({ message: 'Ejecución no encontrada' })
    return
  }

  const engine = getEngine(executionId)
  if (!engine) {
    res.status(404).json({ message: 'Ejecución no encontrada o ya terminó' })
    return
  }
  await engine.resume()
  res.json({ message: 'Reanudado' })
}

export async function stepExecution(req: AuthRequest, res: Response): Promise<void> {
  const executionId = req.params.id as string
  const userId = req.userId as string

  const execution = await verifyExecutionOwnership(executionId, userId)
  if (!execution) {
    res.status(404).json({ message: 'Ejecución no encontrada' })
    return
  }

  const engine = getEngine(executionId)
  if (!engine) {
    res.status(404).json({ message: 'Ejecución no encontrada o ya terminó' })
    return
  }
  await engine.step()
  res.json({ message: 'Paso ejecutado' })
}

export async function stopExecution(req: AuthRequest, res: Response): Promise<void> {
  const executionId = req.params.id as string
  const userId = req.userId as string

  const execution = await verifyExecutionOwnership(executionId, userId)
  if (!execution) {
    res.status(404).json({ message: 'Ejecución no encontrada' })
    return
  }

  const engine = getEngine(executionId)
  if (!engine) {
    res.status(404).json({ message: 'Ejecución no encontrada o ya terminó' })
    return
  }
  await engine.stop()
  removeEngine(executionId)
  res.json({ message: 'Detenido' })
}

const reviewActionSchema = z.object({
  nodeId: z.string().min(1, 'ID de nodo requerido'),
  action: z.enum(['continue', 'promptFeedback', 'dataFeedback']),
  feedbackText: z.string().optional(),
})

export async function reviewAction(req: AuthRequest, res: Response): Promise<void> {
  const executionId = req.params.id as string
  const userId = req.userId as string
  const body = reviewActionSchema.parse(req.body)

  const execution = await verifyExecutionOwnership(executionId, userId)
  if (!execution) {
    res.status(404).json({ message: 'Ejecución no encontrada' })
    return
  }

  const engine = getEngine(executionId)
  if (!engine) {
    res.status(404).json({ message: 'Ejecución no encontrada o ya terminó' })
    return
  }
  await engine.handleReviewAction(body.nodeId, body.action, body.feedbackText)
  res.json({ message: 'Acción procesada' })
}

export async function getExecution(req: AuthRequest, res: Response): Promise<void> {
  const executionId = req.params.id as string
  const userId = req.userId as string

  const execution = await verifyExecutionOwnership(executionId, userId)
  if (!execution) {
    res.status(404).json({ message: 'Ejecución no encontrada' })
    return
  }
  res.json(execution)
}

