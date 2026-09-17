import type { QueueOptions } from "bullmq";
import { redis } from "../../config/redis.js";

export const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
};
