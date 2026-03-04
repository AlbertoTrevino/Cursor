import { describe, it, expect } from 'vitest'
import { AppError } from '../AppError.js'

describe('AppError', () => {
  it('creates error with status code', () => {
    const err = new AppError('Not found', 404)
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
    expect(err.isOperational).toBe(true)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it('creates not found error via static method', () => {
    const err = AppError.notFound('Flujo no encontrado')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Flujo no encontrado')
  })

  it('creates bad request error via static method', () => {
    const err = AppError.badRequest()
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Datos inválidos')
  })

  it('creates unauthorized error', () => {
    const err = AppError.unauthorized()
    expect(err.statusCode).toBe(401)
  })

  it('creates conflict error', () => {
    const err = AppError.conflict('Ya existe')
    expect(err.statusCode).toBe(409)
    expect(err.message).toBe('Ya existe')
  })
})
