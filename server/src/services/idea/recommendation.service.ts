import { prisma } from '../../config/database.js'

interface RecommendationResult {
  recommendation: 'plan' | 'agent'
  reason: string
}

export async function generateRecommendation(ideaId: string, userId: string): Promise<RecommendationResult> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: { attachments: true, diagrams: true },
  })

  if (!idea) throw new Error('Idea no encontrada')

  let agentScore = 0
  const reasons: string[] = []

  if (idea.mode === 'complex') {
    agentScore += 3
    reasons.push('Tipo de cambio complejo seleccionado')
  }

  if (idea.description.length > 500) {
    agentScore += 1
    reasons.push('Descripción detallada (probablemente multi-paso)')
  }

  if (idea.projectContext) {
    agentScore += 1
    reasons.push('Contexto de proyecto proporcionado')
  }

  if (idea.affectedAreas) {
    const areas = idea.affectedAreas.split(/[,;\n]/).filter(Boolean)
    if (areas.length > 2) {
      agentScore += 2
      reasons.push(`Múltiples áreas afectadas (${areas.length})`)
    }
  }

  if (idea.structuralNotes) {
    agentScore += 1
    reasons.push('Notas estructurales indican cambios de arquitectura')
  }

  if (idea.attachments.length > 0) {
    agentScore += 1
    reasons.push('Archivos adjuntos presentes')
  }

  if (idea.diagrams.length > 0) {
    agentScore += 1
    reasons.push('Diagramas adjuntos (contexto visual complejo)')
  }

  const mergedText = (idea.mergedResponse || idea.claudeResponse || idea.gptResponse || '').toLowerCase()
  const multiFileIndicators = ['multiple files', 'several components', 'new module', 'refactor', 'migration', 'restructure']
  for (const indicator of multiFileIndicators) {
    if (mergedText.includes(indicator)) {
      agentScore += 1
      reasons.push(`Análisis AI menciona "${indicator}"`)
      break
    }
  }

  const isAgent = agentScore >= 3
  const recommendation: 'plan' | 'agent' = isAgent ? 'agent' : 'plan'

  const reason = isAgent
    ? `Recomendado: Agent mode (score: ${agentScore}/10). ${reasons.join('. ')}.`
    : `Recomendado: Plan mode (score: ${agentScore}/10). Cambio enfocado. ${reasons.length ? reasons.join('. ') + '.' : 'Cambio simple.'}`

  await prisma.idea.update({
    where: { id: ideaId },
    data: { recommendation, recommendReason: reason },
  })

  return { recommendation, reason }
}
