import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import { ideaUpload } from '../middleware/ideaUpload.middleware.js'
import * as ideaCtrl from '../controllers/idea.controller.js'
import * as ideaAICtrl from '../controllers/ideaAI.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(authMiddleware)

// Ideas CRUD
router.get('/', asyncHandler(ideaCtrl.listIdeas))
router.post('/', asyncHandler(ideaCtrl.createIdea))
router.get('/:id', validateUUID('id'), asyncHandler(ideaCtrl.getIdea))
router.put('/:id', validateUUID('id'), asyncHandler(ideaCtrl.updateIdea))
router.delete('/:id', validateUUID('id'), asyncHandler(ideaCtrl.deleteIdea))

// Clarifications
router.post('/:id/clarify', validateUUID('id'), asyncHandler(ideaAICtrl.checkClarification))
router.post('/:id/answer', validateUUID('id'), asyncHandler(ideaCtrl.answerClarifications))

// AI Processing
router.post('/:id/process', validateUUID('id'), asyncHandler(ideaAICtrl.processIdea))
router.post('/:id/handoff', validateUUID('id'), asyncHandler(ideaAICtrl.regenerateHandoff))

// Naming analysis
router.post('/naming/check', asyncHandler(ideaAICtrl.checkNaming))

// Attachments
router.post('/:id/attachments', validateUUID('id'), ideaUpload.single('file'), asyncHandler(ideaCtrl.uploadIdeaAttachment))
router.delete('/:id/attachments/:attachmentId', validateUUID('id'), asyncHandler(ideaCtrl.deleteIdeaAttachment))

// Diagrams
router.post('/:id/diagrams', validateUUID('id'), asyncHandler(ideaCtrl.saveDiagram))
router.put('/:id/diagrams/:diagramId', validateUUID('id'), asyncHandler(ideaCtrl.updateDiagram))
router.delete('/:id/diagrams/:diagramId', validateUUID('id'), asyncHandler(ideaCtrl.deleteDiagram))

export default router
