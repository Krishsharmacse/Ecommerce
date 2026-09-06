import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const emailQueue = new Queue("emails", queueOptions);

export function enqueueEmail(data: { to: string; subject: string; text: string }, jobId: string) {
  return emailQueue.add("email:send", data, { jobId: `email:${jobId}` });
}