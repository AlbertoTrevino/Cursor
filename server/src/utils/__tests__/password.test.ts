import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../password.js'

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const password = 'MySecurePass123!'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash).toMatch(/^\$2[aby]\$/)

    const isValid = await comparePassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const isValid = await comparePassword('wrong-password', hash)
    expect(isValid).toBe(false)
  })

  it('generates different hashes for same password', async () => {
    const password = 'same-password'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    expect(hash1).not.toBe(hash2)
  })
})
