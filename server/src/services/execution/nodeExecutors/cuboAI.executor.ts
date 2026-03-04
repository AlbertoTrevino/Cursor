import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../config/database.js'
import { encryptionService } from '../../encryption.service.js'
import type { NodeExecutor } from './types.js'

async function decryptApiKey(apiKeyId: string, workflowId: string): Promise<{ key: string; provider: string }> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId }, select: { userId: true } })
  if (!workflow) throw new Error('Workflow no encontrado')
  const apiKey = await prisma.apiKey.findFirst({ where: { id: apiKeyId, userId: workflow.userId } })
  if (!apiKey) throw new Error('API key no encontrada o no pertenece al usuario')
  const key = encryptionService.decrypt(apiKey.encryptedKey, apiKey.iv, apiKey.authTag)
  return { key, provider: apiKey.provider }
}

function buildInputText(inputs: Record<string, unknown>): string {
  const entries = Object.entries(inputs)
  if (entries.length === 0) return ''
  if (entries.length === 1) return String(entries[0][1])
  return entries
    .map(([key, val], i) => `{{input_${i}}} (${key}): ${String(val)}`)
    .join('\n\n')
}

export const cuboAIExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()

  if (!ctx.apiKeyId) {
    throw new Error(`Cubo "${ctx.label}" no tiene API key configurada`)
  }
  if (!ctx.currentPrompt) {
    throw new Error(`Cubo "${ctx.label}" no tiene prompt configurado`)
  }

  const { key, provider } = await decryptApiKey(ctx.apiKeyId, ctx.workflowId)
  const inputText = buildInputText(ctx.inputs)

  // Build messages
  let systemContent = ctx.currentPrompt
  let userContent = inputText || 'No hay datos de entrada.'

  // Inject feedback context if available
  const feedbackInputs = (ctx.config as Record<string, unknown>)?.feedbackInputs as Record<string, unknown> | undefined
  if (feedbackInputs && Object.keys(feedbackInputs).length > 0) {
    const feedbackEntries = Object.values(feedbackInputs)
    for (const fb of feedbackEntries) {
      if (fb && typeof fb === 'object' && 'suggestedPrompt' in (fb as Record<string, unknown>)) {
        const suggested = (fb as Record<string, unknown>).suggestedPrompt as string
        if (suggested) {
          // Use the suggested prompt instead of the original
          systemContent = suggested
        }
      }
    }
  }

  let responseText: string

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      max_tokens: 4096,
    })
    responseText = completion.choices[0]?.message?.content || ''
  } else if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemContent,
      messages: [{ role: 'user', content: userContent }],
    })
    responseText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } else {
    throw new Error(`Proveedor desconocido: ${provider}`)
  }

  return {
    output: responseText,
    durationMs: Date.now() - start,
  }
}
