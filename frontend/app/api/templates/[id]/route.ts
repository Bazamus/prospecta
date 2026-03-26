import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface RouteParams {
  params: { id: string }
}

// GET /api/templates/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const templates = await sql`SELECT * FROM templates WHERE id = ${params.id}`
    if (templates.length === 0) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    return NextResponse.json({ template: templates[0] })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ error: "Error al obtener plantilla" }, { status: 500 })
  }
}

// PATCH /api/templates/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { nombre, nicho, producto, tono, instrucciones_sistema, asunto_base, cuerpo_base } = body

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); values.push(nombre) }
    if (nicho !== undefined) { sets.push(`nicho = $${idx++}`); values.push(nicho) }
    if (producto !== undefined) { sets.push(`producto = $${idx++}`); values.push(producto) }
    if (tono !== undefined) { sets.push(`tono = $${idx++}`); values.push(tono) }
    if (instrucciones_sistema !== undefined) { sets.push(`instrucciones_sistema = $${idx++}`); values.push(instrucciones_sistema) }
    if (asunto_base !== undefined) { sets.push(`asunto_base = $${idx++}`); values.push(asunto_base || null) }
    if (cuerpo_base !== undefined) { sets.push(`cuerpo_base = $${idx++}`); values.push(cuerpo_base || null) }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron campos" }, { status: 400 })
    }

    values.push(params.id)
    const result = await sql(
      `UPDATE templates SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ template: result[0] })
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 })
  }
}

// DELETE /api/templates/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const result = await sql`DELETE FROM templates WHERE id = ${params.id} RETURNING id`
    if (result.length === 0) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 })
  }
}
