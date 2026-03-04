import fs from 'fs/promises'
import pdf from 'pdf-parse'
import { prisma } from '../../../config/database.js'
import type { NodeExecutor } from './types.js'

export const pdfInputExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()
  const fileId = ctx.config?.fileId as string | undefined

  if (!fileId) {
    throw new Error('No se ha configurado un archivo PDF para este nodo de entrada.')
  }

  const workflow = await prisma.workflow.findUnique({ where: { id: ctx.workflowId }, select: { userId: true } })
  if (!workflow) throw new Error('Workflow no encontrado')
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId: workflow.userId } })
  if (!file) {
    throw new Error('Archivo no encontrado o no pertenece al usuario.')
  }

  const buffer = await fs.readFile(file.storagePath)
  const data = await pdf(buffer)

  const text = data.text?.trim()
  if (!text) {
    return { output: 'El PDF no contiene texto extraíble.', durationMs: Date.now() - start }
  }

  return {
    output: text,
    durationMs: Date.now() - start,
  }
}
