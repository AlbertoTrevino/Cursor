import type { Response } from 'express'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js'

const ATTACHMENT_SAFE_SELECT = {
  id: true,
  ideaId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
}

const DIAGRAM_SAFE_SELECT = {
  id: true,
  ideaId: true,
  name: true,
  diagramData: true,
  imagePath: true,
  sourceType: true,
  createdAt: true,
  updatedAt: true,
}

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

const saveDiagramSchema = z.object({
  name: z.string().default('Diagrama'),
  diagramData: z.any().optional(),
  imageData: z.string().optional(),
  sourceType: z.enum(['excalidraw', 'upload']).default('excalidraw'),
})

const updateDiagramSchema = z.object({
  name: z.string().optional(),
  diagramData: z.any().optional(),
  imageData: z.string().optional(),
})

async function saveImageToDisk(imageData: string, ideaId: string): Promise<string> {
  const diagramDir = path.resolve(env.UPLOAD_DIR, 'diagrams')
  await fs.mkdir(diagramDir, { recursive: true })

  const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!base64Match) throw new Error('Formato de imagen inválido')

  const ext = base64Match[1] === 'svg+xml' ? 'svg' : base64Match[1]
  const buffer = Buffer.from(base64Match[2], 'base64')
  const filename = `${ideaId}-${Date.now()}.${ext}`
  const filePath = path.join(diagramDir, filename)

  await fs.writeFile(filePath, buffer)
  return `/api/ideas/diagrams/image/${filename}`
}

export async function listIdeas(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string

  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
  const search = (req.query.search as string || '').trim()
  const status = req.query.status as string || ''
  const mode = req.query.mode as string || ''

  const where: any = { userId }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status && ['draft', 'clarifying', 'processing', 'done'].includes(status)) {
    where.status = status
  }
  if (mode && ['simple', 'complex'].includes(mode)) {
    where.mode = mode
  }

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.idea.count({ where }),
  ])

  res.json({ ideas, total, page, limit })
}

export async function getIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: {
      attachments: { select: ATTACHMENT_SAFE_SELECT, orderBy: { createdAt: 'asc' } },
      diagrams: { select: DIAGRAM_SAFE_SELECT, orderBy: { createdAt: 'asc' } },
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

  // Verify all clarification IDs belong to this idea
  const validIds = await prisma.ideaClarification.findMany({
    where: { ideaId, id: { in: answers.map(a => a.id) } },
    select: { id: true },
  })
  const validIdSet = new Set(validIds.map(v => v.id))

  const operations = answers
    .filter(a => validIdSet.has(a.id))
    .map(a => prisma.ideaClarification.update({
      where: { id: a.id },
      data: { answer: a.answer },
    }))

  await prisma.$transaction([
    ...operations,
    prisma.idea.update({ where: { id: ideaId }, data: { status: 'draft' } }),
  ])

  const updated = await prisma.idea.findFirst({
    where: { id: ideaId },
    include: {
      attachments: { select: ATTACHMENT_SAFE_SELECT },
      diagrams: { select: DIAGRAM_SAFE_SELECT },
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
    select: ATTACHMENT_SAFE_SELECT,
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

  const body = saveDiagramSchema.parse(req.body)

  let imagePath: string | null = null
  if (body.imageData) {
    imagePath = await saveImageToDisk(body.imageData, ideaId)
  }

  const diagram = await prisma.ideaDiagram.create({
    data: {
      ideaId,
      name: body.name,
      diagramData: body.diagramData || undefined,
      imagePath,
      sourceType: body.sourceType,
    },
    select: DIAGRAM_SAFE_SELECT,
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

  const body = updateDiagramSchema.parse(req.body)

  let imagePath = existing.imagePath
  if (body.imageData) {
    imagePath = await saveImageToDisk(body.imageData, ideaId)
  }

  const diagram = await prisma.ideaDiagram.update({
    where: { id: diagramId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.diagramData !== undefined && { diagramData: body.diagramData }),
      imagePath,
    },
    select: DIAGRAM_SAFE_SELECT,
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

export async function serveDiagramImage(req: AuthRequest, res: Response): Promise<void> {
  const filename = req.params.filename as string
  const diagramDir = path.resolve(env.UPLOAD_DIR, 'diagrams')
  const filePath = path.join(diagramDir, filename)

  try {
    await fs.access(filePath)
    res.sendFile(filePath)
  } catch {
    res.status(404).json({ message: 'Imagen no encontrada' })
  }
}
