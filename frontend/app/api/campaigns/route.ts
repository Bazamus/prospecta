import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

// GET /api/campaigns — lista con conteo de prospectos via campaign_prospects
export async function GET() {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const campaigns = await sql`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM campaign_prospects cp WHERE cp.campaign_id = c.id) as prospects_count,
        t.nombre as template_nombre
      FROM campaigns c
      LEFT JOIN templates t ON t.id = c.template_id
      ORDER BY c.created_at DESC
    `
    return NextResponse.json({ data: campaigns })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/campaigns — crear campaña
export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const { nombre, nicho, canal, template_id, score_minimo, fecha_inicio, fecha_fin } = await request.json()
    if (!nombre || !nicho || !canal) return NextResponse.json({ error: "Nombre, nicho y canal obligatorios" }, { status: 400 })
    const result = await sql`
      INSERT INTO campaigns (nombre, nicho, canal, template_id, score_minimo, fecha_inicio, fecha_fin, estado)
      VALUES (${nombre}, ${nicho}, ${canal}, ${template_id || null}, ${score_minimo || 5.0}, ${fecha_inicio || null}, ${fecha_fin || null}, 'borrador')
      RETURNING *
    `
    return NextResponse.json({ campaign: result[0] }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
