import type { NodeExecutor } from './types.js'

export const textInputExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()
  const text = (ctx.config?.text as string) || ''
  return {
    output: text,
    durationMs: Date.now() - start,
  }
}
