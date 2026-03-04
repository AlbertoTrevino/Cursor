import type { NodeExecutor } from './types.js'
import { textInputExecutor } from './textInput.executor.js'
import { excelInputExecutor } from './excelInput.executor.js'
import { pdfInputExecutor } from './pdfInput.executor.js'
import { audioInputExecutor } from './audioInput.executor.js'
import { cuboAIExecutor } from './cuboAI.executor.js'
import { reviewExecutor } from './review.executor.js'
import { promptHistoryExecutor } from './promptHistory.executor.js'
import { excelOutputExecutor } from './excelOutput.executor.js'

const executorMap: Record<string, NodeExecutor> = {
  'input:text': textInputExecutor,
  'input:excel': excelInputExecutor,
  'input:sql': textInputExecutor,   // TODO: SQL input executor
  'input:pdf': pdfInputExecutor,
  'input:audio': audioInputExecutor,
  cuboAI: cuboAIExecutor,
  review: reviewExecutor,
  promptHistory: promptHistoryExecutor,
  'output:excel': excelOutputExecutor,
  'output:email': excelOutputExecutor, // TODO: Email output executor
  'output:sql': excelOutputExecutor,   // TODO: SQL output executor
}

export function getExecutor(nodeType: string, subType?: string | null): NodeExecutor {
  if (subType) {
    const key = `${nodeType}:${subType}`
    if (executorMap[key]) return executorMap[key]
  }
  if (executorMap[nodeType]) return executorMap[nodeType]
  throw new Error(`No hay executor para tipo: ${nodeType}${subType ? ':' + subType : ''}`)
}

export type { NodeExecutor, NodeExecutorContext, NodeExecutorResult } from './types.js'
