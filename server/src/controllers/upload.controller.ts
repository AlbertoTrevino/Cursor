import type { Response } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../config/database.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const file = req.file

  if (!file) {
    res.status(400).json({ message: 'No se envió ningún archivo' })
    return
  }

  const record = await prisma.uploadedFile.create({
    data: {
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      storagePath: file.path,
      sizeBytes: file.size,
    },
  })

  res.status(201).json({
    id: record.id,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
  })
}

export async function downloadFile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const fileId = req.params.fileId as string

  const record = await prisma.uploadedFile.findFirst({
    where: { id: fileId, userId },
  })

  if (!record) {
    res.status(404).json({ message: 'Archivo no encontrado' })
    return
  }

  const absPath = path.resolve(record.storagePath)
  try {
    await fs.access(absPath)
  } catch {
    res.status(404).json({ message: 'Archivo no encontrado en disco' })
    return
  }

  const sanitized = record.originalName.replace(/[^\w.\-() ]/g, '_')
  const encoded = encodeURIComponent(record.originalName)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  )
  res.setHeader('Content-Type', record.mimeType)
  res.sendFile(absPath)
}

export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string
  const fileId = req.params.fileId as string

  const record = await prisma.uploadedFile.findFirst({
    where: { id: fileId, userId },
  })

  if (!record) {
    res.status(404).json({ message: 'Archivo no encontrado' })
    return
  }

  const absPath = path.resolve(record.storagePath)
  try {
    await fs.unlink(absPath)
  } catch {
    // File may already be deleted from disk
  }

  // Delete from DB
  await prisma.uploadedFile.delete({ where: { id: fileId } })

  res.json({ message: 'Archivo eliminado' })
}

export async function listFiles(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId as string

  const files = await prisma.uploadedFile.findMany({
    where: { userId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(files)
}
