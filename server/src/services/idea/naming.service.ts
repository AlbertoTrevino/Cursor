import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
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

  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY }
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', key: process.env.OPENAI_API_KEY }

  throw new Error('No API keys available')
}

export interface NamingSuggestion {
  original: string
  suggested: string
  reason: string
}

export async function analyzeNaming(text: string, userId: string): Promise<NamingSuggestion[]> {
  const { provider, key } = await getAnyAIKey(userId)

  const prompt = `You are a naming conventions expert. Analyze the following text for inconsistent or unclear naming of components, modules, screens, variables, or concepts.

Text to analyze:
${text}

If you find inconsistencies (e.g., "page" and "screen" used interchangeably for the same concept, or unclear names), suggest corrections.

Respond ONLY with a JSON array (no extra text):
[
  {"original": "the term used", "suggested": "the consistent term to use", "reason": "why this is better"}
]

If naming is already consistent, respond with an empty array: []`

  try {
    let responseText = ''

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      responseText = block.type === 'text' ? block.text : '[]'
    } else {
      const openai = new OpenAI({ apiKey: key })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1,
      })
      responseText = response.choices[0]?.message?.content || '[]'
    }

    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    return JSON.parse(jsonMatch[0]) as NamingSuggestion[]
  } catch (err) {
    logger.error({ err }, 'Naming analysis failed')
    return []
  }
}
