import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../config/database.js'
import { logger } from '../../config/logger.js'
import { getAnyAIKey } from './keys.service.js'
import { AI_MODELS } from '../../config/ai.js'

function buildClarificationPrompt(idea: {
  title: string
  description: string
  mode: string
  projectContext?: string | null
  affectedAreas?: string | null
  structuralNotes?: string | null
}): string {
  return `You are an expert requirements analyst. A user has described a software idea. Your job is to determine if the description is clear enough to act on, or if clarification is needed.

## The Idea
**Title:** ${idea.title}
**Type:** ${idea.mode === 'complex' ? 'Big/Complex Change' : 'Simple Change'}
**Description:** ${idea.description}
${idea.projectContext ? `**Project Context:** ${idea.projectContext}` : ''}
${idea.affectedAreas ? `**Affected Areas:** ${idea.affectedAreas}` : ''}
${idea.structuralNotes ? `**Structural Notes:** ${idea.structuralNotes}` : ''}

## Your Task
Analyze whether this idea description is clear enough for a developer to start implementing. Check for:
1. Is the goal clear?
2. Are the expected inputs/outputs defined?
3. Are there ambiguities that could lead to wrong implementation?
4. For complex changes: is the scope defined?

If the description IS clear enough, respond with exactly:
CLEAR

If clarification IS needed, respond with a JSON array of questions (max 5) in this exact format:
[
  {"question": "Your question here?", "ordering": 0},
  {"question": "Your second question?", "ordering": 1}
]

Only ask questions that materially affect implementation. Prefer yes/no or multiple-choice questions when possible.
Do NOT ask about stack/tech choices unless they affect the answer.
Respond ONLY with "CLEAR" or the JSON array—nothing else.`
}

export async function analyzeForClarification(ideaId: string, userId: string): Promise<{
  needsClarification: boolean
  questions: Array<{ question: string; ordering: number }>
}> {
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } })
  if (!idea) throw new Error('Idea no encontrada')

  const { provider, key } = await getAnyAIKey(userId)
  const prompt = buildClarificationPrompt(idea)

  let responseText = ''

  try {
    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const response = await anthropic.messages.create({
        model: AI_MODELS.CLAUDE,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      responseText = block.type === 'text' ? block.text : ''
    } else {
      const openai = new OpenAI({ apiKey: key })
      const response = await openai.chat.completions.create({
        model: AI_MODELS.GPT,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.2,
      })
      responseText = response.choices[0]?.message?.content || ''
    }
  } catch (err: any) {
    logger.error({ err }, 'Análisis de aclaración falló')
    return { needsClarification: false, questions: [] }
  }

  const trimmed = responseText.trim()

  if (trimmed === 'CLEAR') {
    return { needsClarification: false, questions: [] }
  }

  try {
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { needsClarification: false, questions: [] }
    }

    const questions = JSON.parse(jsonMatch[0]) as Array<{ question: string; ordering: number }>

    if (questions.length > 0) {
      await prisma.$transaction([
        prisma.ideaClarification.deleteMany({ where: { ideaId } }),
        ...questions.map(q =>
          prisma.ideaClarification.create({
            data: { ideaId, question: q.question, ordering: q.ordering ?? 0 },
          })
        ),
        prisma.idea.update({ where: { id: ideaId }, data: { status: 'clarifying' } }),
      ])
    }

    return { needsClarification: questions.length > 0, questions }
  } catch (err) {
    logger.error({ err, response: trimmed }, 'Error al parsear respuesta de aclaración')
    return { needsClarification: false, questions: [] }
  }
}
