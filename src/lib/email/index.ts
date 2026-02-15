import { Resend } from "resend";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { getEmailConfig, type EmailConfig } from "./config";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template: ReactElement;
  from?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

async function sendViaResend(
  config: EmailConfig,
  options: {
    from: string;
    to: string[];
    subject: string;
    react: ReactElement;
  },
): Promise<SendEmailResult> {
  if (!config.resendApiKey) {
    return { success: false, error: "Resend API key is not configured" };
  }
  const resend = new Resend(config.resendApiKey);
  try {
    const { data, error } = await resend.emails.send(options);
    if (error) {
      console.error("[Email:Resend] Send failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email:Resend] Unexpected error:", message);
    return { success: false, error: message };
  }
}

async function sendViaSmtp(
  config: EmailConfig,
  options: {
    from: string;
    to: string[];
    subject: string;
    react: ReactElement;
  },
): Promise<SendEmailResult> {
  if (!config.smtpHost) {
    return { success: false, error: "SMTP host is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined,
  });

  try {
    const html = await render(options.react);
    const info = await transporter.sendMail({
      from: options.from,
      to: options.to.join(", "),
      subject: options.subject,
      html,
    });
    return { success: true, id: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email:SMTP] Send failed:", message);
    return { success: false, error: message };
  }
}

export async function sendEmail({
  to,
  subject,
  template,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const config = await getEmailConfig();
    const fromAddress = from ?? config.fromAddress;
    const toArray = Array.isArray(to) ? to : [to];

    if (config.provider === "smtp") {
      return sendViaSmtp(config, {
        from: fromAddress,
        to: toArray,
        subject,
        react: template,
      });
    }
    return sendViaResend(config, {
      from: fromAddress,
      to: toArray,
      subject,
      react: template,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Config error:", message);
    return { success: false, error: message };
  }
}

export async function sendBulkEmail(
  emails: SendEmailOptions[],
): Promise<void> {
  const config = await getEmailConfig();

  if (config.provider === "smtp") {
    // SMTP: send one by one
    for (const email of emails) {
      const fromAddress = email.from ?? config.fromAddress;
      const toArray = Array.isArray(email.to) ? email.to : [email.to];
      await sendViaSmtp(config, {
        from: fromAddress,
        to: toArray,
        subject: email.subject,
        react: email.template,
      });
    }
    return;
  }

  // Resend: use batch API
  if (!config.resendApiKey) {
    throw new Error("Resend API key is not configured");
  }
  const resend = new Resend(config.resendApiKey);
  const batch = emails.map((email) => ({
    from: email.from ?? config.fromAddress,
    to: Array.isArray(email.to) ? email.to : [email.to],
    subject: email.subject,
    react: email.template,
  }));

  const { error } = await resend.batch.send(batch);
  if (error) {
    console.error("[Email] Bulk send failed:", error);
    throw new Error(`Failed to send bulk email: ${error.message}`);
  }
}
