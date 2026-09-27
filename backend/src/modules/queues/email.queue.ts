import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";
import { sendEmail } from "../../services/mail.service.js";
import { logger } from "../../lib/logger.js";

export const emailQueue = new Queue("emails", queueOptions);

export async function enqueueEmail(data: { to: string; subject: string; text: string; html?: string }, jobId: string) {
  const safeJobId = `email_${jobId.replace(/[:]/g, "_")}`;
  try {
    return await emailQueue.add("email:send", data, { jobId: safeJobId });
  } catch (error) {
    logger.warn({ err: error, to: data.to, subject: data.subject }, "Failed to enqueue email to BullMQ, falling back to direct send");
    try {
      await sendEmail(data.to, data.subject, data.text, data.html);
      logger.info({ to: data.to, subject: data.subject }, "Email sent via direct fallback");
    } catch (fallbackError) {
      logger.error({ err: fallbackError, to: data.to, subject: data.subject }, "Direct email send fallback also failed");
      throw fallbackError;
    }
  }
}