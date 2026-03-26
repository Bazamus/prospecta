import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string } }

// GET /api/campaigns/[id] — detalle con stats y prospectos
export async function GET(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const campaigns = await sql`
      SELECT c.*, t.nombre as template_nombre, t.instrucciones_sistema as template_instrucciones
      FROM campaigns c LEFT JOIN templates t ON t.id = c.template_id
      WHERE c.id = ${params.id}
    `
    if (campaigns.length === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    const prospects = await sql`
      SELECT p.id, p.nombre_empresa, p.nicho, p.score_ia, p.score_etiqueta, p.estado, p.email, p.telefono,
        p.contacto_nombre,
        (SELECT m.fecha_envio FROM messages m WHERE m.prospect_id = p.id ORDER BY m.created_at DESC LIMIT 1) as ultimo_contacto,
        (SELECT m.canal FROM messages m WHERE m.prospect_id = p.id ORDER BY m.created_at DESC LIMIT 1) as ultimo_canal
      FROM prospects p
      INNER JOIN campaign_prospects cp ON cp.prospect_id = p.id
      WHERE cp.campaign_id = ${params.id}
      ORDER BY p.score_ia DESC NULLS LAST
    `

    // Stats
    const total = prospects.length
    const contactados = prospects.filter((p: any) => p.estado !== "sin_contactar" && p.estado !== "descartado").length
    const respondieron = prospects.filter((p: any) => ["respondio", "interesado", "demo_enviada", "cerrado"].includes(p.estado)).length
    const interesados = prospects.filter((p: any) => ["interesado", "demo_enviada", "cerrado"].includes(p.estado)).length
    const sinContactar = prospects.filter((p: any) => p.estado === "sin_contactar").length

    return NextResponse.json({
      campaign: campaigns[0],
      prospects,
      stats: { total, contactados, respondieron, interesados, sin_contactar: sinContactar,
        tasa_respuesta: contactados > 0 ? Math.round((respondieron / contactados) * 100) : 0 },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const body = await request.json()
    const fields = ["nombre", "nicho", "canal", "template_id", "score_minimo", "estado", "fecha_inicio", "fecha_fin"]
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(body[f] === "" ? null : body[f]) }
    }
    if (sets.length === 0) return NextResponse.json({ error: "Sin campos" }, { status: 400 })
    vals.push(params.id)
    const result = await sql(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals)
    if (result.length === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    return NextResponse.json({ campaign: result[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    // campaign_prospects se borra en cascada
    const result = await sql`DELETE FROM campaigns WHERE id = ${params.id} RETURNING id`
    if (result.length === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
