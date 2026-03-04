export const NODE_TYPES = {
  INPUT: 'input',
  CUBO_AI: 'cuboAI',
  OUTPUT: 'output',
  REVIEW: 'review',
  PROMPT_HISTORY: 'promptHistory',
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]
