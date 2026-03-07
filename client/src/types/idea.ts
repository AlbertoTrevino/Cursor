export interface IdeaAttachment {
  id: string
  ideaId: string
  originalName: string
  mimeType: string
  storagePath: string
  sizeBytes: number
  createdAt: string
}

export interface IdeaDiagram {
  id: string
  ideaId: string
  name: string
  diagramData: any | null
  imageData: string | null
  storagePath: string | null
  sourceType: 'excalidraw' | 'upload'
  createdAt: string
  updatedAt: string
}

export interface IdeaClarification {
  id: string
  ideaId: string
  question: string
  answer: string | null
  ordering: number
  createdAt: string
}

export type IdeaMode = 'simple' | 'complex'
export type IdeaStatus = 'draft' | 'clarifying' | 'processing' | 'done'

export interface IdeaSummary {
  id: string
  title: string
  description: string
  mode: IdeaMode
  status: IdeaStatus
  recommendation: string | null
  createdAt: string
  updatedAt: string
  _count: {
    attachments: number
    diagrams: number
  }
}

export interface Idea {
  id: string
  userId: string
  title: string
  description: string
  mode: IdeaMode
  status: IdeaStatus
  claudeResponse: string | null
  gptResponse: string | null
  mergedResponse: string | null
  handoffText: string | null
  recommendation: string | null
  recommendReason: string | null
  projectContext: string | null
  affectedAreas: string | null
  structuralNotes: string | null
  createdAt: string
  updatedAt: string
  attachments: IdeaAttachment[]
  diagrams: IdeaDiagram[]
  questions: IdeaClarification[]
}

export interface ProcessResult {
  claudeResponse: string
  gptResponse: string
  mergedResponse: string
  recommendation: 'plan' | 'agent'
  recommendReason: string
  handoffText: string
}

export interface ClarificationResult {
  needsClarification: boolean
  questions: Array<{ question: string; ordering: number }>
}

export interface NamingSuggestion {
  original: string
  suggested: string
  reason: string
}

export interface FabricConnection {
  id: string
  userId: string
  name: string
  config: Record<string, string>
  status: 'connected' | 'disconnected' | 'error'
  lastError: string | null
  createdAt: string
  updatedAt: string
}
