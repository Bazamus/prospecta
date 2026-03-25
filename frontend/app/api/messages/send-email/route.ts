import { NextRequest, NextResponse } from "next/server"

// POST /api/messages/send-email
// Envía un email individual vía Resend y registra el mensaje en BD
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Recibir: prospect_id, campaign_id, asunto, contenido
  // 2. Enviar email vía lib/resend.ts
  // 3. Insertar registro en tabla messages con estado_envio = 'enviado'
  // 4. Registrar en activity_log (tipo: 'email')

  return NextResponse.json({ message: "Not implemented" }, { status: 501 })
}
