import { createReadStream } from 'fs'
import OpenAI from 'openai'
import { prisma } from '../../../config/database.js'
import { encryptionService } from '../../encryption.service.js'
import type { NodeExecutor } from './types.js'

export const audioInputExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()
  const fileId = ctx.config?.fileId as string | undefined

  if (!fileId) {
    throw new Error('No se ha configurado un archivo de audio para este nodo de entrada.')
  }

  const workflow = await prisma.workflow.findUnique({ where: { id: ctx.workflowId }, select: { userId: true } })
  if (!workflow) throw new Error('Workflow no encontrado')
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId: workflow.userId } })
  if (!file) {
    throw new Error('Archivo no encontrado o no pertenece al usuario.')
  }

  const openaiKey = await prisma.apiKey.findFirst({
    where: { userId: workflow.userId, provider: 'openai' },
  })
  if (!openaiKey) {
    throw new Error('Se requiere una API key de OpenAI para transcribir audio. Agrega una en Configuración.')
  }

  const key = encryptionService.decrypt(openaiKey.encryptedKey, openaiKey.iv, openaiKey.authTag)
  const client = new OpenAI({ apiKey: key })

  const language = (ctx.config?.language as string) || undefined

  const transcription = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file: createReadStream(file.storagePath),
    ...(language ? { language } : {}),
  })

  const text = transcription.text?.trim()
  if (!text) {
    return { output: 'No se pudo extraer texto del audio.', durationMs: Date.now() - start }
  }

  return {
    output: text,
    durationMs: Date.now() - start,
  }
}
