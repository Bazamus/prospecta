import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface RouteParams {
  params: { id: string }
}

// GET /api/prospects/[id] — detalle con actividad y mensajes
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const prospects = await sql`
      SELECT * FROM prospects WHERE id = ${params.id}
    `
    if (prospects.length === 0) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    }

    const messages = await sql`
      SELECT * FROM messages
      WHERE prospect_id = ${params.id}
      ORDER BY created_at DESC
    `

    const activity = await sql`
      SELECT * FROM activity_log
      WHERE prospect_id = ${params.id}
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({
      prospect: prospects[0],
      messages,
      activity,
    })
  } catch (error) {
    console.error("Error fetching prospect detail:", error)
    return NextResponse.json({ error: "Error al obtener prospecto" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id] — actualiza estado y/o notas
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { estado, notas } = body

    const validEstados = [
      "sin_contactar", "contactado", "respondio",
      "interesado", "demo_enviada", "cerrado", "descartado",
    ]

    // Build SET clauses dynamically
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (estado !== undefined) {
      if (!validEstados.includes(estado)) {
        return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
      }
      sets.push(`estado = $${idx++}`)
      values.push(estado)
    }

    if (notas !== undefined) {
      sets.push(`notas = $${idx++}`)
      values.push(notas)
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron campos para actualizar" }, { status: 400 })
    }

    values.push(params.id)
    const result = await sql(
      `UPDATE prospects SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    }

    // Log activity if estado changed
    if (estado) {
      const prospect = result[0]
      await sql`
        INSERT INTO activity_log (prospect_id, tipo, descripcion)
        VALUES (${params.id}, 'estado', ${`Estado cambiado a "${estado}" para ${prospect.nombre_empresa}`})
      `
    }

    if (notas !== undefined) {
      const prospect = result[0]
      await sql`
        INSERT INTO activity_log (prospect_id, tipo, descripcion)
        VALUES (${params.id}, 'nota', ${`Notas actualizadas para ${prospect.nombre_empresa}`})
      `
    }

    return NextResponse.json({ prospect: result[0] })
  } catch (error) {
    console.error("Error updating prospect:", error)
    return NextResponse.json({ error: "Error al actualizar prospecto" }, { status: 500 })
  }
}
