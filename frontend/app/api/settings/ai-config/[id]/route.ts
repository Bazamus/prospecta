import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string } }

// PATCH /api/settings/ai-config/[id] — actualizar config
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const body = await request.json()
    const { provider, model, api_key, api_url } = body

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (provider !== undefined) { sets.push(`provider = $${idx++}`); values.push(provider) }
    if (model !== undefined) { sets.push(`model = $${idx++}`); values.push(model) }
    if (api_key !== undefined) { sets.push(`api_key = $${idx++}`); values.push(api_key) }
    if (api_url !== undefined) { sets.push(`api_url = $${idx++}`); values.push(api_url || null) }

    if (sets.length === 0) return NextResponse.json({ error: "Sin campos" }, { status: 400 })

    values.push(params.id)
    const result = await sql(
      `UPDATE ai_config SET ${sets.join(", ")} WHERE id = $${idx} RETURNING id, provider, model, estado, api_url, created_at`,
      values
    )

    if (result.length === 0) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 })
    return NextResponse.json({ config: result[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/settings/ai-config/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const result = await sql`DELETE FROM ai_config WHERE id = ${params.id} RETURNING id, estado`
    if (result.length === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    const wasPrincipal = result[0].estado === "principal"
    return NextResponse.json({ deleted: true, was_principal: wasPrincipal })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
