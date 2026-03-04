export const INPUT_SUB_TYPES = {
  SQL: 'sql',
  EXCEL: 'excel',
  PDF: 'pdf',
  AUDIO: 'audio',
  TEXT: 'text',
} as const

export type InputSubType = (typeof INPUT_SUB_TYPES)[keyof typeof INPUT_SUB_TYPES]
