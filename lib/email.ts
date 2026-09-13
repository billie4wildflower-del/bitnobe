import nodemailer from "nodemailer"

function getMailTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 465)
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  if (!host || !user || !password) throw new Error("SMTP verification mailbox is not configured")

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass: password },
  })
}

export async function sendVerificationEmail(input: { email: string; name: string; url: string }) {
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER
  if (!from) throw new Error("EMAIL_FROM is not configured")
  const transport = getMailTransport()
  const safeName = input.name.trim() || "there"
  await transport.sendMail({
    from,
    to: input.email,
    subject: "Verify your BitNobe email",
    text: `Hi ${safeName},\n\nVerify your BitNobe email address by opening this link:\n${input.url}\n\nIf you did not create a BitNobe account, you can ignore this message.`,
    html: `<p>Hi ${safeName},</p><p>Verify your BitNobe email address to finish creating your account.</p><p><a href="${input.url}">Verify my email</a></p><p>If you did not create a BitNobe account, you can ignore this message.</p>`,
  })
}
