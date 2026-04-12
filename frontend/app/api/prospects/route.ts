import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

// POST /api/prospects — crear prospecto manual
export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const body = await request.json()
    const {
      nombre_empresa, nicho, email, telefono, direccion, contacto_nombre,
      contacto_cargo, web, valoracion_google, num_resenas, notas,
      score_ia, score_etiqueta, score_justificacion,
      horario, categoria_google, url_maps, imagen_url, resenas_texto,
    } = body

    if (!nombre_empresa || !nicho) {
      return NextResponse.json({ error: "Nombre y nicho son obligatorios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO prospects (
        nombre_empresa, nicho, email, telefono, direccion,
        contacto_nombre, contacto_cargo, web, valoracion_google, num_resenas,
        notas, score_ia, score_etiqueta, score_justificacion,
        horario, categoria_google, url_maps, imagen_url, resenas_texto, estado
      ) VALUES (
        ${nombre_empresa}, ${nicho}, ${email || null}, ${telefono || null}, ${direccion || null},
        ${contacto_nombre || null}, ${contacto_cargo || null}, ${web || null},
        ${valoracion_google || null}, ${num_resenas || null},
        ${notas || null}, ${score_ia || null}, ${score_etiqueta || null}, ${score_justificacion || null},
        ${horario || null}, ${categoria_google || null}, ${url_maps || null}, ${imagen_url || null}, ${resenas_texto || null},
        'sin_contactar'
      ) RETURNING *
    `
    return NextResponse.json({ prospect: result[0] }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/prospects — borrado masivo por IDs
export async function DELETE(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    const body = await request.json()
    const ids: string[] = body.ids
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de IDs" }, { status: 400 })
    }

    // Borrar en cascada: messages y activity_log tienen ON DELETE CASCADE
    const result = await sql(`DELETE FROM prospects WHERE id = ANY($1) RETURNING id`, [ids])
    return NextResponse.json({ deleted: result.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET /api/prospects — lista paginada con filtros
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")))
  const offset = (page - 1) * limit

  const nicho = searchParams.get("nicho")
  const estado = searchParams.get("estado")
  const scoreMin = searchParams.get("score_min")
  const search = searchParams.get("search")
  const productoObjetivo = searchParams.get("producto_objetivo")
  const spendingOnAds = searchParams.get("spending_on_ads")
  const worthPursuing = searchParams.get("worth_pursuing")
  const hasEmail = searchParams.get("has_email")
  const hasPhone = searchParams.get("has_phone")
  const hasLinkedin = searchParams.get("has_linkedin")
  const location = searchParams.get("location")
  const mainCategory = searchParams.get("main_category")
  const sortBy = searchParams.get("sort") || "score_ia"
  const sortDir = searchParams.get("dir") === "asc" ? "ASC" : "DESC"

  try {
    // Build WHERE clauses
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (nicho) {
      conditions.push(`nicho = $${paramIdx++}`)
      params.push(nicho)
    }
    if (estado) {
      conditions.push(`estado = $${paramIdx++}`)
      params.push(estado)
    }
    if (scoreMin) {
      conditions.push(`score_ia >= $${paramIdx++}`)
      params.push(parseFloat(scoreMin))
    }
    if (productoObjetivo) {
      conditions.push(`producto_objetivo = $${paramIdx++}`)
      params.push(productoObjetivo)
    }
    if (spendingOnAds === "true") {
      conditions.push(`is_spending_on_ads = true`)
    }
    if (worthPursuing === "true") {
      conditions.push(`is_worth_pursuing = true`)
    }
    if (hasEmail === "true") {
      conditions.push(`email IS NOT NULL AND TRIM(email) != ''`)
    }
    if (hasPhone === "true") {
      conditions.push(`telefono IS NOT NULL AND TRIM(telefono) != ''`)
    }
    if (hasLinkedin === "true") {
      conditions.push(`linkedin IS NOT NULL AND TRIM(linkedin) != ''`)
    }
    if (location) {
      conditions.push(`TRIM(REGEXP_REPLACE(direccion, '^.*,\\s*', '')) = $${paramIdx++}`)
      params.push(location)
    }
    if (mainCategory) {
      conditions.push(`main_category = $${paramIdx++}`)
      params.push(mainCategory)
    }
    if (search) {
      conditions.push(`(nombre_empresa ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR contacto_nombre ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
      paramIdx++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Validate sort column
    const validSorts = ["score_ia", "nombre_empresa", "created_at", "updated_at", "estado"]
    const safeSort = validSorts.includes(sortBy) ? sortBy : "score_ia"

    // Count total
    const countResult = await sql(`SELECT COUNT(*) as total FROM prospects ${whereClause}`, params)
    const total = parseInt(countResult[0].total as string)

    // Fetch rows
    const rows = await sql(
      `SELECT p.*,
        (SELECT m.canal FROM messages m WHERE m.prospect_id = p.id ORDER BY m.created_at DESC LIMIT 1) as ultimo_canal,
        (SELECT m.fecha_envio FROM messages m WHERE m.prospect_id = p.id ORDER BY m.created_at DESC LIMIT 1) as ultimo_contacto
      FROM prospects p
      ${whereClause}
      ORDER BY ${safeSort} ${sortDir} NULLS LAST
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return NextResponse.json({ error: "Error al obtener prospectos" }, { status: 500 })
  }
}
