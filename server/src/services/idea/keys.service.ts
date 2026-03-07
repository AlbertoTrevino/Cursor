import { prisma } from '../../config/database.js'
import { encryptionService } from '../encryption.service.js'

export interface AIKeys {
  openaiKey?: string
  anthropicKey?: string
}

export async function getUserAIKeys(userId: string): Promise<AIKeys> {
  const keys = await prisma.apiKey.findMany({
    where: { userId, provider: { in: ['openai', 'anthropic'] } },
  })

  const result: AIKeys = {}
  for (const k of keys) {
    const decrypted = encryptionService.decrypt(k.encryptedKey, k.iv, k.authTag)
    if (k.provider === 'openai') result.openaiKey = decrypted
    if (k.provider === 'anthropic') result.anthropicKey = decrypted
  }

  if (!result.openaiKey && process.env.OPENAI_API_KEY) {
    result.openaiKey = process.env.OPENAI_API_KEY
  }
  if (!result.anthropicKey && process.env.ANTHROPIC_API_KEY) {
    result.anthropicKey = process.env.ANTHROPIC_API_KEY
  }

  return result
}

export async function getAnyAIKey(userId: string): Promise<{ provider: 'openai' | 'anthropic'; key: string }> {
  const allKeys = await getUserAIKeys(userId)

  if (allKeys.anthropicKey) return { provider: 'anthropic', key: allKeys.anthropicKey }
  if (allKeys.openaiKey) return { provider: 'openai', key: allKeys.openaiKey }

  throw new Error('No hay API keys configuradas. Agrega tus keys de OpenAI o Anthropic en Configuración.')
}
