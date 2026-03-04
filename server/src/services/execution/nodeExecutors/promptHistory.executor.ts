import type { NodeExecutor } from './types.js'
import { prisma } from '../../../config/database.js'

/**
 * Prompt History executor.
 * Receives feedback text, stores it, looks up the upstream CuboAI prompt,
 * and calls the LLM to suggest a modified prompt.
 */
export const promptHistoryExecutor: NodeExecutor = async (ctx) => {
  const start = Date.now()

  // Get feedback text from input (sent by Review node)
  const inputKeys = Object.keys(ctx.inputs)
  const feedbackText = inputKeys.length > 0
    ? (typeof ctx.inputs[inputKeys[0]] === 'string' ? ctx.inputs[inputKeys[0]] as string : JSON.stringify(ctx.inputs[inputKeys[0]]))
    : ''

  // Store feedback in DB
  if (feedbackText) {
    await prisma.feedback.create({
      data: {
        executionId: ctx.executionId,
        nodeId: ctx.nodeId,
        feedbackText,
      },
    })
  }

  // Get all previous feedback for this node
  const allFeedback = await prisma.feedback.findMany({
    where: { nodeId: ctx.nodeId },
    orderBy: { createdAt: 'asc' },
  })

  // Get the upstream CuboAI prompt from config
  const currentPrompt = (ctx.config as Record<string, unknown>)?.cuboPrompt as string || ''

  return {
    output: {
      feedbackText,
      feedbackCount: allFeedback.length,
      feedbackHistory: allFeedback.map((f) => ({
        message: f.feedbackText,
        createdAt: f.createdAt,
      })),
      currentPrompt,
      suggestedPrompt: null, // Will be generated on-demand via config panel action
    },
    durationMs: Date.now() - start,
  }
}
