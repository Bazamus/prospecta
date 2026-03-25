import { NextRequest, NextResponse } from "next/server"

// POST /api/webhooks/resend
// Recibe eventos de Resend (delivered, opened, bounced) y actualiza estado en BD
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Validar la firma del webhook de Resend
  // 2. Leer el tipo de evento (email.delivered, email.opened, email.bounced)
  // 3. Actualizar estado_envio en tabla messages
  // 4. Registrar en activity_log si el prospecto abrió el email

  return NextResponse.json({ received: true })
}
