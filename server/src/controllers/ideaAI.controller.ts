import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { analyzeForClarification } from '../services/idea/clarification.service.js'
import { processIdeaWithAI } from '../services/idea/ai.service.js'
import { generateRecommendation } from '../services/idea/recommendation.service.js'
import { generateHandoff } from '../services/idea/handoff.service.js'
import { analyzeNaming } from '../services/idea/naming.service.js'
import { AppError } from '../utils/AppError.js'
import { prisma } from '../config/database.js'
import { logger } from '../config/logger.js'

export async function checkClarification(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  try {
    const result = await analyzeForClarification(ideaId, userId)
    res.json(result)
  } catch (err: any) {
    logger.error({ err }, 'Error en análisis de aclaración')
    throw new AppError('Error al analizar la idea con AI', 502)
  }
}

export async function processIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  // Verify ownership
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  try {
    const aiResult = await processIdeaWithAI(ideaId, userId)
    const recommendation = await generateRecommendation(ideaId, userId)
    const handoff = await generateHandoff(ideaId, userId)

    res.json({
      claudeResponse: aiResult.claudeResponse,
      gptResponse: aiResult.gptResponse,
      mergedResponse: aiResult.mergedResponse,
      recommendation: recommendation.recommendation,
      recommendReason: recommendation.reason,
      handoffText: handoff,
    })
  } catch (err: any) {
    // Reset status so the user can retry
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'draft' },
    }).catch(() => {})

    logger.error({ err, ideaId }, 'Error al procesar idea con AI')

    if (err.message?.includes('API key') || err.message?.includes('keys')) {
      throw AppError.badRequest(err.message)
    }
    throw new AppError(`Error al procesar con AI: ${err.message}`, 502)
  }
}

export async function regenerateHandoff(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  // Verify ownership
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  try {
    const handoff = await generateHandoff(ideaId, userId)
    res.json({ handoffText: handoff })
  } catch (err: any) {
    throw new AppError('Error al regenerar handoff', 502)
  }
}

export async function checkNaming(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const { text } = req.body

  if (!text || typeof text !== 'string') {
    throw AppError.badRequest('Texto requerido para análisis de nombres')
  }

  try {
    const suggestions = await analyzeNaming(text, userId)
    res.json({ suggestions })
  } catch (err: any) {
    logger.error({ err }, 'Error en análisis de nombres')
    throw new AppError('Error al analizar nombres con AI', 502)
  }
}

export async function getVersions(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const versions = await prisma.ideaVersion.findMany({
    where: { ideaId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      recommendation: true,
      createdAt: true,
    },
  })

  res.json(versions)
}

export async function getVersion(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string
  const versionId = req.params.versionId as string

  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw AppError.notFound('Idea no encontrada')

  const version = await prisma.ideaVersion.findFirst({
    where: { id: versionId, ideaId },
  })
  if (!version) throw AppError.notFound('Versión no encontrada')

  res.json(version)
}
