import { Worker } from "bullmq";
import { redis } from "../src/config/redis.js";
import { logger } from "../src/lib/logger.js";
import { sendEmail } from "../src/utils/mailer.js";

export const emailWorker = new Worker("emails", async (job) => {
  if (job.name !== "email:send") return;
  const { to, subject, text } = job.data as { to?: string; subject?: string; text?: string };
  if (!to || !subject || !text) throw new Error("Email job requires to, subject, and text");
  await sendEmail(to, subject, text);
  logger.info({ to, subject }, "Email sent");
}, { connection: redis });

emailWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Email job failed"));