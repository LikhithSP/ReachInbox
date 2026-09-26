import nodemailer from 'nodemailer';

export class SmtpService {
  private static transporter: nodemailer.Transporter | null = null;
  private static testAccount: nodemailer.TestAccount | null = null;

  public static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    } else {
      // Create test account on Ethereal automatically if no credentials are provided in env
      console.log('[SMTP] Generating Ethereal test credentials for sandbox demonstration...');
      this.testAccount = await nodemailer.createTestAccount();
      console.log(`[SMTP] Ethereal Account created: ${this.testAccount.user}`);

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });
    }

    return this.transporter;
  }

  public static async sendMail(options: {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: options.from || process.env.SMTP_FROM || 'ReachInbox Scheduler <scheduler@reachinbox.ai>',
      to: options.to,
      subject: options.subject,
      text: options.text || options.html,
      html: options.html || options.text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[SMTP] Email sent to ${options.to}. Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}
