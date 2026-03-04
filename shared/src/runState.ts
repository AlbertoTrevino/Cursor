export const RUN_STATES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  READY: 'ready',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WAITING_REVIEW: 'waiting_review',
  WAITING_DATA_EDIT: 'waiting_data_edit',
} as const

export type RunState = (typeof RUN_STATES)[keyof typeof RUN_STATES]
