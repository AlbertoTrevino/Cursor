import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'

const TEST_KEY = crypto.randomBytes(32).toString('hex')

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.JWT_SECRET = 'a'.repeat(32)
  process.env.JWT_REFRESH_SECRET = 'b'.repeat(32)
})

describe('EncryptionService', () => {
  it('encrypts and decrypts a string correctly', async () => {
    const { encryptionService } = await import('../encryption.service.js')
    const plaintext = 'sk-test-api-key-1234567890'
    const { encryptedData, iv, authTag } = encryptionService.encrypt(plaintext)

    expect(encryptedData).not.toBe(plaintext)
    expect(iv).toHaveLength(24)
    expect(authTag).toHaveLength(32)

    const decrypted = encryptionService.decrypt(encryptedData, iv, authTag)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const { encryptionService } = await import('../encryption.service.js')
    const plaintext = 'sk-repeat-test'
    const result1 = encryptionService.encrypt(plaintext)
    const result2 = encryptionService.encrypt(plaintext)

    expect(result1.iv).not.toBe(result2.iv)
    expect(result1.encryptedData).not.toBe(result2.encryptedData)
  })

  it('fails decryption with wrong authTag', async () => {
    const { encryptionService } = await import('../encryption.service.js')
    const { encryptedData, iv } = encryptionService.encrypt('secret')
    const wrongTag = crypto.randomBytes(16).toString('hex')

    expect(() => encryptionService.decrypt(encryptedData, iv, wrongTag)).toThrow()
  })

  it('masks API keys correctly', async () => {
    const { encryptionService } = await import('../encryption.service.js')

    expect(encryptionService.mask('sk-proj-abcdefghijk')).toBe('sk-p...hijk')
    expect(encryptionService.mask('short')).toBe('****')
    expect(encryptionService.mask('12345678')).toBe('****')
    expect(encryptionService.mask('123456789')).toBe('1234...6789')
  })
})
