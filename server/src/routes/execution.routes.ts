import { Router } from 'express'
import * as execCtrl from '../controllers/execution.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(authMiddleware)

router.get('/:id', validateUUID('id'), asyncHandler(execCtrl.getExecution))
router.post('/:id/resume', validateUUID('id'), asyncHandler(execCtrl.resumeExecution))
router.post('/:id/step', validateUUID('id'), asyncHandler(execCtrl.stepExecution))
router.post('/:id/stop', validateUUID('id'), asyncHandler(execCtrl.stopExecution))
router.post('/:id/review-action', validateUUID('id'), asyncHandler(execCtrl.reviewAction))

export default router
