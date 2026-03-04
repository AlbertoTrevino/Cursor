import { Router } from 'express'
import * as workflowCtrl from '../controllers/workflow.controller.js'
import * as execCtrl from '../controllers/execution.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(authMiddleware)

router.get('/', asyncHandler(workflowCtrl.listWorkflows))
router.post('/', asyncHandler(workflowCtrl.createWorkflow))
router.get('/:id', validateUUID('id'), asyncHandler(workflowCtrl.getWorkflow))
router.put('/:id', validateUUID('id'), asyncHandler(workflowCtrl.updateWorkflow))
router.delete('/:id', validateUUID('id'), asyncHandler(workflowCtrl.deleteWorkflow))
router.put('/:id/canvas', validateUUID('id'), asyncHandler(workflowCtrl.saveCanvas))
router.post('/:id/execute', validateUUID('id'), asyncHandler(execCtrl.startExecution))

export default router
