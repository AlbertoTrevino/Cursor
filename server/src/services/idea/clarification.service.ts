import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../config/database.js'
import { encryptionService } from '../encryption.service.js'
import { logger } from '../../config/logger.js'

async function getAnyAIKey(userId: string): Promise<{ provider: 'openai' | 'anthropic'; key: string }> {
  const keys = await prisma.apiKey.findMany({
    where: { userId, provider: { in: ['openai', 'anthropic'] } },
    orderBy: { createdAt: 'desc' },
  })

  for (const k of keys) {
    const decrypted = encryptionService.decrypt(k.encryptedKey, k.iv, k.authTag)
    return { provider: k.provider as 'openai' | 'anthropic', key: decrypted }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY }
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', key: process.env.OPENAI_API_KEY }
  }

  throw new Error('No API keys available for clarification analysis')
}

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
  if (!idea) throw new Error('Idea not found')

  const { provider, key } = await getAnyAIKey(userId)
  const prompt = buildClarificationPrompt(idea)

  let responseText = ''

  try {
    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      responseText = block.type === 'text' ? block.text : ''
    } else {
      const openai = new OpenAI({ apiKey: key })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.2,
      })
      responseText = response.choices[0]?.message?.content || ''
    }
  } catch (err: any) {
    logger.error({ err }, 'Clarification analysis failed')
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
      await prisma.ideaClarification.deleteMany({ where: { ideaId } })

      for (const q of questions) {
        await prisma.ideaClarification.create({
          data: {
            ideaId,
            question: q.question,
            ordering: q.ordering ?? 0,
          },
        })
      }

      await prisma.idea.update({
        where: { id: ideaId },
        data: { status: 'clarifying' },
      })
    }

    return { needsClarification: questions.length > 0, questions }
  } catch (err) {
    logger.error({ err, response: trimmed }, 'Failed to parse clarification response')
    return { needsClarification: false, questions: [] }
  }
}
