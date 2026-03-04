import { createServer } from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { initSocket } from './config/socket.js'
import { prisma } from './config/database.js'
import { logger } from './config/logger.js'
import { getAllEngineIds } from './services/execution/engineRegistry.js'

const httpServer = createServer(app)
initSocket(httpServer)

async function markRunningExecutionsFailed() {
  const updated = await prisma.execution.updateMany({
    where: { status: { in: ['running', 'paused'] } },
    data: { status: 'failed', completedAt: new Date(), errorMessage: 'Servidor reiniciado' },
  })
  if (updated.count > 0) {
    logger.info({ count: updated.count }, 'Ejecuciones huérfanas marcadas como fallidas')
  }
}

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Apagando servidor...')

  const runningIds = getAllEngineIds()
  if (runningIds.length > 0) {
    await prisma.execution.updateMany({
      where: { id: { in: runningIds } },
      data: { status: 'failed', completedAt: new Date(), errorMessage: 'Servidor apagado' },
    })
    logger.info({ count: runningIds.length }, 'Ejecuciones activas marcadas como fallidas')
  }

  httpServer.close()
  await prisma.$disconnect()
  process.exit(0)
}

async function main() {
  await prisma.$connect()
  logger.info('Base de datos conectada')

  await markRunningExecutionsFailed()

  httpServer.listen(env.PORT, () => {
    logger.info(`Servidor Cubo AI corriendo en http://localhost:${env.PORT}`)
  })
}

main().catch((err) => {
  logger.fatal({ err }, 'Error al iniciar el servidor')
  process.exit(1)
})

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection')
  process.exit(1)
})
