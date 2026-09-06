export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, message, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(409, message, "CONFLICT");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request") {
    super(400, message, "BAD_REQUEST");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed") {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class PaymentError extends AppError {
  constructor(message = "Payment could not be processed") {
    super(422, message, "PAYMENT_ERROR");
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "External service request failed") {
    super(502, message, "EXTERNAL_SERVICE_ERROR");
  }
}