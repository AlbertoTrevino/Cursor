export const SOCKET_EVENTS = {
  // Server → Client
  EXECUTION_STARTED: 'execution:started',
  NODE_STATUS_CHANGE: 'node:status-change',
  NODE_OUTPUT_READY: 'node:output-ready',
  NODE_ERROR: 'node:error',
  EXECUTION_COMPLETED: 'execution:completed',
  EXECUTION_LOG: 'execution:log',
  NODE_RUN_STATE_CHANGE: 'node:run-state-change',
  EXECUTION_PAUSED: 'execution:paused',
  EDGE_ACTIVE: 'edge:active',

  REVIEW_WAITING: 'review:waiting',
  PROMPT_SUGGESTION_READY: 'prompt:suggestion-ready',
  DATA_EDIT_SIGNAL: 'data:edit-signal',

  // Client → Server
  JOIN_WORKFLOW: 'join:workflow',
  LEAVE_WORKFLOW: 'leave:workflow',
  EXECUTION_RESUME: 'execution:resume',
  EXECUTION_STEP: 'execution:step',
  EXECUTION_STOP: 'execution:stop',
  REVIEW_ACTION: 'review:action',
} as const
