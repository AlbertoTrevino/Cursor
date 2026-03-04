import { Router } from 'express'
import * as authCtrl from '../controllers/auth.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { authRateLimit } from '../middleware/rateLimit.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/registro', authRateLimit, asyncHandler(authCtrl.register))
router.post('/login', authRateLimit, asyncHandler(authCtrl.login))
router.post('/refresh', authRateLimit, asyncHandler(authCtrl.refresh))
router.post('/logout', asyncHandler(authCtrl.logout))
router.get('/me', authMiddleware, asyncHandler(authCtrl.me))

export default router
