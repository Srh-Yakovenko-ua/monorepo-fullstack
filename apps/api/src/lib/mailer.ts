import type { Transporter } from "nodemailer";

import { createTransport } from "nodemailer";
import { Resend } from "resend";

import { env } from "../config/env.js";
import { createLogger } from "./logger.js";

type SendEmailInput = {
  html: string;
  idempotencyKey?: string;
  subject: string;
  text?: string;
  to: string;
};

const log = createLogger("mailer");

let mailtrapTransport: null | Transporter = null;
let resendClient: null | Resend = null;

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { html, idempotencyKey, subject, text, to } = input;

  if (env.emailProvider === "resend") {
    const { error } = await getResendClient().emails.send({
      from: env.emailFrom,
      html,
      subject,
      to: [to],
      ...(text !== undefined && { text }),
      ...(idempotencyKey !== undefined && { idempotencyKey }),
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    log.info({ to }, "Email sent via Resend");
    return;
  }

  await getMailtrapTransport().sendMail({
    from: env.emailFrom,
    html,
    subject,
    text,
    to,
  });
  log.info({ to }, "Email sent via Mailtrap");
}

function getMailtrapTransport(): Transporter {
  if (mailtrapTransport) return mailtrapTransport;
  if (!env.mailtrapSmtpUser || !env.mailtrapSmtpPass) {
    throw new Error("Mailtrap SMTP credentials are not configured");
  }
  mailtrapTransport = createTransport({
    auth: { pass: env.mailtrapSmtpPass, user: env.mailtrapSmtpUser },
    host: env.mailtrapSmtpHost,
    port: env.mailtrapSmtpPort,
  });
  return mailtrapTransport;
}

function getResendClient(): Resend {
  if (resendClient) return resendClient;
  if (!env.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  resendClient = new Resend(env.resendApiKey);
  return resendClient;
}
