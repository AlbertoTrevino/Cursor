import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import * as fabricCtrl from '../controllers/fabric.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(fabricCtrl.listConnections))
router.post('/', asyncHandler(fabricCtrl.createConnection))
router.get('/:id', validateUUID('id'), asyncHandler(fabricCtrl.getConnection))
router.put('/:id', validateUUID('id'), asyncHandler(fabricCtrl.updateConnection))
router.delete('/:id', validateUUID('id'), asyncHandler(fabricCtrl.deleteConnection))
router.post('/:id/test', validateUUID('id'), asyncHandler(fabricCtrl.testConnection))

export default router
