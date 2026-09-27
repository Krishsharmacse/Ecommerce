import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "../lib/logger.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinary_name || process.env.cloudinary_cloud_name;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinary_key || process.env.CLOUDINARY_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_secret || process.env.CLOUDINARY_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  logger.info({ cloudName }, "Cloudinary configured successfully");
} else {
  logger.warn({ hasCloudName: !!cloudName, hasApiKey: !!apiKey, hasApiSecret: !!apiSecret }, "Cloudinary credentials incomplete");
}

export { cloudinary };

/**
 * Uploads a buffer directly to Cloudinary
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = "shopvault/products"
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          logger.error({ err: error }, "Cloudinary upload error");
          return reject(error || new Error("Failed to upload image to Cloudinary"));
        }
        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}
