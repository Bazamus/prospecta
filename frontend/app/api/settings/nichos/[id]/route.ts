import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string } }

// PATCH /api/settings/nichos/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const body = await request.json()
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (body.nombre !== undefined) { sets.push(`nombre = $${i++}`); vals.push(body.nombre) }
    if (body.slug !== undefined) { sets.push(`slug = $${i++}`); vals.push(body.slug) }
    if (body.color !== undefined) { sets.push(`color = $${i++}`); vals.push(body.color) }
    if (body.activo !== undefined) { sets.push(`activo = $${i++}`); vals.push(body.activo) }
    if (sets.length === 0) return NextResponse.json({ error: "Sin campos" }, { status: 400 })

    vals.push(params.id)
    const result = await sql(`UPDATE nichos SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals)
    if (result.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ nicho: result[0] })
  } catch (e) {
    const msg = String(e)
    if (msg.includes("unique")) return NextResponse.json({ error: "Ya existe un nicho con ese nombre o slug" }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/settings/nichos/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    // Check for assigned prospects
    const nicho = await sql`SELECT slug FROM nichos WHERE id = ${params.id}`
    if (nicho.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const count = await sql`SELECT COUNT(*)::int as c FROM prospects WHERE nicho = ${nicho[0].slug}`
    if (parseInt(String(count[0].c)) > 0) {
      return NextResponse.json({ error: `No se puede eliminar: hay ${count[0].c} prospectos asignados a este nicho` }, { status: 409 })
    }

    await sql`DELETE FROM nichos WHERE id = ${params.id}`
    return NextResponse.json({ deleted: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
