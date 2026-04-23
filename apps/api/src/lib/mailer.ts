import type { Transporter } from "nodemailer";

import { createTransport } from "nodemailer";

import { env } from "../config/env.js";
import { createLogger } from "./logger.js";

type SendEmailInput = {
  html: string;
  subject: string;
  text?: string;
  to: string;
};

const log = createLogger("mailer");

let transport: null | Transporter = null;

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { html, subject, text, to } = input;

  await getTransport().sendMail({
    from: env.emailFrom,
    html,
    subject,
    text,
    to,
  });
  log.info({ to }, "Email sent");
}

function getTransport(): Transporter {
  if (transport) return transport;
  if (!env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP credentials are not configured (SMTP_USER / SMTP_PASS)");
  }
  transport = createTransport({
    auth: { pass: env.smtpPass, user: env.smtpUser },
    host: env.smtpHost,
    port: env.smtpPort,
  });
  return transport;
}
