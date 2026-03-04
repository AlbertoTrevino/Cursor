import { ExecutionEngine } from './engine.js'

const engines = new Map<string, ExecutionEngine>()

export function registerEngine(executionId: string, engine: ExecutionEngine): void {
  engines.set(executionId, engine)
}

export function getEngine(executionId: string): ExecutionEngine | undefined {
  return engines.get(executionId)
}

export function removeEngine(executionId: string): void {
  engines.delete(executionId)
}

export function getAllEngineIds(): string[] {
  return Array.from(engines.keys())
}
