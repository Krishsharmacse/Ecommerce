import nodemailer from "nodemailer";
import { mailConfig } from "../config/mail.js";

const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.secure,
  auth: mailConfig.auth
});

export function sendEmail(to: string, subject: string, text: string) {
  return transporter.sendMail({ from: mailConfig.from, to, subject, text });
}