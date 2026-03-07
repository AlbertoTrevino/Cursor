import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { analyzeForClarification } from '../services/idea/clarification.service.js'
import { processIdeaWithAI } from '../services/idea/ai.service.js'
import { generateRecommendation } from '../services/idea/recommendation.service.js'
import { generateHandoff } from '../services/idea/handoff.service.js'
import { analyzeNaming } from '../services/idea/naming.service.js'
import { AppError } from '../utils/AppError.js'

export async function checkClarification(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  try {
    const result = await analyzeForClarification(ideaId, userId)
    res.json(result)
  } catch (err: any) {
    throw AppError.badRequest(err.message)
  }
}

export async function processIdea(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const ideaId = req.params.id as string

  try {
    const aiResult = await processIdeaWithAI(ideaId, userId)
    const recommendation = await generateRecommendation(ideaId)
    const handoff = await generateHandoff(ideaId)

    res.json({
      claudeResponse: aiResult.claudeResponse,
      gptResponse: aiResult.gptResponse,
      mergedResponse: aiResult.mergedResponse,
      recommendation: recommendation.recommendation,
      recommendReason: recommendation.reason,
      handoffText: handoff,
    })
  } catch (err: any) {
    throw AppError.badRequest(err.message)
  }
}

export async function regenerateHandoff(req: AuthRequest, res: Response): Promise<void> {
  const ideaId = req.params.id as string

  try {
    const handoff = await generateHandoff(ideaId)
    res.json({ handoffText: handoff })
  } catch (err: any) {
    throw AppError.badRequest(err.message)
  }
}

export async function checkNaming(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const { text } = req.body

  if (!text || typeof text !== 'string') {
    throw AppError.badRequest('Text is required')
  }

  try {
    const suggestions = await analyzeNaming(text, userId)
    res.json({ suggestions })
  } catch (err: any) {
    throw AppError.badRequest(err.message)
  }
}
