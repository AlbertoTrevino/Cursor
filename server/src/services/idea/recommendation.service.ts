import { prisma } from '../../config/database.js'

interface RecommendationResult {
  recommendation: 'plan' | 'agent'
  reason: string
}

export async function generateRecommendation(ideaId: string): Promise<RecommendationResult> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId },
    include: {
      attachments: true,
      diagrams: true,
    },
  })

  if (!idea) throw new Error('Idea not found')

  let agentScore = 0
  let reasons: string[] = []

  if (idea.mode === 'complex') {
    agentScore += 3
    reasons.push('Complex/big change type selected')
  }

  if (idea.description.length > 500) {
    agentScore += 1
    reasons.push('Detailed description (likely multi-step)')
  }

  if (idea.projectContext) {
    agentScore += 1
    reasons.push('Project context provided (structural awareness needed)')
  }

  if (idea.affectedAreas) {
    const areas = idea.affectedAreas.split(/[,;\n]/).filter(Boolean)
    if (areas.length > 2) {
      agentScore += 2
      reasons.push(`Multiple affected areas (${areas.length})`)
    }
  }

  if (idea.structuralNotes) {
    agentScore += 1
    reasons.push('Structural notes indicate architectural changes')
  }

  if (idea.attachments.length > 0) {
    agentScore += 1
    reasons.push('File attachments present (agent can process files)')
  }

  if (idea.diagrams.length > 0) {
    agentScore += 1
    reasons.push('Diagrams attached (complex visual context)')
  }

  const mergedText = (idea.mergedResponse || idea.claudeResponse || idea.gptResponse || '').toLowerCase()
  const multiFileIndicators = ['multiple files', 'several components', 'new module', 'refactor', 'migration', 'restructure']
  for (const indicator of multiFileIndicators) {
    if (mergedText.includes(indicator)) {
      agentScore += 1
      reasons.push(`AI analysis mentions "${indicator}"`)
      break
    }
  }

  const isAgent = agentScore >= 3
  const recommendation: 'plan' | 'agent' = isAgent ? 'agent' : 'plan'

  const reason = isAgent
    ? `Recommended Agent mode (score: ${agentScore}/10). ${reasons.join('. ')}.`
    : `Recommended Plan mode (score: ${agentScore}/10). This appears to be a focused change. ${reasons.length ? reasons.join('. ') + '.' : 'Simple, single-scope change.'}`

  await prisma.idea.update({
    where: { id: ideaId },
    data: { recommendation, recommendReason: reason },
  })

  return { recommendation, reason }
}
