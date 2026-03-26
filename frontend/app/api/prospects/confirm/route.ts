import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import type { ScoredImportRow } from "@/types"

// POST /api/prospects/confirm
// Recibe un array de prospectos aprobados (ya con scoring) e inserta en Neon.
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL no configurada. Configura la conexión a Neon en .env.local" },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const rows: ScoredImportRow[] = body.rows

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron prospectos para importar" },
        { status: 400 }
      )
    }

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        await sql`
          INSERT INTO prospects (
            nombre_empresa, nicho, direccion, email, telefono, web,
            valoracion_google, num_resenas,
            score_ia, score_etiqueta, score_justificacion,
            estado
          ) VALUES (
            ${row.nombre_empresa},
            ${row.nicho},
            ${row.direccion || null},
            ${row.email || null},
            ${row.telefono || null},
            ${row.web || null},
            ${row.valoracion_google},
            ${row.num_resenas},
            ${row.score_ia},
            ${row.score_etiqueta},
            ${row.score_justificacion},
            'sin_contactar'
          )
          ON CONFLICT (email) DO NOTHING
        `
        inserted++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        // Duplicados por constraint unique se registran como skip
        if (msg.includes("duplicate") || msg.includes("unique")) {
          skipped++
        } else {
          errors.push(`${row.nombre_empresa}: ${msg}`)
        }
      }
    }

    // Registrar actividad de scoring para cada prospecto insertado
    if (inserted > 0) {
      try {
        await sql`
          INSERT INTO activity_log (prospect_id, tipo, descripcion)
          SELECT id, 'scoring',
            'Scoring IA completado: ' || score_ia || '/10 (' || score_etiqueta || ')'
          FROM prospects
          WHERE created_at >= NOW() - INTERVAL '1 minute'
            AND score_ia IS NOT NULL
        `
      } catch (e) {
        console.warn("No se pudo registrar actividad:", e)
      }
    }

    return NextResponse.json({
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `${inserted} prospectos importados${skipped > 0 ? `, ${skipped} duplicados omitidos` : ""}`,
    })
  } catch (error) {
    console.error("Error insertando prospectos:", error)
    return NextResponse.json(
      { error: "Error insertando prospectos en la base de datos" },
      { status: 500 }
    )
  }
}
