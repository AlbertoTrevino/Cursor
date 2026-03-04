import { Router } from 'express'
import * as apiKeyCtrl from '../controllers/apiKey.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(authMiddleware)

router.get('/', asyncHandler(apiKeyCtrl.listApiKeys))
router.post('/', asyncHandler(apiKeyCtrl.createApiKey))
router.put('/:id', validateUUID('id'), asyncHandler(apiKeyCtrl.updateApiKey))
router.delete('/:id', validateUUID('id'), asyncHandler(apiKeyCtrl.deleteApiKey))

export default router
