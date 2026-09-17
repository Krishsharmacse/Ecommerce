import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const webhookRetryQueue = new Queue("webhook-retry", {
  ...queueOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: "exponential", delay: 2000 },
    removeOnComplete: 50,
    removeOnFail:     200,
  },
});

/**
 * Enqueue a Razorpay webhook event for reprocessing.
 * Call this when webhook processing fails the first time.
 */
export function enqueueWebhookRetry(eventId: string): Promise<unknown> {
  return webhookRetryQueue.add("process", { eventId }, { jobId: `webhook:${eventId}` });
}
