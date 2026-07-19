import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * SMTP mailer configured entirely from env. If SMTP isn't configured the service
 * degrades gracefully: emails are logged (with their content) instead of sent, so
 * flows like password reset still work in dev / before SMTP is wired up.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS,
 *      MAIL_FROM (e.g. "TamoQuite <no-reply@tamoquite.app>").
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const secure = String(config.get<string>('SMTP_SECURE') || '').toLowerCase() === 'true';
    this.from = config.get<string>('MAIL_FROM') || 'TamoQuite <no-reply@tamoquite.app>';

    this.enabled = !!host;
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
        })
      : null;

    if (!this.enabled) {
      this.logger.warn('SMTP not configured (SMTP_HOST missing) — emails will be logged, not sent.');
    }
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL:disabled] to=${to} subject="${subject}"\n${text || html}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html, text });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err?.message}`);
      throw err;
    }
  }
}
