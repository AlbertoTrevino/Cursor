import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validateUUID } from '../middleware/validateParams.middleware.js'
import { upload } from '../middleware/upload.middleware.js'
import * as uploadCtrl from '../controllers/upload.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(authMiddleware)

router.post('/upload', upload.single('file'), asyncHandler(uploadCtrl.uploadFile))
router.get('/', asyncHandler(uploadCtrl.listFiles))
router.get('/:fileId/download', validateUUID('fileId'), asyncHandler(uploadCtrl.downloadFile))
router.delete('/:fileId', validateUUID('fileId'), asyncHandler(uploadCtrl.deleteFile))

export default router
