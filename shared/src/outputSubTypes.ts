export const OUTPUT_SUB_TYPES = {
  EXCEL: 'excel',
  EMAIL: 'email',
  SQL: 'sql',
} as const

export type OutputSubType = (typeof OUTPUT_SUB_TYPES)[keyof typeof OUTPUT_SUB_TYPES]
