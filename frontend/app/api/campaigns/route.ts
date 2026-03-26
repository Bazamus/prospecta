import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

// GET /api/campaigns — lista de campañas con conteo de prospectos
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const campaigns = await sql`
      SELECT c.*,
        COUNT(p.id)::int as prospects_count,
        t.nombre as template_nombre
      FROM campaigns c
      LEFT JOIN prospects p ON p.campaign_id = c.id
      LEFT JOIN templates t ON t.id = c.template_id
      GROUP BY c.id, t.nombre
      ORDER BY c.created_at DESC
    `
    return NextResponse.json({ data: campaigns })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json({ error: "Error al obtener campañas" }, { status: 500 })
  }
}

// POST /api/campaigns — crear campaña
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { nombre, nicho, canal, template_id, score_minimo, fecha_inicio, fecha_fin } = body

    if (!nombre || !nicho || !canal) {
      return NextResponse.json({ error: "Nombre, nicho y canal son obligatorios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO campaigns (nombre, nicho, canal, template_id, score_minimo, fecha_inicio, fecha_fin, estado)
      VALUES (${nombre}, ${nicho}, ${canal}, ${template_id || null}, ${score_minimo || 5.0}, ${fecha_inicio || null}, ${fecha_fin || null}, 'borrador')
      RETURNING *
    `

    return NextResponse.json({ campaign: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating campaign:", error)
    return NextResponse.json({ error: "Error al crear campaña" }, { status: 500 })
  }
}
