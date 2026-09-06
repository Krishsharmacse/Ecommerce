import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { azureBlobService, azureContainerName } from "../config/azure.js";
import { env } from "../config/env.js";
import { BadRequestError } from "../lib/errors.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class StorageService {
  async upload(buffer: Buffer, mimeType: string): Promise<{ url: string; key: string }> {
    if (!allowedTypes.has(mimeType)) throw new BadRequestError("Only JPEG, PNG, and WebP images are supported");
    if (buffer.byteLength > 5 * 1024 * 1024) throw new BadRequestError("Image must be 5MB or smaller");
    const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
    const key = `${crypto.randomUUID()}.${extension}`;
    if (azureBlobService) {
      const container = azureBlobService.getContainerClient(azureContainerName);
      await container.createIfNotExists();
      const blob = container.getBlockBlobClient(key);
      await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimeType } });
      return { url: blob.url, key };
    }
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
    const filePath = path.join(env.UPLOAD_DIR, key);
    await fs.writeFile(filePath, buffer);
    return { url: `/uploads/${key}`, key };
  }
}