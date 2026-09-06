import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "./env.js";

export const azureBlobService = env.AZURE_STORAGE_CONNECTION_STRING
  ? BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING)
  : null;

export const azureContainerName = env.AZURE_STORAGE_CONTAINER;