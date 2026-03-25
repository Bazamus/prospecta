import { NextRequest, NextResponse } from "next/server"

// POST /api/messages/send-whatsapp
// Envía un mensaje de WhatsApp individual vía Evolution API y registra en BD
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Recibir: prospect_id, campaign_id, contenido
  // 2. Enviar mensaje vía lib/evolution.ts
  // 3. Insertar registro en tabla messages (canal: 'whatsapp')
  // 4. Registrar en activity_log (tipo: 'whatsapp')

  return NextResponse.json({ message: "Not implemented" }, { status: 501 })
}
