import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env.js'

const uploadDir = path.resolve(env.UPLOAD_DIR, 'ideas')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
  'application/sql',
  'application/x-sqlite3',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/vnd.jgraph.mxfile',
]

const ALLOWED_EXTENSIONS = [
  '.xlsx', '.xls', '.csv', '.pdf', '.txt', '.json', '.xml', '.sql',
  '.sqlite', '.db', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.drawio', '.md', '.yaml', '.yml', '.toml',
]

export const ideaUpload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.originalname} (${file.mimetype}). Formatos aceptados: imágenes, Excel, CSV, PDF, JSON, SQL, SVG, DrawIO.`))
    }
  },
})
