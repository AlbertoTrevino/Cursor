import api from './axios'
import type { ExecutionMode } from '@shared/executionModes'

export interface StartExecutionResponse {
  executionId: string
}

export interface ExecutionResponse {
  id: string
  workflowId: string
  status: string
  mode: string
  startedAt: string
  completedAt: string | null
}

export const executionApi = {
  start: (workflowId: string, mode: ExecutionMode) =>
    api.post<StartExecutionResponse>(`/workflows/${workflowId}/execute`, { mode }),

  resume: (executionId: string) =>
    api.post(`/executions/${executionId}/resume`),

  step: (executionId: string) =>
    api.post(`/executions/${executionId}/step`),

  stop: (executionId: string) =>
    api.post(`/executions/${executionId}/stop`),

  reviewAction: (executionId: string, nodeId: string, action: 'continue' | 'promptFeedback' | 'dataFeedback', feedbackText?: string) =>
    api.post(`/executions/${executionId}/review-action`, { nodeId, action, feedbackText }),

  get: (executionId: string) =>
    api.get<ExecutionResponse>(`/executions/${executionId}`),
}
