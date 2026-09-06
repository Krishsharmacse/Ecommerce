import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { sendEmail } from "../services/mail.service.js";
import { logger } from "../lib/logger.js";

export const emailWorker = new Worker("emails", async (job) => {
  if (job.name !== "email:send") return;
  const data = job.data as { to: string; subject: string; text: string };
  await sendEmail(data.to, data.subject, data.text);
  logger.info({ to: data.to, subject: data.subject }, "Email sent");
}, { connection: redis });

emailWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Email job failed"));