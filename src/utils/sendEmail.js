import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"MR Mustafa" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  if (info.accepted.length > 0) return true;
  return false;
}
