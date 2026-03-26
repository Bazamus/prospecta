import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface RouteParams {
  params: { id: string }
}

// GET /api/campaigns/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const campaigns = await sql`
      SELECT c.*, t.nombre as template_nombre
      FROM campaigns c
      LEFT JOIN templates t ON t.id = c.template_id
      WHERE c.id = ${params.id}
    `
    if (campaigns.length === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    const prospects = await sql`
      SELECT id, nombre_empresa, score_ia, score_etiqueta, estado, email
      FROM prospects
      WHERE campaign_id = ${params.id}
      ORDER BY score_ia DESC NULLS LAST
    `

    return NextResponse.json({ campaign: campaigns[0], prospects })
  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json({ error: "Error al obtener campaña" }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { nombre, nicho, canal, template_id, score_minimo, estado, fecha_inicio, fecha_fin } = body

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); values.push(nombre) }
    if (nicho !== undefined) { sets.push(`nicho = $${idx++}`); values.push(nicho) }
    if (canal !== undefined) { sets.push(`canal = $${idx++}`); values.push(canal) }
    if (template_id !== undefined) { sets.push(`template_id = $${idx++}`); values.push(template_id || null) }
    if (score_minimo !== undefined) { sets.push(`score_minimo = $${idx++}`); values.push(score_minimo) }
    if (estado !== undefined) { sets.push(`estado = $${idx++}`); values.push(estado) }
    if (fecha_inicio !== undefined) { sets.push(`fecha_inicio = $${idx++}`); values.push(fecha_inicio || null) }
    if (fecha_fin !== undefined) { sets.push(`fecha_fin = $${idx++}`); values.push(fecha_fin || null) }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron campos" }, { status: 400 })
    }

    values.push(params.id)
    const result = await sql(
      `UPDATE campaigns SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ campaign: result[0] })
  } catch (error) {
    console.error("Error updating campaign:", error)
    return NextResponse.json({ error: "Error al actualizar campaña" }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    // Desasignar prospectos antes de borrar
    await sql`UPDATE prospects SET campaign_id = NULL WHERE campaign_id = ${params.id}`
    const result = await sql`DELETE FROM campaigns WHERE id = ${params.id} RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json({ error: "Error al eliminar campaña" }, { status: 500 })
  }
}
