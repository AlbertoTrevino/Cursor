import crypto from 'crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16

class EncryptionService {
  private key: Buffer

  constructor() {
    this.key = Buffer.from(env.ENCRYPTION_KEY, 'hex')
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    }
  }

  encrypt(plaintext: string): {
    encryptedData: string
    iv: string
    authTag: string
  } {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag,
    }
  }

  decrypt(encryptedData: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(iv, 'hex'),
      { authTagLength: AUTH_TAG_LENGTH }
    )
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  /** Create a masked version for display: "sk-pr...x9Qf" */
  mask(key: string): string {
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '...' + key.slice(-4)
  }
}

export const encryptionService = new EncryptionService()
