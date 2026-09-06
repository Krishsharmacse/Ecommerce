import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../lib/errors.js";
import { StorageService } from "../../services/storage.service.js";

const storageService = new StorageService();
export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> { try { if (!req.file) throw new BadRequestError("An image file is required"); res.status(201).json({ success: true, file: await storageService.upload(req.file.buffer, req.file.mimetype) }); } catch (error) { next(error); } }