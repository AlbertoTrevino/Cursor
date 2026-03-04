import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../../config/database.js'
import { env } from '../../../config/env.js'
import type { NodeExecutor } from './types.js'

export const excelOutputExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()
  const fileName = (ctx.config?.fileName as string) || 'resultado.xlsx'
  const inputText = Object.values(ctx.inputs).map(String).join('\n\n')

  const uploadsDir = path.resolve(env.UPLOAD_DIR)
  await fs.mkdir(uploadsDir, { recursive: true })

  const filePath = path.join(uploadsDir, `${ctx.executionId}_${fileName}`)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Resultado')

  const lines = inputText.split('\n')
  lines.forEach((line, i) => {
    sheet.getCell(`A${i + 1}`).value = line
  })

  sheet.getColumn('A').width = Math.min(
    100,
    Math.max(20, ...lines.map((l) => l.length)),
  )

  await workbook.xlsx.writeFile(filePath)

  const workflow = await prisma.workflow.findUnique({
    where: { id: ctx.workflowId },
    select: { userId: true },
  })

  const fileStats = await fs.stat(filePath)
  const uploadedFile = await prisma.uploadedFile.create({
    data: {
      userId: workflow!.userId,
      originalName: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      storagePath: filePath,
      sizeBytes: fileStats.size,
    },
  })

  return {
    output: { fileId: uploadedFile.id, fileName },
    durationMs: Date.now() - start,
  }
}
