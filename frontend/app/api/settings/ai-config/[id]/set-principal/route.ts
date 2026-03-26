import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string } }

// PATCH /api/settings/ai-config/[id]/set-principal — marca como principal en transacción
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    // Desactivar el principal anterior y activar el nuevo en una sola operación
    await sql`UPDATE ai_config SET estado = 'guardada' WHERE estado = 'principal'`
    const result = await sql`
      UPDATE ai_config SET estado = 'principal' WHERE id = ${params.id}
      RETURNING id, provider, model, estado, api_url, created_at
    `

    if (result.length === 0) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 })
    return NextResponse.json({ config: result[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
