import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../config/database.js'
import { encryptionService } from '../encryption.service.js'
import { logger } from '../../config/logger.js'

interface AIKeys {
  openaiKey?: string
  anthropicKey?: string
}

async function getUserAIKeys(userId: string): Promise<AIKeys> {
  const keys = await prisma.apiKey.findMany({
    where: { userId, provider: { in: ['openai', 'anthropic'] } },
  })

  const result: AIKeys = {}
  for (const k of keys) {
    const decrypted = encryptionService.decrypt(k.encryptedKey, k.iv, k.authTag)
    if (k.provider === 'openai') result.openaiKey = decrypted
    if (k.provider === 'anthropic') result.anthropicKey = decrypted
  }

  if (!result.openaiKey && process.env.OPENAI_API_KEY) {
    result.openaiKey = process.env.OPENAI_API_KEY
  }
  if (!result.anthropicKey && process.env.ANTHROPIC_API_KEY) {
    result.anthropicKey = process.env.ANTHROPIC_API_KEY
  }

  return result
}

function buildIdeaPrompt(idea: {
  title: string
  description: string
  mode: string
  projectContext?: string | null
  affectedAreas?: string | null
  structuralNotes?: string | null
  clarificationAnswers?: Array<{ question: string; answer: string | null }>
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

async function callGPT(apiKey: string, prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.3,
  })
  return response.choices[0]?.message?.content || ''
}

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{ role: 'user', content: mergePrompt }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function processIdeaWithAI(ideaId: string, userId: string): Promise<{
  claudeResponse: string
  gptResponse: string
  mergedResponse: string
}> {
  const keys = await getUserAIKeys(userId)

  if (!keys.openaiKey && !keys.anthropicKey) {
    throw new Error('No API keys configured. Please add your OpenAI and/or Anthropic API keys in Settings.')
  }

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: {
      questions: { orderBy: { ordering: 'asc' } },
    },
  })

  if (!idea) throw new Error('Idea not found')

  const prompt = buildIdeaPrompt({
    ...idea,
    clarificationAnswers: idea.questions.map(q => ({
      question: q.question,
      answer: q.answer,
    })),
  })

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: 'processing' },
  })

  let gptResponse = ''
  let claudeResponse = ''

  const promises: Promise<void>[] = []

  if (keys.openaiKey) {
    promises.push(
      callGPT(keys.openaiKey, prompt)
        .then(r => { gptResponse = r })
        .catch(err => {
          logger.error({ err }, 'GPT call failed')
          gptResponse = `[GPT Error: ${err.message}]`
        })
    )
  }

  if (keys.anthropicKey) {
    promises.push(
      callClaude(keys.anthropicKey, prompt)
        .then(r => { claudeResponse = r })
        .catch(err => {
          logger.error({ err }, 'Claude call failed')
          claudeResponse = `[Claude Error: ${err.message}]`
        })
    )
  }

  await Promise.all(promises)

  let mergedResponse = ''

  if (gptResponse && claudeResponse && keys.anthropicKey &&
      !gptResponse.startsWith('[GPT Error') && !claudeResponse.startsWith('[Claude Error')) {
    try {
      mergedResponse = await mergeByClaude(keys.anthropicKey, gptResponse, claudeResponse, idea.title)
    } catch (err: any) {
      logger.error({ err }, 'Merge call failed')
      mergedResponse = `[Merge Error: ${err.message}]\n\n--- GPT Response ---\n${gptResponse}\n\n--- Claude Response ---\n${claudeResponse}`
    }
  } else {
    mergedResponse = claudeResponse || gptResponse || 'No AI responses available.'
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      claudeResponse,
      gptResponse,
      mergedResponse,
    },
  })

  return { claudeResponse, gptResponse, mergedResponse }
}
