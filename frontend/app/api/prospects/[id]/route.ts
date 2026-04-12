import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface RouteParams {
  params: { id: string }
}

// GET /api/prospects/[id] — detalle con actividad y mensajes
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const prospects = await sql`SELECT * FROM prospects WHERE id = ${params.id}`
    if (prospects.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const messages = await sql`SELECT * FROM messages WHERE prospect_id = ${params.id} ORDER BY created_at DESC`
    const activity = await sql`SELECT * FROM activity_log WHERE prospect_id = ${params.id} ORDER BY created_at DESC LIMIT 50`

    return NextResponse.json({ prospect: prospects[0], messages, activity })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener prospecto" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id] — actualiza cualquier campo del prospecto
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const body = await request.json()

    const allowedFields = [
      "nombre_empresa", "nicho", "email", "telefono", "direccion",
      "contacto_nombre", "contacto_cargo", "web", "valoracion_google", "num_resenas",
      "score_ia", "score_etiqueta", "score_justificacion",
      "estado", "notas", "campaign_id",
      "horario", "categoria_google", "ficha_reclamada", "url_maps", "imagen_url", "resenas_texto",
      "sales_summary", "sales_relevance", "size_indicators",
    ]

    const validEstados = [
      "sin_contactar", "contactado", "respondio",
      "interesado", "demo_enviada", "cerrado", "descartado",
    ]

    if (body.estado && !validEstados.includes(body.estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        let val = body[field] === "" ? null : body[field]
        // Auto-derive score_etiqueta if being cleared while score_ia is being set to a number
        if (field === "score_etiqueta" && val === null && body.score_ia != null && body.score_ia !== "") {
          const s = Number(body.score_ia)
          if (!isNaN(s)) val = s >= 8 ? "Alta" : s >= 5 ? "Media" : s >= 3 ? "Baja" : "Descartar"
        }
        sets.push(`${field} = $${idx++}`)
        values.push(val)
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 })
    }

    values.push(params.id)
    const result = await sql(
      `UPDATE prospects SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Log de actividad según tipo de cambio
    const prospect = result[0]
    if (body.estado) {
      await sql`INSERT INTO activity_log (prospect_id, tipo, descripcion) VALUES (${params.id}, 'estado', ${`Estado cambiado a "${body.estado}" para ${prospect.nombre_empresa}`})`
    }
    if (body.notas !== undefined) {
      await sql`INSERT INTO activity_log (prospect_id, tipo, descripcion) VALUES (${params.id}, 'nota', ${`Notas actualizadas para ${prospect.nombre_empresa}`})`
    }

    return NextResponse.json({ prospect: result[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/prospects/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const result = await sql`DELETE FROM prospects WHERE id = ${params.id} RETURNING id`
    if (result.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
