import { describe, it, expect, vi } from 'vitest'
import { validateUUID } from '../validateParams.middleware.js'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes(params: Record<string, string>) {
  const req = { params } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

describe('validateUUID middleware', () => {
  it('calls next for a valid UUID', () => {
    const middleware = validateUUID('id')
    const { req, res, next } = mockReqRes({ id: '550e8400-e29b-41d4-a716-446655440000' })
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 400 for an invalid UUID', () => {
    const middleware = validateUUID('id')
    const { req, res, next } = mockReqRes({ id: 'not-a-uuid' })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates multiple params', () => {
    const middleware = validateUUID('id', 'fileId')
    const { req, res, next } = mockReqRes({
      id: '550e8400-e29b-41d4-a716-446655440000',
      fileId: 'bad',
    })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
