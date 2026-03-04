export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404)
  }

  static badRequest(message = 'Datos inválidos') {
    return new AppError(message, 400)
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401)
  }

  static conflict(message = 'Conflicto') {
    return new AppError(message, 409)
  }
}
