export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
} as const

export type AIProvider = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS]

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'ChatGPT (OpenAI)',
  anthropic: 'Claude (Anthropic)',
}
