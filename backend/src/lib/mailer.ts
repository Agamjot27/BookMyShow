import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Single shared transporter — nodemailer reuses the SMTP connection pool.
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass, // Gmail App Password (not your account password)
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"BookMyShow" <${env.smtpUser}>`,
    to,
    subject: `${otp} is your BookMyShow OTP`,
    text: `Your one-time password is: ${otp}\n\nIt expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #eee;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Your BookMyShow OTP</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#555;">Use the code below to sign in. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#d92e55;text-align:center;padding:20px 0;">${otp}</div>
        <p style="margin:24px 0 0;font-size:12px;color:#999;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
