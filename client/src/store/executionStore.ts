import { create } from 'zustand'
import type { RunState } from '@shared/runState'
import type { ExecutionMode } from '@shared/executionModes'

interface LogEntry {
  timestamp: string
  message: string
  level: 'info' | 'warn' | 'error'
  nodeId?: string
}

interface ExecutionState {
  executionId: string | null
  isRunning: boolean
  isPaused: boolean
  executionMode: ExecutionMode | null
  pausedAtNodeId: string | null
  pauseReason: 'review' | 'step' | null

  nodeRunStates: Record<string, RunState>
  nodeOutputs: Record<string, unknown>
  activeEdges: Set<string>
  logs: LogEntry[]

  // Actions
  startExecution: (executionId: string, mode: ExecutionMode) => void
  setNodeRunState: (nodeId: string, state: RunState) => void
  setNodeOutput: (nodeId: string, output: unknown) => void
  setActiveEdge: (edgeId: string, active: boolean) => void
  setPaused: (nodeId: string | null, reason: 'review' | 'step' | null) => void
  appendLog: (entry: LogEntry) => void
  completeExecution: () => void
  reset: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  executionId: null,
  isRunning: false,
  isPaused: false,
  executionMode: null,
  pausedAtNodeId: null,
  pauseReason: null,

  nodeRunStates: {},
  nodeOutputs: {},
  activeEdges: new Set(),
  logs: [],

  startExecution: (executionId, mode) =>
    set({
      executionId,
      isRunning: true,
      isPaused: false,
      executionMode: mode,
      pausedAtNodeId: null,
      pauseReason: null,
      nodeRunStates: {},
      nodeOutputs: {},
      activeEdges: new Set(),
      logs: [],
    }),

  setNodeRunState: (nodeId, state) =>
    set((prev) => ({
      nodeRunStates: { ...prev.nodeRunStates, [nodeId]: state },
    })),

  setNodeOutput: (nodeId, output) =>
    set((prev) => ({
      nodeOutputs: { ...prev.nodeOutputs, [nodeId]: output },
    })),

  setActiveEdge: (edgeId, active) =>
    set((prev) => {
      const next = new Set(prev.activeEdges)
      if (active) next.add(edgeId)
      else next.delete(edgeId)
      return { activeEdges: next }
    }),

  setPaused: (nodeId, reason) =>
    set({
      isPaused: nodeId !== null,
      pausedAtNodeId: nodeId,
      pauseReason: reason,
    }),

  appendLog: (entry) =>
    set((prev) => ({
      logs: [...prev.logs, entry],
    })),

  completeExecution: () =>
    set({ isRunning: false, isPaused: false, pausedAtNodeId: null, pauseReason: null }),

  reset: () =>
    set({
      executionId: null,
      isRunning: false,
      isPaused: false,
      executionMode: null,
      pausedAtNodeId: null,
      pauseReason: null,
      nodeRunStates: {},
      nodeOutputs: {},
      activeEdges: new Set(),
      logs: [],
    }),
}))
