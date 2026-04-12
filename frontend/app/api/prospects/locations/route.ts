import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'

// GET /api/prospects/locations — ciudades/provincias únicas extraídas del campo direccion
// Extrae la última parte separada por coma (ej. "Calle X, 28040 Madrid, Madrid" → "Madrid")
export async function GET() {
  if (!sql) return NextResponse.json({ error: 'DB no configurada' }, { status: 503 })

  try {
    const rows = await sql`
      SELECT DISTINCT
        TRIM(REGEXP_REPLACE(direccion, '^.*,\s*', '')) AS location
      FROM prospects
      WHERE direccion IS NOT NULL
        AND LENGTH(TRIM(direccion)) > 0
        AND direccion LIKE '%,%'
      ORDER BY location
    `
    const locations = rows
      .map((r: any) => r.location)
      .filter((l: string) => l && l.length > 1 && l.length < 60)
    return NextResponse.json({ locations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
