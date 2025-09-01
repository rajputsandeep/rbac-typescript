import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || "no-reply@example.com";

let transporter: Transporter | { sendMail: (opts: SendMailOptions) => Promise<any> };

if (host && user && pass) {
  // ✅ Production transport
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
} else {
  // 🟡 Dev fallback: log-only transport
  transporter = {
    async sendMail(opts: SendMailOptions) {
      console.log("🟡 [DEV MAIL]");
      console.log("To:", opts.to);
      console.log("Subject:", opts.subject);
      console.log("Text:", opts.text);
      return { messageId: "dev-" + Date.now() };
    },
  };
}

/**
 * Send 2FA verification code
 */
export async function send2FACode({ to, code }: { to: string; code: string }) {
  const subject = "Your login verification code";
  const text = `Your verification code is: ${code}\nIt will expire in 10 minutes.`;

  return transporter.sendMail({ from, to, subject, text });
}
