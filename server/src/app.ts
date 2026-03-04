import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import workflowRoutes from './routes/workflow.routes.js'
import apiKeyRoutes from './routes/apiKey.routes.js'
import executionRoutes from './routes/execution.routes.js'
import uploadRoutes from './routes/upload.routes.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/api-keys', apiKeyRoutes)
app.use('/api/executions', executionRoutes)
app.use('/api/files', uploadRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorMiddleware)

export default app
