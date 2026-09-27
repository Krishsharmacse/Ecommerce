import crypto from "node:crypto";
import { azureBlobService, azureContainerName } from "../config/azure.js";
import { uploadBufferToCloudinary } from "../config/cloudinary.js";
import { BadRequestError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export class StorageService {
  async upload(buffer: Buffer, _claimedMimeType?: string): Promise<{ url: string; key: string }> {
    if (buffer.byteLength > 10 * 1024 * 1024) throw new BadRequestError("Image must be 10MB or smaller");

    // Scan for dangerous script / SVG / XML payloads
    const headerString = buffer.subarray(0, 1024).toString("utf8").toLowerCase();
    if (headerString.includes("<svg") || headerString.includes("<?xml") || headerString.includes("<html") || headerString.includes("<script")) {
      throw new BadRequestError("SVG and executable script uploads are strictly prohibited");
    }

    // Inspect magic bytes
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime || !allowedTypes.has(detectedMime)) {
      throw new BadRequestError("Invalid file content: only genuine JPEG, PNG, WebP, and GIF images are permitted");
    }

    // Primary: Cloudinary Cloud Storage
    const hasCloudinaryKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinary_key || process.env.CLOUDINARY_KEY;
    const hasCloudinarySecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_secret || process.env.CLOUDINARY_SECRET;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinary_name || process.env.cloudinary_cloud_name;

    if (hasCloudinaryKey && hasCloudinarySecret) {
      if (!cloudName) {
        throw new BadRequestError("Cloudinary cloud name is missing. Please set CLOUDINARY_CLOUD_NAME in your backend .env file.");
      }
      try {
        const result = await uploadBufferToCloudinary(buffer, "shopvault/products");
        logger.info({ url: result.url, publicId: result.publicId }, "Uploaded image to Cloudinary successfully");
        return { url: result.url, key: result.publicId };
      } catch (err: any) {
        logger.error({ err }, "Cloudinary upload failed");
        throw new BadRequestError(err?.message || "Failed to upload image to Cloudinary");
      }
    }

    // Secondary: Azure Blob Storage
    if (azureBlobService) {
      const extension = detectedMime === "image/jpeg" ? "jpg" : detectedMime.split("/")[1];
      const key = `${crypto.randomUUID()}.${extension}`;
      const container = azureBlobService.getContainerClient(azureContainerName);
      await container.createIfNotExists();
      const blob = container.getBlockBlobClient(key);
      await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: detectedMime } });
      return { url: blob.url, key };
    }

    throw new BadRequestError("No cloud storage configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env");
  }
}