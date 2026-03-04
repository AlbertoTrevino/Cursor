export const EXECUTION_MODES = {
  PLAY: 'play',
  AUTORUN: 'autorun',
  STEP: 'step',
} as const

export type ExecutionMode = (typeof EXECUTION_MODES)[keyof typeof EXECUTION_MODES]
