import ExcelJS from 'exceljs'
import { prisma } from '../../../config/database.js'
import type { NodeExecutor } from './types.js'

export const excelInputExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()
  const fileId = ctx.config?.fileId as string | undefined

  if (!fileId) {
    throw new Error('No se ha configurado un archivo Excel para este nodo de entrada.')
  }

  const workflow = await prisma.workflow.findUnique({ where: { id: ctx.workflowId }, select: { userId: true } })
  if (!workflow) throw new Error('Workflow no encontrado')
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId: workflow.userId } })
  if (!file) {
    throw new Error('Archivo no encontrado o no pertenece al usuario.')
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file.storagePath)

  const sheetName = ctx.config?.sheetName as string | undefined
  const sheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0]

  if (!sheet) {
    throw new Error('No se encontró la hoja de cálculo.')
  }

  // Extract data as array of rows (each row = array of cell values)
  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]
    // ExcelJS row.values has index 0 = undefined, shift to remove it
    rows.push(values.slice(1))
  })

  if (rows.length === 0) {
    return { output: 'La hoja de cálculo está vacía.', durationMs: Date.now() - start }
  }

  // Convert to readable text format (tab-separated, like a table)
  const textOutput = rows
    .map((row) => row.map((cell) => formatCell(cell)).join('\t'))
    .join('\n')

  return {
    output: textOutput,
    durationMs: Date.now() - start,
  }
}

function formatCell(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
    // ExcelJS formula result
    return String((value as Record<string, unknown>).result ?? '')
  }
  return String(value)
}
