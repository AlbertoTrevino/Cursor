export const EXECUTION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

export type ExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS]

export const WORKFLOW_EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type WorkflowExecutionStatus =
  (typeof WORKFLOW_EXECUTION_STATUS)[keyof typeof WORKFLOW_EXECUTION_STATUS]
