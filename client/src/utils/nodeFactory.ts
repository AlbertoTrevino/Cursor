import { type Node } from '@xyflow/react'
import { NODE_TYPES } from '@shared/nodeTypes'
import { INPUT_SUB_TYPES } from '@shared/inputSubTypes'
import { OUTPUT_SUB_TYPES } from '@shared/outputSubTypes'

let nodeCounter = 0

function nextId() {
  nodeCounter++
  return `node_${Date.now()}_${nodeCounter}`
}

export function createInputNode(position: { x: number; y: number }): Node {
  return {
    id: nextId(),
    type: 'inputNode',
    position,
    data: {
      nodeType: NODE_TYPES.INPUT,
      label: 'Nueva Entrada',
      subType: INPUT_SUB_TYPES.TEXT,
      config: { text: '' },
      runState: 'idle',
      output: null,
    },
  }
}

export function createCuboAINode(position: { x: number; y: number }): Node {
  return {
    id: nextId(),
    type: 'cuboAINode',
    position,
    data: {
      nodeType: NODE_TYPES.CUBO_AI,
      label: 'Nuevo Cubo AI',
      prompt: '',
      provider: 'openai',
      apiKeyId: null,
      runState: 'idle',
      output: null,
    },
  }
}

export function createOutputNode(position: { x: number; y: number }): Node {
  return {
    id: nextId(),
    type: 'outputNode',
    position,
    data: {
      nodeType: NODE_TYPES.OUTPUT,
      label: 'Nueva Salida',
      subType: OUTPUT_SUB_TYPES.EXCEL,
      config: { fileName: 'resultado.xlsx' },
      runState: 'idle',
      output: null,
    },
  }
}

export function createReviewNode(position: { x: number; y: number }): Node {
  return {
    id: nextId(),
    type: 'reviewNode',
    position,
    data: {
      nodeType: NODE_TYPES.REVIEW,
      label: 'Revisión',
      config: {},
      runState: 'idle',
      output: null,
    },
  }
}

export function createPromptHistoryNode(position: { x: number; y: number }): Node {
  return {
    id: nextId(),
    type: 'promptHistoryNode',
    position,
    data: {
      nodeType: NODE_TYPES.PROMPT_HISTORY,
      label: 'Historial Prompt',
      config: {},
      runState: 'idle',
      output: null,
    },
  }
}

export function getNextNodePosition(existingNodes: Node[]): { x: number; y: number } {
  if (existingNodes.length === 0) return { x: 250, y: 150 }
  const maxX = Math.max(...existingNodes.map((n) => n.position.x))
  const avgY =
    existingNodes.reduce((sum, n) => sum + n.position.y, 0) / existingNodes.length
  return { x: maxX + 280, y: avgY }
}
