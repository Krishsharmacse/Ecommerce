import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, code: "VALIDATION_ERROR", issues: error.issues });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    return;
  }

  logger.error({ err: error }, "Unhandled request error");
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
};