import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

const createIdeaSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().min(1, 'Descripción requerida'),
  mode: z.enum(['simple', 'complex']).default('simple'),
  projectContext: z.string().optional(),
  affectedAreas: z.string().optional(),
  structuralNotes: z.string().optional(),
})

const updateIdeaSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  mode: z.enum(['simple', 'complex']).optional(),
  projectContext: z.string().nullable().optional(),
  affectedAreas: z.string().nullable().optional(),
  structuralNotes: z.string().nullable().optional(),
  status: z.enum(['draft', 'clarifying', 'processing', 'done']).optional(),
})

const answerClarificationSchema = z.object({
  answers: z.array(z.object({
    id: z.string().uuid(),
    answer: z.string().min(1),
  })),
})

export async function listIdeas(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideas = await prisma.idea.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      mode: true,
      status: true,
      recommendation: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { attachments: true, diagrams: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(ideas)
}

export async function getIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: {
      attachments: { orderBy: { createdAt: 'asc' } },
      diagrams: { orderBy: { createdAt: 'asc' } },
      questions: { orderBy: { ordering: 'asc' } },
    },
  })

  if (!idea) throw AppError.notFound('Idea no encontrada')
  res.json(idea)
}

export async function createIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const body = createIdeaSchema.parse(req.body)

  const idea = await prisma.idea.create({
    data: {
      userId,
      title: body.title,
      description: body.description,
      mode: body.mode,
      projectContext: body.projectContext,
      affectedAreas: body.affectedAreas,
      structuralNotes: body.structuralNotes,
    },
  })

  res.status(201).json(idea)
}

export async function updateIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const body = updateIdeaSchema.parse(req.body)

  const existing = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!existing) throw AppError.notFound('Idea no encontrada')

  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: body,
  })

  res.json(idea)
}

export async function deleteIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  const existing = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!existing) throw AppError.notFound('Idea no encontrada')

  await prisma.idea.delete({ where: { id: ideaId } })
  res.json({ message: 'Idea eliminada' })
}

export async function answerClarifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const { answers } = answerClarificationSchema.parse(req.body)

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  for (const a of answers) {
    await prisma.ideaClarification.update({
      where: { id: a.id },
      data: { answer: a.answer },
    })
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: 'draft' },
  })

  const updated = await prisma.idea.findFirst({
    where: { id: ideaId },
    include: {
      attachments: true,
      diagrams: true,
      questions: { orderBy: { ordering: 'asc' } },
    },
  })

  res.json(updated)
}

export async function uploadIdeaAttachment(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const file = req.file

  if (!file) {
    res.status(400).json({ message: 'No se envió ningún archivo' })
    return
  }

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const attachment = await prisma.ideaAttachment.create({
    data: {
      ideaId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      storagePath: file.path,
      sizeBytes: file.size,
    },
  })

  res.status(201).json(attachment)
}

export async function deleteIdeaAttachment(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const attachmentId = req.params.attachmentId as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const attachment = await prisma.ideaAttachment.findFirst({
    where: { id: attachmentId, ideaId },
  })
  if (!attachment) throw AppError.notFound('Adjunto no encontrado')

  const fs = await import('fs/promises')
  const path = await import('path')
  try {
    await fs.unlink(path.resolve(attachment.storagePath))
  } catch {
    // File may already be deleted
  }

  await prisma.ideaAttachment.delete({ where: { id: attachmentId } })
  res.json({ message: 'Adjunto eliminado' })
}

export async function saveDiagram(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const { name, diagramData, imageData, sourceType } = req.body

  const diagram = await prisma.ideaDiagram.create({
    data: {
      ideaId,
      name: name || 'Diagram',
      diagramData: diagramData || undefined,
      imageData: imageData || undefined,
      sourceType: sourceType || 'excalidraw',
    },
  })

  res.status(201).json(diagram)
}

export async function updateDiagram(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const diagramId = req.params.diagramId as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const existing = await prisma.ideaDiagram.findFirst({
    where: { id: diagramId, ideaId },
  })
  if (!existing) throw AppError.notFound('Diagrama no encontrado')

  const { name, diagramData, imageData } = req.body

  const diagram = await prisma.ideaDiagram.update({
    where: { id: diagramId },
    data: {
      ...(name !== undefined && { name }),
      ...(diagramData !== undefined && { diagramData }),
      ...(imageData !== undefined && { imageData }),
    },
  })

  res.json(diagram)
}

export async function deleteDiagram(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const diagramId = req.params.diagramId as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  await prisma.ideaDiagram.delete({ where: { id: diagramId } })
  res.json({ message: 'Diagrama eliminado' })
}
