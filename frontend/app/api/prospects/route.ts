import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

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
