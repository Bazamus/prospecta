import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

// GET /api/settings/nichos
export async function GET() {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const rows = await sql`
      SELECT n.*, COUNT(p.id)::int as prospects_count
      FROM nichos n
      LEFT JOIN prospects p ON p.nicho = n.slug
      GROUP BY n.id
      ORDER BY n.created_at ASC
    `
    return NextResponse.json({ data: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/settings/nichos
export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const { nombre, slug, color } = await request.json()
    if (!nombre || !slug) return NextResponse.json({ error: "Nombre y slug obligatorios" }, { status: 400 })

    const rows = await sql`
      INSERT INTO nichos (nombre, slug, color) VALUES (${nombre}, ${slug}, ${color || '#6B7280'})
      RETURNING *
    `
    return NextResponse.json({ nicho: rows[0] }, { status: 201 })
  } catch (e) {
    const msg = String(e)
    if (msg.includes("unique")) return NextResponse.json({ error: "Ya existe un nicho con ese nombre o slug" }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
