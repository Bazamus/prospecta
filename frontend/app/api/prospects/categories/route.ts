import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'

// GET /api/prospects/categories — valores únicos de main_category
export async function GET() {
  if (!sql) return NextResponse.json({ error: 'DB no configurada' }, { status: 503 })

  try {
    const rows = await sql`
      SELECT DISTINCT main_category
      FROM prospects
      WHERE main_category IS NOT NULL
        AND TRIM(main_category) != ''
      ORDER BY main_category
    `
    const categories = rows.map((r: any) => r.main_category).filter(Boolean)
    return NextResponse.json({ categories })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
