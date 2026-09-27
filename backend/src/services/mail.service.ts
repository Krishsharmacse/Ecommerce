import nodemailer from "nodemailer";
import { mailConfig } from "../config/mail.js";
import { logger } from "../lib/logger.js";

const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.secure,
  auth: mailConfig.auth
});

void transporter.verify()
  .then(() => logger.info({ host: mailConfig.host, port: mailConfig.port }, "SMTP connection verified"))
  .catch((error: unknown) => logger.error({ err: error, host: mailConfig.host, port: mailConfig.port }, "SMTP connection failed"));

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  try {
    const info = await transporter.sendMail({
      from: mailConfig.from,
      to,
      subject,
      text,
      ...(html ? { html } : {})
    });
    logger.info({ to, subject, messageId: info.messageId }, "Email sent successfully");
    return info;
  } catch (error) {
    logger.error({ err: error, to, subject }, "Failed to send email");
    throw error;
  }
}