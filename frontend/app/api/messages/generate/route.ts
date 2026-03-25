import { NextRequest, NextResponse } from "next/server"

// POST /api/messages/generate
// Genera un mensaje personalizado con Claude API basado en el perfil del prospecto
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Recibir: prospect_id, campaign_id, instrucciones adicionales (opcional)
  // 2. Cargar datos del prospecto y plantilla de la campaña desde BD
  // 3. Construir prompt con nicho, contacto, scoring y tono del template
  // 4. Llamar a Claude API via lib/claude.ts
  // 5. Devolver { asunto, contenido }

  return NextResponse.json({ message: "Not implemented" }, { status: 501 })
}
