import { Resend } from "resend"

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("RESEND_API_KEY no configurada — el envío de emails fallará")
    return null
  }
  return new Resend(key)
}

export const resend = getResendClient()

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? ""
