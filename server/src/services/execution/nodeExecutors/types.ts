export interface NodeExecutorContext {
  nodeId: string
  nodeType: string
  subType: string | null
  label: string
  config: Record<string, unknown>
  currentPrompt: string | null
  provider: string | null
  apiKeyId: string | null
  inputs: Record<string, unknown>
  executionId: string
  workflowId: string
}

export interface NodeExecutorResult {
  output: unknown
  durationMs: number
}

export type NodeExecutor = (ctx: NodeExecutorContext) => Promise<NodeExecutorResult>
