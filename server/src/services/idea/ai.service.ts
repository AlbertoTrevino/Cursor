import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../../config/database.js'
import { logger } from '../../config/logger.js'
import { getUserAIKeys } from './keys.service.js'
import { AI_MODELS } from '../../config/ai.js'

function buildIdeaPrompt(idea: {
  title: string
  description: string
  mode: string
  projectContext?: string | null
  affectedAreas?: string | null
  structuralNotes?: string | null
  clarificationAnswers?: Array<{ question: string; answer: string | null }>
  attachmentSummaries?: string[]
}): string {
  let prompt = `You are an expert project analyst helping structure a software idea into a clear, actionable description for AI coding assistants (like Cursor).

## The Idea
**Title:** ${idea.title}
**Type:** ${idea.mode === 'complex' ? 'Big/Complex Change' : 'Simple Change'}
**Description:** ${idea.description}`

  if (idea.projectContext) {
    prompt += `\n**Project Context:** ${idea.projectContext}`
  }
  if (idea.affectedAreas) {
    prompt += `\n**Affected Areas:** ${idea.affectedAreas}`
  }
  if (idea.structuralNotes) {
    prompt += `\n**Structural Notes:** ${idea.structuralNotes}`
  }

  if (idea.clarificationAnswers?.length) {
    prompt += '\n\n## Clarification Answers'
    for (const qa of idea.clarificationAnswers) {
      if (qa.answer) {
        prompt += `\n- **Q:** ${qa.question}\n  **A:** ${qa.answer}`
      }
    }
  }

  if (idea.attachmentSummaries?.length) {
    prompt += '\n\n## Attached File Contents'
    for (const summary of idea.attachmentSummaries) {
      prompt += `\n${summary}`
    }
  }

  prompt += `

## Your Task
Analyze this idea and produce a structured analysis covering:
1. **Goal** - What this aims to achieve
2. **Problem it solves** - Why this is needed
3. **Key components/modules** - What needs to be built
4. **Technical considerations** - Architecture, patterns, dependencies
5. **Potential challenges** - Edge cases, risks
6. **Suggested implementation approach** - Step-by-step plan
7. **Naming conventions** - Suggest consistent names for components, variables, and modules

Be specific, practical, and actionable. Do not invent requirements—only analyze what's given.`

  return prompt
}

async function readTextAttachment(storagePath: string, mimeType: string): Promise<string | null> {
  try {
    const absPath = path.resolve(storagePath)
    const textMimes = ['text/csv', 'text/plain', 'application/json', 'application/xml', 'text/xml', 'application/sql']
    if (textMimes.includes(mimeType)) {
      const content = await fs.readFile(absPath, 'utf-8')
      return content.slice(0, 5000)
    }
  } catch {
    // File unreadable, skip
  }
  return null
}

async function getAttachmentSummaries(ideaId: string): Promise<string[]> {
  const attachments = await prisma.ideaAttachment.findMany({ where: { ideaId } })
  const summaries: string[] = []

  for (const att of attachments) {
    const content = await readTextAttachment(att.storagePath, att.mimeType)
    if (content) {
      summaries.push(`### File: ${att.originalName} (${att.mimeType})\n\`\`\`\n${content}\n\`\`\``)
    } else {
      summaries.push(`### File: ${att.originalName} (${att.mimeType}, ${att.sizeBytes} bytes) — binary, not included inline`)
    }
  }

  return summaries
}

async function getDiagramDescriptions(ideaId: string): Promise<string[]> {
  const diagrams = await prisma.ideaDiagram.findMany({ where: { ideaId } })
  const descriptions: string[] = []

  for (const d of diagrams) {
    if (d.diagramData && typeof d.diagramData === 'object') {
      const data = d.diagramData as { elements?: Array<{ type: string; text?: string }> }
      if (data.elements?.length) {
        const textElements = data.elements
          .filter(e => e.text)
          .map(e => `[${e.type}] ${e.text}`)
          .join(', ')
        if (textElements) {
          descriptions.push(`### Diagram: ${d.name}\nElements: ${textElements}`)
        }
      }
    }
  }

  return descriptions
}

async function callGPT(apiKey: string, prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: AI_MODELS.GPT,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.3,
  })
  return response.choices[0]?.message?.content || ''
}

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: AI_MODELS.CLAUDE,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

async function mergeByClaude(apiKey: string, gptResponse: string, claudeResponse: string, ideaTitle: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey })

  const mergePrompt = `You are a senior technical architect. You have received two independent analyses of the same software idea titled "${ideaTitle}".

## Analysis from GPT:
${gptResponse}

## Analysis from Claude:
${claudeResponse}

## Your Task
Synthesize both analyses into a single, comprehensive, holistic analysis. For each section:
- Combine insights from both
- Resolve any contradictions (explain if you do)
- Keep the best ideas from each
- Maintain a clear, actionable structure

Produce the final merged analysis in this format:

### Goal
### Problem It Solves
### Key Components/Modules
### Technical Considerations
### Potential Challenges & Edge Cases
### Implementation Plan (step by step)
### Naming Conventions
### Additional Insights (anything one analysis caught that the other missed)`

  const response = await anthropic.messages.create({
    model: AI_MODELS.CLAUDE,
    max_tokens: 6000,
    messages: [{ role: 'user', content: mergePrompt }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

async function saveVersion(ideaId: string): Promise<void> {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } })
  if (!idea || !idea.mergedResponse) return

  const lastVersion = await prisma.ideaVersion.findFirst({
    where: { ideaId },
    orderBy: { version: 'desc' },
  })

  await prisma.ideaVersion.create({
    data: {
      ideaId,
      version: (lastVersion?.version ?? 0) + 1,
      claudeResponse: idea.claudeResponse,
      gptResponse: idea.gptResponse,
      mergedResponse: idea.mergedResponse,
      handoffText: idea.handoffText,
      recommendation: idea.recommendation,
      recommendReason: idea.recommendReason,
    },
  })
}

export async function processIdeaWithAI(ideaId: string, userId: string): Promise<{
  claudeResponse: string
  gptResponse: string
  mergedResponse: string
}> {
  const keys = await getUserAIKeys(userId)

  if (!keys.openaiKey && !keys.anthropicKey) {
    throw new Error('No hay API keys configuradas. Agrega tus keys de OpenAI o Anthropic en Configuración.')
  }

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: {
      questions: { orderBy: { ordering: 'asc' } },
    },
  })

  if (!idea) throw new Error('Idea no encontrada')

  // Save previous version before overwriting
  await saveVersion(ideaId)

  const attachmentSummaries = await getAttachmentSummaries(ideaId)
  const diagramDescriptions = await getDiagramDescriptions(ideaId)

  const prompt = buildIdeaPrompt({
    ...idea,
    clarificationAnswers: idea.questions.map(q => ({
      question: q.question,
      answer: q.answer,
    })),
    attachmentSummaries: [...attachmentSummaries, ...diagramDescriptions],
  })

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: 'processing' },
  })

  let gptResponse = ''
  let claudeResponse = ''

  try {
    const promises: Promise<void>[] = []

    if (keys.openaiKey) {
      promises.push(
        callGPT(keys.openaiKey, prompt)
          .then(r => { gptResponse = r })
          .catch(err => {
            logger.error({ err }, 'GPT call failed')
            gptResponse = `[Error GPT: ${err.message}]`
          })
      )
    }

    if (keys.anthropicKey) {
      promises.push(
        callClaude(keys.anthropicKey, prompt)
          .then(r => { claudeResponse = r })
          .catch(err => {
            logger.error({ err }, 'Claude call failed')
            claudeResponse = `[Error Claude: ${err.message}]`
          })
      )
    }

    await Promise.all(promises)

    let mergedResponse = ''

    if (gptResponse && claudeResponse && keys.anthropicKey &&
        !gptResponse.startsWith('[Error GPT') && !claudeResponse.startsWith('[Error Claude')) {
      try {
        mergedResponse = await mergeByClaude(keys.anthropicKey, gptResponse, claudeResponse, idea.title)
      } catch (err: any) {
        logger.error({ err }, 'Merge call failed')
        mergedResponse = `[Error al combinar: ${err.message}]\n\n--- Respuesta GPT ---\n${gptResponse}\n\n--- Respuesta Claude ---\n${claudeResponse}`
      }
    } else {
      mergedResponse = claudeResponse || gptResponse || 'No hay respuestas de AI disponibles.'
    }

    await prisma.idea.update({
      where: { id: ideaId },
      data: { claudeResponse, gptResponse, mergedResponse },
    })

    return { claudeResponse, gptResponse, mergedResponse }
  } catch (err) {
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'draft' },
    })
    throw err
  }
}
