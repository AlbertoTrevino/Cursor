import type { NodeExecutor } from './types.js'

/**
 * Review executor — pass-through node.
 * Simply forwards the input as output. The engine will handle
 * pausing at this node for user review.
 */
export const reviewExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()

  // Grab the first input (output from the upstream CuboAI)
  const inputKeys = Object.keys(ctx.inputs)
  const output = inputKeys.length > 0 ? ctx.inputs[inputKeys[0]] : null

  return {
    output,
    durationMs: Date.now() - start,
  }
}
